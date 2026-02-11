const Ably = require('ably');

import { LiveObjects } from 'ably/liveobjects';
import * as ShengJiGame from '/src/shengji/core/game';

const ably = Ably.Rest({ key: process.env.ABLY_API_KEY, plugins: {LiveObjects} });

async function getRoomObject(roomId) {

    const channel_id = `room_${roomId}`;

    const options = { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] };
    const channel = ably.channels.get(channel_id, options);
    const obj = await channel.object.get();

    if (!obj.get('players')){
        await obj.set({
            players: [],
            game: new ShengJiGame.Game({}).serialize(),
        });
    }

    return obj;
}

exports.handler = async function handler(event, context) {
    try {
        const body = JSON.parse(event.body || '{}');
        const { roomId, action, clientId, payload } = body;

        console.log(`Received request: ${action} from client ${clientId} for room ${roomId}`);

        if (!roomId || !action || !clientId) {
            return {
                statusCode: 400,
            };
        }

        const room = await getRoomObject(roomId);

        if (action === 'join') {
            const players = room.get('players') || [];
            if (!players.includes(clientId)) {
                players.push(clientId);
                await room.set('players', players);
            }

            return {
                statusCode: 200,
            }
        }

        if (action === 'leave') {
            const players = (room.get('players') || []).filter((id) => id !== clientId);
            await room.set('players', players);

            return {
                statusCode: 200,
            }
        }

        if (action === "play") {
            const ser_game = room.get('game');
            if (!ser_game) {
                return {
                    statusCode: 400,
                };
            }

            const game = ShengJiGame.Game.deserialize(ser_game);
            const play = payload && payload.play;

            if (!ShengJiGame.tryPlay(game, clientId, play)) {
                return {
                    statusCode: 400,
                };
            }

            await room.set('game', ShengJiGame.Game.serialize(game));

            return {
                statusCode: 200,
            };
        }

        if (action === "start") {
            const ser_game = room.get('game');
            if (ser_game) {
                return {
                    statusCode: 400,
                };
            }

            const players = room.get('players') || [];

            const game = ShengJiGame.initializeGame(players);
            
            if (!game) {
                return {
                    statusCode: 400,
                };
            }

            await room.set('game', ShengJiGame.Game.serialize(game));

            return {
                statusCode: 200,
            };
        }

        return {
            statusCode: 400,
        }; 

    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
        };
    }
}
