import dotenv from 'dotenv';

dotenv.config();

import Ably from 'ably';
import { Redis } from '@upstash/redis';

import * as SJGame from '../../src/shengji/core/game.ts';

function errorJSON(message, code = 400) {
    return {
        statusCode: code,
        headers: {
            "Content-Type": "application/json",
        },
        body: SJGame.Game.serialize({ error: message }),
    };
}

function successJSON(payload = {ok: true}) {
    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
        },
        body: SJGame.Game.serialize(payload),
    };
}

function getAbly() {
    return new Ably.Rest({ 
        key: process.env.ABLY_API_KEY
    });
}

async function publish(channel, event, data) {
    await channel.publish(event, { timestamp: Date.now(), ...data });
}

let redisClient = null;

function getRedis() {
    if (redisClient) return redisClient;
    redisClient = Redis.fromEnv();
    return redisClient;
}

async function rateLimit(redis, key, limit, windowSeconds) {
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

async function loadGame(redis, roomId) {
    return await redis.get(GAME_KEY_PREFIX + roomId);
}

async function saveGame(redis, roomId, ser_game) {
    // store as JSON string
    await redis.set(GAME_KEY_PREFIX + roomId, ser_game);
}

const RATE_LIMIT_RULES = {
    default: [1, 1],
};

export async function handler(event) {

    const redis = getRedis();

    const ably = getAbly();

    try {

        // get action data

        const body = JSON.parse(event.body || '{}');
        const { roomId, action, clientId, payload } = body;

        console.log(`Received request: ${action} from client ${clientId} for room_${roomId}`);

        if (!roomId || !action) return errorJSON("Missing roomId or action");

        const rule = RATE_LIMIT_RULES[action] || RATE_LIMIT_RULES.default;
        const [limit, windowSeconds] = rule;

        // rate limit check
        const rlClientId = clientId || "unknown";
        const key = `rl:${roomId}:${rlClientId}:${action}`;
        const isAllowed = await rateLimit(redis, key, limit, windowSeconds);
        if (!isAllowed) return errorJSON("Rate limit exceeded", 429);

        // get room live object

        const channel = ably.channels.get(`room_${roomId}`);

        // helper function to get game state
        async function getGame() {
            const ser_game = await loadGame(redis, roomId);
            if (!ser_game) return null;
            return SJGame.Game.deserializeGame(SJGame.Game.serialize(ser_game));
        }

        if (action === "start") { // ACTION: START GAME
            
            const exist = await getGame();

            if (exist && !exist.getState().over) return errorJSON("Game already in progress");
            // console.log("Initializing game...");

            const presence = await channel.presence.get();
            const items = presence.items;
            const a = items.filter(p => p.data.team === 0);
            const b = items.filter(p => p.data.team === 1);

            if (a.length !== b.length) return errorJSON("Teams must be balanced");

            const players = [];
            const users = [];

            for (let i = 0; i < Math.max(a.length, b.length); i++) {
                if (i < a.length) {
                    players.push(a[i].clientId); 
                    users.push(a[i].data.username);
                }
                if (i < b.length) {
                    players.push(b[i].clientId); 
                    users.push(b[i].data.username);
                }
            }

            const game = new SJGame.Game({});
            if (!game.initializeGame(players, users)) return errorJSON("Failed to initialize game");

            const ser_game = game.serializeGame();
            await saveGame(redis, roomId, ser_game);
            await publish(channel, "state_change", { game: SJGame.Game.serialize(game.getState()) });

            return successJSON({});
        }

        if (action === "username") { // ACTION: UPDATE USERNAME

            if (!clientId) return errorJSON("Missing clientId");

            const username = payload && payload.username;
            if (!username) return errorJSON("Missing username");

            const game = await getGame();

            if (!game || !game.changeUsername(clientId, username)) return errorJSON("No game found");

            // console.log(`Client ${clientId} changes username to ${username}`);

            const ser_game = game.serializeGame();
            await saveGame(redis, roomId, ser_game);
            await publish(channel, "state_change", { game: SJGame.Game.serialize(game.getState()) });

            return successJSON({});
        }

        if (action === "draw") { // ACTION: DRAW CARD

            if (!clientId) return errorJSON("Missing clientId");

            const game = await getGame();
            if (!game) return errorJSON("Game not found");
            
            if (!game.drawCard(clientId)) return errorJSON("Failed to draw card");

            const ser_game = game.serializeGame();
            await saveGame(redis, roomId, ser_game);
            await publish(channel, "state_change", { game: SJGame.Game.serialize(game.getState()) });

            const hand = game.getHand(clientId);
            return successJSON({ hand: SJGame.Game.serialize(hand) });
        }

        if (action === "speed_draw") { // ADMIN ACTION: SPEED DRAW (FOR TESTING)

            // return errorJSON("Speed draw is disabled", 403);

            const game = await getGame();
            if (!game) return errorJSON("Game not found");
            
            if (!game.speedDraw()) return errorJSON("Failed to speed draw");

            const ser_game = game.serializeGame();
            await saveGame(redis, roomId, ser_game);
            await publish(channel, "state_change", { game: SJGame.Game.serialize(game.getState()) });

            return successJSON({});
        }

        if (action === "state") {// ACTION: GET GAME STATE

            const game = await getGame();

            if (!game) return errorJSON("Game not found");

            return successJSON({ game: SJGame.Game.serialize(game.getState()) });
        }

        if (action === "hand") { // ACTION: GET HAND

            if (!clientId) return errorJSON("Missing clientId");

            const game = await getGame();
            if (!game) return errorJSON("Game not found");

            const hand = game.getHand(clientId);

            if (!hand) return errorJSON("Failed to get hand");

            return successJSON({ hand: SJGame.Game.serialize(hand) });
        }

        if (action === "trump") { // ACTION: CALL TRUMP
            
            if (!clientId) return errorJSON("Missing clientId");

            const game = await getGame();
            if (!game) return errorJSON("Game not found");

            // console.log("Payload for trump call:", payload);
            const trump = JSON.parse(payload && payload.trump);
            // console.log("Received Trump:", trump);
            if (!game.callTrump(clientId, trump)) return errorJSON("Invalid trump call");

            const ser_game = game.serializeGame();
            await saveGame(redis, roomId, ser_game);
            await publish(channel, "state_change", { game: SJGame.Game.serialize(game.getState()) });

            return successJSON({});
        }

        if (action === "dipai") {

            if (!clientId) return errorJSON("Missing clientId");

            const game = await getGame();
            if (!game) return errorJSON("Game not found");

            const res = game.getDipai(clientId);

            if (!res) return errorJSON("Not the zhuang");
            return successJSON({ dipai: SJGame.Game.serialize(res) });
        }

        if (action === "exchange") {

            if (!clientId) return errorJSON("Missing clientId");

            const game = await getGame();
            if (!game) return errorJSON("Game not found");

            const give = JSON.parse(payload && payload.give);
            const receive = JSON.parse(payload && payload.receive);

            // console.log(`Client ${clientId} wants to exchange dipai. Give: ${SJGame.Game.serialize(give)}, Receive: ${SJGame.Game.serialize(receive)}`);

            if (!game.exchangeDipai(clientId, give, receive)) return errorJSON("Failed to exchange Dipai");

            const ser_game = game.serializeGame();
            await saveGame(redis, roomId, ser_game);
            await publish(channel, "state_change", { game: SJGame.Game.serialize(game.getState()) });

            const hand = game.getHand(clientId);
            return successJSON({ hand: SJGame.Game.serialize(hand) });
        }

        if (action === "play") { // ACTION: PLAY CARDS

            if (!clientId) return errorJSON("Missing clientId");

            const game = await getGame();
            if (!game) return errorJSON("Game not found");

            const play = JSON.parse(payload && payload.play);

            // console.log(`Client ${clientId} attempts to play: ${SJGame.Game.serialize(play)}`);

            if (!game.tryPlay(clientId, play)) return errorJSON("Invalid play");

            const ser_game = game.serializeGame();
            await saveGame(redis, roomId, ser_game);
            await publish(channel, "state_change", { game: SJGame.Game.serialize(game.getState()) });

            const hand = game.getHand(clientId);
            return successJSON({ hand: SJGame.Game.serialize(hand) });
        }

        if (action === "shuai") { // ACTION: GAMBLE

            if (!clientId) return errorJSON("Missing clientId");

            const game = await getGame();
            if (!game) return errorJSON("Game not found");
            
            const play = JSON.parse(payload && payload.play);

            if (!game.tryShuai(clientId, play)) return errorJSON("Invalid shuai");

            const ser_game = game.serializeGame();
            await saveGame(redis, roomId, ser_game);
            await publish(channel, "state_change", { game: SJGame.Game.serialize(game.getState()) });

            const hand = game.getHand(clientId);
            return successJSON({ hand: SJGame.Game.serialize(hand) });
        }

        if (action === "end") { // ACTION: END GAME

            // return errorJSON("Ending game is disabled", 403);

            await redis.del(GAME_KEY_PREFIX + roomId);

            await publish(channel, "state_change", { game: null });

            return successJSON({ msg: "Game ended" });
        } 

        return errorJSON("Invalid action");

    } catch (error) {
        // catch and return any errors
        return errorJSON(error.message, 500);
    }
}
