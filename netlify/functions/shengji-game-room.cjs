const Ably = require('ably');

import { LiveObjects } from 'ably/liveobjects';
import * as ShengJiGame from '/src/shengji/core/game';

function errorJSON(message) {
    return {
        statusCode: 400,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: message }),
    };
}

function successJSON(message) {
    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ msg: message }),
    };
}

let ably;

function getAbly() {
    if (!ably){
        ably = new Ably.Realtime({ 
            key: process.env.ABLY_API_KEY, 
            plugins: { LiveObjects }, 
            capability: { "*": ["publish", "subscribe", "presence", "object-subscribe", "object-publish"] } 
        }); // server connection
    }
    
    return ably
}

exports.handler = async function handler(event, context) {

    const ably = getAbly();

    try {

        // get action data

        const body = JSON.parse(event.body || '{}');
        const { roomId, action, clientId, payload } = body;

        // console.log(`Received request: ${action} from client ${clientId} for room_${roomId}`);

        if (!roomId || !action) return errorJSON("Missing roomId or action");

        await new Promise(resolve =>
            ably.connection.once("connected", resolve)
        );

        // get room live object

        const channel = ably.channels.get(`room_${roomId}`, {
            modes: ["PUBLISH", "SUBSCRIBE", "OBJECT_SUBSCRIBE", "OBJECT_PUBLISH", "PRESENCE", "PRESENCE_SUBSCRIBE"],
        });

        const room = await channel.object.get();

        // helper function to get game state
        function getGame() {
            const ser_game = room.get('game').value();
            if (!ser_game) return null;
            return ShengJiGame.Game.deserializeGame(ser_game);
        }

        if (action === "start") { // ACTION: START GAME
            
            const exist = getGame();

            if (exist && !exist.getState().over) return errorJSON("Game already in progress");
            console.log("Initializing game...");

            const players = await channel.presence.get().then(presence => presence.map(p => p.clientId));
            const game = new ShengJiGame.Game({});
            if (!game.initializeGame(players)) return errorJSON("Failed to initialize game");

            await room.set('game', game.serializeGame());

            // console.log("Game initialized with players:", players);

            return successJSON("Game started");
        }

        if (action === "draw") { // ACTION: DRAW CARD

            if (!clientId) return errorJSON("Missing clientId");

            const game = getGame();
            if (!game) return errorJSON("Game not found");
            
            if (!game.drawCard(clientId)) return errorJSON("Failed to draw card");

            // console.log("Successful draw");

            await room.set('game', game.serializeGame());

            return successJSON("Card drawn");
        }

        if (action === "play") { // ACTION: PLAY CARDS

            if (!clientId) return errorJSON("Missing clientId");

            const game = getGame();
            if (!game) return errorJSON("Game not found");

            const play = payload && payload.play;
            if (!game.tryPlay(clientId, play)) return errorJSON("Invalid play");

            await room.set('game', game.serializeGame());

            return successJSON("Play accepted");
        }

        if (action === "hand") { // ACTION: REQUEST HAND
            if (!clientId) return errorJSON("Missing clientId");

            const game = getGame();
            if (!game) return errorJSON("Game not found");

            const hand = game.getHand(clientId);
            if (!hand) return errorJSON("Hand not found");

            return successJSON({ hand: ShengJiGame.Game.serialize(hand) });
        }

        if (action === "state") { // ACTION: REQUEST GAME STATE

            const game = getGame();
            if (!game) return errorJSON("Game not found");

            return successJSON({ state: ShengJiGame.Game.serialize(game.getState()) });
        }

        if (action === "end") { // ACTION: END GAME

            await room.remove('game');

            return successJSON("Game ended");
        } 

        return errorJSON("Invalid action");

    } catch (error) {
        // catch and return any errors
        return errorJSON(error.message);

    } finally {
        // ensure ably connection is closed after handling the request
        ably.close();
    }
}
