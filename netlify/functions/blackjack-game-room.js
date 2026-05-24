import dotenv from 'dotenv';

dotenv.config();

import { neon } from "@neondatabase/serverless";

import { drizzle } from "drizzle-orm/neon-http";

import { games, players } from "../../db/schema.ts";

const sql = neon(process.env.NEON_DATABASE_URL);

const db = drizzle(sql);

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

export async function handler(event) {

    try {

        // get action data

        const body = JSON.parse(event.body || '{}');
        const { action, clientId, payload } = body;

        console.log(`Received request: ${action} from clientId ${clientId}`);

        if (!action || !clientId) return errorJSON("Missing clientId or action");

        // helper function to get game state
        async function getGame() {
            return null; // disable game for now
        }

        if (action === "start") { // ACTION: START GAME

            const playerId = Number(clientId);
            const bet = Number(payload.bet_amount);

            if (isNaN(playerId) || !Number.isInteger(playerId) || isNaN(bet) || bet <= 0) return errorJSON("Invalid clientId or bet amount");

            // console.log('Starting game...');
            
            const result = await db
                .insert(games)
                .values({
                    player_id: playerId, // TODO: replace with actual player ID
                    bet_amount: bet, // TODO: replace with actual bet amount from payload
                    player_cards: 0,
                    dealer_cards: 0,
                })
                .returning({id: games.id});

            // console.log(result);

            return successJSON({ result });
        }

        return errorJSON("Invalid action");

    } catch (error) {
        // catch and return any errors
        return errorJSON(error.message, 500);
    }
}
