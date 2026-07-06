import dotenv from 'dotenv';

dotenv.config();

import { verify } from "./create-session";
import { Identity } from "../../src/utils/verify";

import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
//TODO: add money and betting
import { games, players } from "../../db/schema";

import * as BJGame from "../../src/blackjack/core/game";

import { errorJSON, successJSON } from './data/json.ts';

const sql = neon(process.env.NEON_DATABASE_URL!);

const db = drizzle(sql);

function parseBJGameData(gameRow: any): BJGame.GameData {
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

        const identity : Identity | null = body.identity || null;
        if (!identity) return errorJSON("Missing identity", 400);
        const clientId : number = Number(identity.clientId || 0);
        const signature : string = String(identity.signature || "").trim();

        const action : string = String(body.action || "").trim();
        let roomId : number = Number(body.roomId || 0);
        const payload : any = body.payload || {};

        console.log(`blackjack-game-room: Received action ${action} from clientId ${clientId} for roomId ${roomId}`);

        // const clientId = Number(clientId || 0);
        // let roomId = Number(roomId || 0);

        if (isNaN(clientId) || !Number.isInteger(clientId) || clientId <= 0) return errorJSON("Invalid clientId");
        if (!signature || !verify(identity.clientId, signature)) return errorJSON("Invalid signature");


        // helper function to get game state
        async function getGame() {

            if (isNaN(roomId) || !Number.isInteger(roomId) || roomId <= 0) return null;

            const row = await db
                .select()
                .from(games)
                .where(and(eq(games.id, roomId), eq(games.player_id, clientId)))
                .limit(1);
            
            const gameRow = (row.length > 0) ? row[0] : null;
            if (!gameRow) return null;

            const data : BJGame.GameData = parseBJGameData(gameRow);

            return new BJGame.Game(data);
        }

        async function getGames() {

            const rows = await db
                .select()
                .from(games)
                .where(eq(games.player_id, clientId));
            
            if (rows.length < 1) return null;

            return rows.map(row => ({
                game_id: row.id,
                player_cards: row.player_cards,
                dealer_cards: row.dealer_cards,
                deck_seed: row.deck_seed,
            }));
        }  
        
        function retJSON(game: BJGame.Game) {

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

            const data : BJGame.GameData = parseBJGameData(ret);
            const game : BJGame.Game = new BJGame.Game(data);

            return retJSON(game);
        }

        if (action === "load") { // ACTION: LOAD GAME
            
            const games = await getGames();
            if (!games) return errorJSON("No games found for this player");

            const game_row = games.reduce((prev, curr) => (curr.game_id > prev.game_id ? curr : prev), games[0]);
            if (!game_row) return errorJSON("No games found for this player");
            
            roomId = game_row.game_id; // update roomId to the actual ID from the database

            const data : BJGame.GameData = parseBJGameData(game_row);
            const game : BJGame.Game = new BJGame.Game(data);

            return retJSON(game);
        }    
        
        if (action === "hit") { // ACTION: HIT

            const game = await getGame();
            if (!(game instanceof BJGame.Game)) return errorJSON("Game not found");
            if (!game.playerHit()) return errorJSON("Player hit failed");

            await db
                .update(games)
                .set(game.getGameData())
                .where(and(eq(games.id, roomId), eq(games.player_id, clientId)));

            return retJSON(game);
        }

        if (action === "stand") { // ACTION: STAND

            const game = await getGame();
            if (!(game instanceof BJGame.Game)) return errorJSON("Game not found");
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
        //         .set(game.getBJGame.GameData())
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
