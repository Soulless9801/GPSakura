import dotenv from 'dotenv';

dotenv.config();

import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { games, players } from "../../db/schema.ts";

import { Hand } from "../../src/blackjack/core/entities.ts";
import { GameData, Game } from "../../src/blackjack/core/game.ts";

import { serialize } from '../../src/utils/serial.ts';

const sql = neon(process.env.NEON_DATABASE_URL!);

const db = drizzle(sql);

function errorJSON(message: string, code = 400) {
    return {
        statusCode: code,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: message }),
    };
}

function successJSON(payload: any) {
    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    };
}

function parseGameData(gameRow: any): GameData {
    return {
        player_cards: gameRow.player_cards,
        dealer_cards: gameRow.dealer_cards,
        deck_seed: gameRow.deck_seed,
    };
}

function genSeed() : number { // TODO: use better seed generation method
    return Math.floor(Math.random() * 1000000);
}

export async function handler(event: any) {

    try {

        // get action data

        const body = JSON.parse(event.body || '{}');
        let { action, clientId, roomId, payload } = body;

        console.log(`Received request: ${action} from clientId ${clientId}for gameId ${roomId}`);

        const playerId = Number(clientId || 0);
        let gameId = Number(roomId || 0);

        if (isNaN(playerId) || !Number.isInteger(playerId) || playerId <= 0) return errorJSON("Invalid clientId");
        if (isNaN(gameId) || !Number.isInteger(gameId) || gameId <= 0) return errorJSON("Invalid gameId");

        action = String(action || "").trim();

        // helper function to get game state
        async function getGameRow(gameId: number, playerId: number) {
            const row = await db
                .select()
                .from(games)
                .where(and(eq(games.id, gameId), eq(games.player_id, playerId)))
                .limit(1);

            return (row.length > 0) ? row[0] : null;
        }

        async function getGame() {
            
            const gameRow = await getGameRow(gameId, playerId);
            if (!gameRow) return errorJSON("Game not found");

            const data : GameData = parseGameData(gameRow);

            return new Game(data);
        }
        
        function retJSON(game: Game) {
            return successJSON({
                game_id: gameId,
                player_cards: serialize(game.getPlayerHand()),
                dealer_cards: serialize(game.getDealerHand()),
            });
        }

        if (action === "start") { // ACTION: START GAME

            const bet : number = Number(payload.bet_amount);

            if (isNaN(bet) || bet <= 0) return errorJSON("Invalid bet amount");

            // console.log('Starting game...');

            const seed : number = genSeed();
            
            // TODO: sanitize playerId and bet value
            const result = await db
                .insert(games)
                .values({
                    player_id: playerId,
                    bet_amount: bet,
                    player_cards: 2,
                    dealer_cards: 1,
                    deck_seed: seed,
                })
                .returning({
                    game_id: games.id, 
                    player_cards: games.player_cards, 
                    dealer_cards: games.dealer_cards, 
                    deck_seed: games.deck_seed
                });

            // console.log(result);

            const ret = result[0];
            gameId = ret.game_id; // update gameId to the actual ID from the database

            const data : GameData = parseGameData(ret);
            const game : Game = new Game(data);

            return retJSON(game);
        }
        
        if (action === "hit") { // ACTION: HIT

            const game = await getGame();
            if (!(game instanceof Game)) return game; 
            if (!game.playerHit()) return errorJSON("Player hit failed");

            await db
                .update(games)
                .set(game.getGameData())
                .where(and(eq(games.id, gameId), eq(games.player_id, playerId)));

            return retJSON(game);
        }

        if (action === "stand") { // ACTION: STAND

            const game = await getGame();
            if (!(game instanceof Game)) return game; 
            if (!game.playerStand()) return errorJSON("Player stand failed");

            await db
                .update(games)
                .set(game.getGameData())
                .where(and(eq(games.id, gameId), eq(games.player_id, playerId)));

            return retJSON(game);
        }

        if (action === "dealer") { // ACTION: DEALER ACTION

            const game = await getGame();
            if (!(game instanceof Game)) return game; 
            if (!game.dealerPlay()) return errorJSON("Dealer play failed");

            await db
                .update(games)
                .set(game.getGameData())
                .where(and(eq(games.id, gameId), eq(games.player_id, playerId)));

            // console.log(result);

            return retJSON(game);
        }

        return errorJSON("Invalid action");

    } catch (error: any) {
        // catch and return any errors
        console.log("Error in handler:", error);
        return errorJSON(error.message, 500);
    }
}
