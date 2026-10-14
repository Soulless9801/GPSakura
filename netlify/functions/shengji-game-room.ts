import dotenv from 'dotenv';

dotenv.config();

import Ably from 'ably';
import { Redis } from '@upstash/redis';

import { verify } from "./create-session";
import type { Identity } from "../../src/utils/verify";

import * as SJGame from '../../src/shengji/core/game.ts';
import type * as SJCore from '../../src/shengji/core/entities.ts';

import { errorJSON, successJSON } from './data/json.ts';
import { parseJsonField, toCards, toPlay, toTrump, toUsername } from './data/guards.ts';
import { serialize } from '../../src/utils/serial.ts';

function getAbly() {
    return new Ably.Rest({ 
        key: process.env.ABLY_API_KEY_SERVER
    });
}

interface PublishData {
    [key: string]: string | number | boolean | object | null;
}

interface PresenceItem {
    clientId: string;
    data?: {
        username?: string;
        team?: number;
    };
}

async function publish(channel: Ably.Channel, event: string, data: PublishData) {
    //TODO: do something with timestamp
    await channel.publish(event, { timestamp: Date.now(), ...data });
}

let redisClient: Redis | null = null;

function getRedis() {
    if (redisClient) {return redisClient;}
    redisClient = Redis.fromEnv();
    return redisClient;
}

async function rateLimit(redis: Redis, key: string, limit: number, windowSeconds: number) {
    const count = await redis.incr(key);
    if (count === 1) {
        await redis.expire(key, windowSeconds);
    }
    if (count > limit) {
        return false;
    }
    return true;
}

const GAME_KEY_PREFIX = "game:";

// The speed-draw shortcuts deal the whole hand at once, skipping the drawing and declaring
// phase. They exist to make testing quick and must never run in production: only `netlify dev`
// (which sets NETLIFY_DEV / CONTEXT=dev) enables them.
function speedDrawEnabled(): boolean {
    return process.env.NETLIFY_DEV === "true" || process.env.CONTEXT === "dev";
}

async function loadGame(redis: Redis, roomId: string) {
    //TODO: figure out why this isn't returning as string
    const res = await redis.get(GAME_KEY_PREFIX + roomId);
    if (res === null) {return null;}
    return typeof res === "string" ? res : JSON.stringify(res);
}

async function saveGame(redis: Redis, roomId: string, serGame: string) {
    // store as JSON string
    await redis.set(GAME_KEY_PREFIX + roomId, serGame);
}

const RATE_LIMIT_RULES: Record<string, [number, number]> = { // TODO: fine-tune these rules based on actual usage patterns
    default: [1, 1],
};

