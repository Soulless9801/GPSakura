const Ably = require('ably');
const { Redis } = require('@upstash/redis');

import * as ShengJiGame from '/src/shengji/core/game';

function errorJSON(message, code = 400) {
    return {
        statusCode: code,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: message }),
    };
}

function successJSON(payload = {ok: true}) {
    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    };
}

function getAbly() {
    return new Ably.Rest({ 
        key: process.env.ABLY_API_KEY
    });
}

function publish(channel, event, data) {
    channel.publish(event, { timestamp: Date.now(), ...data });
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
    draw: [1, 1],
    play: [1, 1],
    trump: [1, 1],
    start: [1, 1],
    hand: [1, 1],
    state: [1, 1],
    default: [1, 1],
};

exports.handler = async function handler(event, context) {

    const redis = getRedis();

    const ably = getAbly();

    try {

        // get action data

        const body = JSON.parse(event.body || '{}');
        const { roomId, action, clientId, payload } = body;

        // console.log(`Received request: ${action} from client ${clientId} for room_${roomId}`);

        if (!roomId || !action) return errorJSON("Missing roomId or action");

        const rule = RATE_LIMIT_RULES[action] || RATE_LIMIT_RULES.default;
        const [limit, windowSeconds] = rule;

        // rate limit check
        const rlClientId = clientId || "unknown";
        const key = `rl:${roomId}:${rlClientId}:${action}`;
        const isAllowed = await rateLimit(redis, key, limit, windowSeconds);
        if (!isAllowed) {
            return errorJSON("Rate limit exceeded", 429);
        }

        // get room live object

        const channel = ably.channels.get(`room_${roomId}`);

        // helper function to get game state
        async function getGame() {
            const ser_game = await loadGame(redis, roomId);
            if (!ser_game) return null;
            return ShengJiGame.Game.deserializeGame(JSON.stringify(ser_game));
        }

        if (action === "start") { // ACTION: START GAME
            
            const exist = await getGame();

            if (exist && !exist.getState().over) return errorJSON("Game already in progress");
            // console.log("Initializing game...");

            const presence = await channel.presence.get();
            const players = presence.items.map(p => p.clientId);
            const game = new ShengJiGame.Game({});
            if (!game.initializeGame(players)) return errorJSON("Failed to initialize game");

            const ser_game = game.serializeGame();

            await saveGame(redis, roomId, ser_game);

            console.log("Game initialized with players:", players);

            publish(channel, "state_change", { game: ser_game });

            return successJSON({ msg: "Game started" });
        }

        if (action === "draw") { // ACTION: DRAW CARD

            if (!clientId) return errorJSON("Missing clientId");

            console.log("A");
            const game = await getGame();
            console.log("B");
            if (!game) return errorJSON("Game not found");
            
            if (!game.drawCard(clientId)) return errorJSON("Failed to draw card");

            const ser_game = game.serializeGame();

            await saveGame(redis, roomId, ser_game);

            publish(channel, "state_change", { game: ser_game });

            publish(channel, "hand_change", { clientId: clientId });

            return successJSON({ msg: "Card drawn" });
        }

        if (action === "trump") { // ACTION: CALL TRUMP
            
            if (!clientId) return errorJSON("Missing clientId");

            const game = await getGame();
            if (!game) return errorJSON("Game not found");

            const trump = payload && payload.trump;
            if (!game.tryCallTrump(clientId, trump)) return errorJSON("Invalid trump call");

            const ser_game = game.serializeGame();
            await saveGame(redis, roomId, ser_game);

            publish(channel, "state_change", { game: ser_game });

            return successJSON({ msg: "Trump called" });
        }

        if (action === "play") { // ACTION: PLAY CARDS

            if (!clientId) return errorJSON("Missing clientId");

            const game = await getGame();
            if (!game) return errorJSON("Game not found");

            const play = payload && payload.play;
            if (!game.tryPlay(clientId, play)) return errorJSON("Invalid play");

            const ser_game = game.serializeGame();
            await saveGame(redis, roomId, ser_game);

            publish(channel, "state_change", { game: ser_game });

            publish(channel, "hand_change", { clientId: clientId });

            return successJSON({ msg: "Play accepted" });
        }

        if (action === "hand") { // ACTION: REQUEST HAND
            if (!clientId) return errorJSON("Missing clientId");

            const game = await getGame();
            if (!game) return errorJSON("Game not found");

            const hand = game.getHand(clientId);
            if (!hand) return errorJSON("Hand not found");

            return successJSON({ hand: ShengJiGame.Game.serialize(hand) });
        }

        if (action === "end") { // ACTION: END GAME

            await redis.del(GAME_KEY_PREFIX + roomId);

            publish(channel, "state_change", { game: null });

            return successJSON({ msg: "Game ended" });
        } 

        return errorJSON("Invalid action");

    } catch (error) {
        // catch and return any errors
        return errorJSON(error.message, 500);
    }
}
