// TODO: add winning/losing
import dotenv from 'dotenv';

dotenv.config();

import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { games, players } from "../../db/schema.ts";

import { GameData, Game } from "../../src/blackjack/core/game.ts";

import { errorJSON, successJSON } from './json.ts';

const sql = neon(process.env.NEON_DATABASE_URL!);

const db = drizzle(sql);

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

        const action : string = String(body.action || "").trim();
        const clientId : number = Number(body.clientId || 0);
        let roomId : number = Number(body.roomId || 0);
        const payload : any = body.payload || {};

        console.log(`Received request: ${action} from clientId ${clientId} for roomId ${roomId}`);

        // const clientId = Number(clientId || 0);
        // let roomId = Number(roomId || 0);

        if (isNaN(clientId) || !Number.isInteger(clientId) || clientId <= 0) return errorJSON("Invalid clientId");

        // helper function to get game state
        async function getGameRow(roomId: number, clientId: number) {

            if (isNaN(roomId) || !Number.isInteger(roomId) || roomId <= 0) return errorJSON("Invalid roomId");

            const row = await db
                .select()
                .from(games)
                .where(and(eq(games.id, roomId), eq(games.player_id, clientId)))
                .limit(1);

            return (row.length > 0) ? row[0] : null;
        }

        async function getGame() {
            
            const gameRow = await getGameRow(roomId, clientId);
            if (!gameRow) return errorJSON("Game not found");

            const data : GameData = parseGameData(gameRow);

            return new Game(data);
        }
        
        function retJSON(game: Game) {

            if (isNaN(roomId) || !Number.isInteger(roomId) || roomId <= 0) return errorJSON("Invalid roomId");

            const over : boolean = game.checkOver();
            const status : string = game.checkWinner();

            return successJSON({
                game_id: roomId,
                player_cards: game.getPlayerHand(),
                dealer_cards: game.getDealerHand(),
                over: over,
                status: status,
            });
        }

        if (action === "start") { // ACTION: START GAME

            const bet : number = Number(payload.bet_amount);

            if (isNaN(bet) || bet <= 0) return errorJSON("Invalid bet amount");

            // console.log('Starting game...');

            const seed : number = genSeed();
            
            // TODO: sanitize clientId and bet value
            const result = await db
                .insert(games)
                .values({
                    player_id: clientId,
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
            roomId = ret.game_id; // update roomId to the actual ID from the database

            const data : GameData = parseGameData(ret);
            const game : Game = new Game(data);

            return retJSON(game);
        }
        
        if (action === "hit") { // ACTION: HIT

            const game = await getGame();
            if (!(game instanceof Game)) return errorJSON("Game not found");
            if (!game.playerHit()) return errorJSON("Player hit failed");

            await db
                .update(games)
                .set(game.getGameData())
                .where(and(eq(games.id, roomId), eq(games.player_id, clientId)));

            return retJSON(game);
        }

        if (action === "stand") { // ACTION: STAND

            const game = await getGame();
            if (!(game instanceof Game)) return errorJSON("Game not found");
            if (!game.playerStand()) return errorJSON("Player stand failed");

            await db
                .update(games)
                .set(game.getGameData())
                .where(and(eq(games.id, roomId), eq(games.player_id, clientId)));

            return retJSON(game);
        }

        // if (action === "dealer") { // ACTION: DEALER ACTION

        //     const game = await getGame();
        //     if (!(game instanceof Game)) return game; 
        //     while (game.dealerPlay()) continue; // keep playing until dealer is done
        //     // if (!game.dealerPlay()) return errorJSON("Dealer play failed");

        //     await db
        //         .update(games)
        //         .set(game.getGameData())
        //         .where(and(eq(games.id, roomId), eq(games.player_id, clientId)));

        //     // console.log(result);

        //     return retJSON(game);
        // }

        return errorJSON("Invalid action");

    } catch (error: any) {
        // console.log("Error in handler:", error);
        return errorJSON(error.message, 500);
    }
}