export default async function handler(request: Request): Promise<Response> {

    const redis = getRedis();

    const ably = getAbly();

    try {

        // get action data

        const body = JSON.parse((await request.text()) || '{}');

        const identity : Identity | null = body.identity || null;
        if (!identity) {return errorJSON("Missing identity", 400);}
        const clientId : string = String(identity.clientId || '').trim();
        const signature : string = String(identity.signature || '').trim();

        const roomId : string = String(body.roomId || '').trim();
        const action : string = String(body.action || '').trim();
        const payload : PublishData = typeof body.payload === "object" && body.payload !== null ? body.payload : {};

        if (!clientId) {return errorJSON("Invalid clientId");}
        if (!roomId) {return errorJSON("Invalid roomId");}

        const roomSpecific = new Set(["connection"]);

        const rule : [number, number] = RATE_LIMIT_RULES[action] || RATE_LIMIT_RULES.default;
        const [limit, windowSeconds] = rule;

        // authenticate first: the limiter is keyed by client id, so an unsigned request must not
        // be able to spend another player's allowance
        if (!signature || !verify(clientId, signature)) {return errorJSON("Invalid signature");}

        // rate limit check
        const key : string = `rl:${roomId}:${roomSpecific.has(action) ? "global" : clientId}:${action}`;
        const isAllowed : boolean = await rateLimit(redis, key, limit, windowSeconds);
        if (!isAllowed) {return errorJSON("Rate limit exceeded", 429);}

        // get room live object

        const channel: Ably.Channel = ably.channels.get(`room_${roomId}`);

        // helper function to get game state
        async function getGame() {
            const serGame: string | null = await loadGame(redis, roomId);
            if (!serGame) {return null;}
            return SJGame.Game.deserializeGame(serGame);
        }

        const allowedWhenPaused = new Set(["state", "hand", "username", "connection", "end"]);
        const currentGame = await getGame();
        if (currentGame instanceof SJGame.Game && currentGame.getState().paused && !allowedWhenPaused.has(action)) {return errorJSON("Game is paused", 423);}

        async function savePublish(game: SJGame.Game) {
            const serGame : string = game.serializeGame();
            await saveGame(redis, roomId, serGame);
            await publish(channel, "state_change", { game: serialize(game.getState()) });
        }

        if (action === "connection") {
            const game = await getGame();
            if (!(game instanceof SJGame.Game)) {return errorJSON("Game not found");}

            const presence = await channel.presence.get();
            const items: PresenceItem[] = presence.items as PresenceItem[];
            const players = game.getState().players;
            const missing = players.filter(player => !items.some(item => item.clientId === player));

            const paused = missing.length > 0;
            // A state broadcast makes clients recheck presence. Do not publish unchanged
            // state, or a disconnected player causes a request/broadcast feedback loop.
            if (game.getState().paused !== paused) {
                game.setPaused(paused);
                await savePublish(game);
            }

            return successJSON({});
        }

        if (action === "start") { // ACTION: START GAME
            
            const exist = await getGame();

            if ((exist instanceof SJGame.Game) && !exist.getState().over) {return errorJSON("Game already in progress");}
            // console.log("Initializing game...");

            const presence = await channel.presence.get();
            const items: PresenceItem[] = presence.items as PresenceItem[];
            const a = items.filter((p: { data?: { team?: number } }) => p.data?.team === 0);
            const b = items.filter((p: { data?: { team?: number } }) => p.data?.team === 1);

            if (a.length !== b.length) {return errorJSON("Teams must be balanced");}

            const players : string[] = [];
            const users : string[] = [];

            for (let i = 0; i < Math.max(a.length, b.length); i++) {
                if (i < a.length) {
                    players.push(a[i].clientId); 
                    users.push(toUsername(a[i].data?.username) ?? "unknown");
                }
                if (i < b.length) {
                    players.push(b[i].clientId); 
                    users.push(toUsername(b[i].data?.username) ?? "unknown");
                }
            }

            const game : SJGame.Game = SJGame.baseGame();
            if (!game.initializeGame(players, users)) {return errorJSON("Failed to initialize game");}

            await savePublish(game);

            return successJSON({});
        }

        if (action === "username") { // ACTION: UPDATE USERNAME

            if (!clientId) {return errorJSON("Missing clientId");}

            const username : string | null = toUsername(payload.username);
            if (!username) {return errorJSON("Missing username");}

            const game = currentGame;

            if (!(game instanceof SJGame.Game) || !game.changeUsername(clientId, username)) {return errorJSON("No game found");}

            // console.log(`Client ${clientId} changes username to ${username}`);

            await savePublish(game);

            return successJSON({});
        }

        if (action === "draw") { // ACTION: DRAW CARD

            if (!clientId) {return errorJSON("Missing clientId");}

            const game = currentGame;
            if (!(game instanceof SJGame.Game)) {return errorJSON("Game not found");}
            
            if (!game.drawCard(clientId)) {return errorJSON("Failed to draw card");}

            await savePublish(game);

            const hand : SJCore.Hand | null = game.getHand(clientId);
            return successJSON({ hand });
        }

        if (action === "speed_draw") { // DEVELOPMENT ONLY: SPEED DRAW (FOR TESTING)

            if (!speedDrawEnabled()) {return errorJSON("Speed draw is only available in development", 403);}

            const game = currentGame;
            if (!(game instanceof SJGame.Game)) {return errorJSON("Game not found");}
            if (!game.getState().players.includes(clientId)) {return errorJSON("Only players can speed draw", 403);}
            
            if (!game.speedDraw()) {return errorJSON("Failed to speed draw");}

            await savePublish(game);

            return successJSON({});
        }

        if (action === "state") {// ACTION: GET GAME STATE

            const game = currentGame;

            if (!(game instanceof SJGame.Game)) {return errorJSON("Game not found");}

            return successJSON({ game: game.getState() });
        }

        if (action === "hand") { // ACTION: GET HAND

            if (!clientId) {return errorJSON("Missing clientId");}

            const game = currentGame;
            if (!(game instanceof SJGame.Game)) {return errorJSON("Game not found");}

            const hand : SJCore.Hand | null = game.getHand(clientId);

            if (!hand) {return errorJSON("Failed to get hand");}

            return successJSON({ hand });
        }

        if (action === "trump") { // ACTION: CALL TRUMP
            
            if (!clientId) {return errorJSON("Missing clientId");}

            const game = currentGame;
            if (!(game instanceof SJGame.Game)) {return errorJSON("Game not found");}

            // console.log("Payload for trump call:", payload);
            const trump : SJCore.Trump | null = toTrump(parseJsonField(payload.trump));
            if (!trump || !game.callTrump(clientId, trump)) {return errorJSON("Invalid trump call");}

            await savePublish(game);

            return successJSON({});
        }

        if (action === "dipai") {

            if (!clientId) {return errorJSON("Missing clientId");}

            const game = currentGame;
            if (!(game instanceof SJGame.Game)) {return errorJSON("Game not found");}

            const res : SJCore.Card[] | null = game.getDipai(clientId);

            if (!res) {return errorJSON("Not the zhuang");}
            return successJSON({ dipai: res });
        }

        if (action === "exchange") {

            if (!clientId) {return errorJSON("Missing clientId");}

            const game = await getGame();
            if (!(game instanceof SJGame.Game)) {return errorJSON("Game not found");}

            const give : SJCore.Card[] | null = toCards(parseJsonField(payload.give));
            const receive : SJCore.Card[] | null = toCards(parseJsonField(payload.receive));
            if (!give || !receive) {return errorJSON("Failed to exchange Dipai");}

            // console.log(`Client ${clientId} wants to exchange dipai. Give: ${serialize(give)}, Receive: ${serialize(receive)}`);

            if (!game.exchangeDipai(clientId, give, receive)) {return errorJSON("Failed to exchange Dipai");}

            await savePublish(game);

            const hand : SJCore.Hand | null = game.getHand(clientId);
            return successJSON({ hand });
        }

        if (action === "play") { // ACTION: PLAY CARDS

            if (!clientId) {return errorJSON("Missing clientId");}

            const game = currentGame;
            if (!(game instanceof SJGame.Game)) {return errorJSON("Game not found");}

            const play : SJCore.Play | null = toPlay(parseJsonField(payload.play));
            if (!play || !game.tryPlay(clientId, play)) {return errorJSON("Invalid play");}

            await savePublish(game);

            const hand : SJCore.Hand | null = game.getHand(clientId);
            return successJSON({ hand });
        }

        if (action === "shuai") { // ACTION: GAMBLE

            if (!clientId) {return errorJSON("Missing clientId");}

            const game = currentGame;
            if (!(game instanceof SJGame.Game)) {return errorJSON("Game not found");}
            
            const play : SJCore.Play | null = toPlay(parseJsonField(payload.play));
            if (!play || !game.tryShuai(clientId, play)) {return errorJSON("Invalid shuai");}

            await savePublish(game);

            const hand : SJCore.Hand | null = game.getHand(clientId);
            return successJSON({ hand });
        }

        if (action === "end") { // ACTION: END GAME

            // return errorJSON("Ending game is disabled", 403);

            const game = await getGame();
            if (!(game instanceof SJGame.Game)) {return errorJSON("Game not found");}

            const players = game.getState().players;
            if (!players.includes(clientId)) {return errorJSON("Only players can end the game");}

            await redis.del(GAME_KEY_PREFIX + roomId);

            await publish(channel, "state_change", { game: null });

            return successJSON({ msg: "Game ended" });

        }

        if (action === "speed") { // DEVELOPMENT ONLY: SPEED DRAW (FOR TESTING)

            if (!speedDrawEnabled()) {return errorJSON("Speed draw is only available in development", 403);}

            if (!clientId) {return errorJSON("Missing clientId");}

            const game = currentGame;
            if (!(game instanceof SJGame.Game)) {return errorJSON("Game not found");}
            if (!game.getState().players.includes(clientId)) {return errorJSON("Only players can speed draw", 403);}

            if (!game.speedDraw()) {return errorJSON("Speed draw failed");}

            await savePublish(game);

            return successJSON({ msg: "Speed draw executed" });
        }

        return errorJSON(`shengji-game-room: Invalid action`, 400);

    } catch (error) {
        // catch and return any errors
        const message = error instanceof Error ? error.message : String(error);
        return errorJSON(`shengji-game-room: Internal server error ${message}`, 500);
    }
}
