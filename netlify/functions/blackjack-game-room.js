import dotenv from 'dotenv';

dotenv.config();

import { eq, and } from "drizzle-orm";

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
        const playerId = Number(clientId);
        if (isNaN(playerId) || !Number.isInteger(playerId) || playerId <= 0) return errorJSON("Invalid clientId");

        // helper function to get game state
        async function getGame(gameId, playerId) {

            const game = await db
                .select()
                .from(games)
                .where(and(eq(games.id, gameId), eq(games.player_id, playerId)))
                .limit(1);

            return (game.length > 0) ? game[0] : null;
        }

        if (action === "start") { // ACTION: START GAME

            const bet = Number(payload.bet_amount);

            if (isNaN(bet) || bet <= 0) return errorJSON("Invalid bet amount");

            // console.log('Starting game...');
            
            const result = await db
                .insert(games)
                .values({
                    player_id: playerId, // TODO: replace with actual player ID
                    bet_amount: bet, // TODO: replace with actual bet amount from payload
                    player_cards: 0,
                    dealer_cards: 0,
                })
                .returning({player_cards: games.player_cards, dealer_cards: games.dealer_cards, game_id: games.id});

            // console.log(result);

            return successJSON({ result });
        }

        
        if (action === "hit") { // ACTION: HIT

            // console.log('Hit action received for gameId:', payload.game_id);

            const gameId = Number(payload.game_id);

            if (isNaN(gameId) || !Number.isInteger(gameId) || gameId <= 0) return errorJSON("Invalid gameID");

            // console.log('Checking for game with ID:', gameId);
            
            const game = await getGame(gameId, playerId);
            if (!game) return errorJSON("Game not found");

            // console.log('Game found:', game);

            const result = await db
                .update(games)
                .set({
                    player_cards: game.player_cards + 1, // TODO: replace with actual new player cards
                })
                .where(and(eq(games.id, gameId), eq(games.player_id, playerId)))
                .returning({player_cards: games.player_cards, dealer_cards: games.dealer_cards, game_id: games.id});

            // console.log(result);

            return successJSON({ result });
        }

        if (action === "stand") { // ACTION: STAND

            const gameId = Number(payload.game_id);

            if (isNaN(gameId) || !Number.isInteger(gameId) || gameId <= 0) return errorJSON("Invalid gameID");

            // console.log('Starting game...');
            
            const game = await getGame(gameId, playerId);
            if (!game) return errorJSON("Game not found");

            const result = await db
                .update(games)
                .set({
                    dealer_cards: game.dealer_cards + 1, // TODO: replace with actual new dealer cards
                })
                .where(and(eq(games.id, gameId), eq(games.player_id, playerId)))
                .returning({player_cards: games.player_cards, dealer_cards: games.dealer_cards, game_id: games.id});

            // console.log(result);

            return successJSON({ result });
        }

        return errorJSON("Invalid action");

    } catch (error) {
        // catch and return any errors
        console.log("Error in handler:", error);
        return errorJSON(error.message, 500);
    }
}
