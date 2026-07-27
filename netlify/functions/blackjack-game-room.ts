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

interface GameRow extends BJGame.GameData {
    id: number;
}

function parseGameRow(data: any): GameRow | null {
    if (!data || typeof data !== "object") return null;

    const id = Number(data.id);
    const player_cards = Number(data.player_cards);
    const dealer_cards = Number(data.dealer_cards);
    const deck_seed = Number(data.deck_seed);
    const bet_amount = Number(data.bet_amount);
    const settled = Boolean(data.settled);

    if (isNaN(id) || isNaN(player_cards) || isNaN(dealer_cards) || isNaN(deck_seed) || isNaN(bet_amount)) {
        return null;
    }

    return {
        id,
        player_cards,
        dealer_cards,
        deck_seed,
        bet_amount,
        settled,
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
        const identityClientId : string = String(identity.clientId || "").trim();
        if (!identityClientId) return errorJSON("Missing clientId", 400);
        const clientId : number = Number(identityClientId);
        const signature : string = String(identity.signature || "").trim();

        const action : string = String(body.action || "").trim();
        let roomId : number = Number(body.roomId || 0);
        const payload : any = body.payload || {};

        console.log(`blackjack-game-room: Received action ${action} from clientId ${clientId} for roomId ${roomId}`);

        if (isNaN(clientId) || !Number.isInteger(clientId) || clientId <= 0) return errorJSON("Invalid clientId");
        if (!signature || !verify(identityClientId, signature)) return errorJSON("Invalid signature");

        async function getMoney() {
            return db
                .select({ money: players.money })
                .from(players)
                .where(eq(players.id, clientId))
                .limit(1)
                .then(rows => (rows.length > 0) ? rows[0].money : null);
        }

        let money : number | null = await getMoney();

        if (action === "money") {
            return successJSON({ money: money });
        }

        if (action === "refill") {
            money = (money || 0) + 1000; // refill 1000 money
            await db.update(players)
                .set({ money: money })
                .where(eq(players.id, clientId));
            return successJSON({ money: money });
        }

        // helper function to get game state
        async function getGame() {

            if (isNaN(roomId) || !Number.isInteger(roomId) || roomId <= 0) return null;

            const row = await db
                .select()
                .from(games)
                .where(and(eq(games.id, roomId), eq(games.player_id, clientId)))
                .limit(1);
            
            const gameRow : GameRow | null = (row.length > 0) ? row[0] : null;
            if (!gameRow) return null;

            return new BJGame.Game(gameRow);
        }

        async function getGames() {

            const rows = await db
                .select()
                .from(games)
                .where(eq(games.player_id, clientId));
            
            if (rows.length < 1) return null;

            return rows.map(row => parseGameRow(row)).filter((v): v is GameRow => !!v);
        }

        async function settleGame(game: BJGame.Game) {

            const over : boolean = game.checkOver();
            const status : string = game.checkWinner();
            const settled : boolean = game.isSettled();

            if (over && !settled) {

                game.setSettled(true);
                
                const betAmount : number = game.getBetAmount();
                if (money === null) return errorJSON("Player not found");

                if (status === "player") {
                    money += betAmount;
                    await db.update(players)
                        .set({ money: money })
                        .where(eq(players.id, clientId));
                } else {
                    money -= betAmount;
                    await db.update(players)
                        .set({ money: money })
                        .where(eq(players.id, clientId));
                }
            }

            await db
                .update(games)
                .set(game.getGameData())
                .where(and(eq(games.id, roomId), eq(games.player_id, clientId)));
        }
        
        function retJSON(game: BJGame.Game) {

            if (isNaN(roomId) || !Number.isInteger(roomId) || roomId <= 0) return errorJSON("Invalid roomId");

            return successJSON({
                id: roomId,
                money: money,
                player_cards: game.getPlayerHand(),
                dealer_cards: game.getDealerHand(),
                over: game.checkOver(),
                status: game.checkWinner(),
            });
        }

        const MIN_BET : number = 0; // TODO: set minimum bet amount

        if (action === "start") { // ACTION: START GAME

            const bet : number = Number(payload.bet_amount);

            if (money === null || isNaN(bet) || bet <= MIN_BET || bet > money) return errorJSON("Invalid bet amount");

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
                    settled: false,
                })
                .returning({
                    id: games.id, 
                    player_cards: games.player_cards, 
                    dealer_cards: games.dealer_cards, 
                    deck_seed: games.deck_seed,
                    bet_amount: games.bet_amount,
                    settled: games.settled,
                });

            // console.log(result);

            const ret : GameRow = result[0];
            roomId = ret.id; // update roomId to the actual ID from the database

            const game : BJGame.Game = new BJGame.Game(ret);

            return retJSON(game);
        }

        if (action === "load") { // ACTION: LOAD GAME
            
            const games = await getGames();
            if (!games) return errorJSON("No games found for this player");

            const gameRow = games.reduce((prev, curr) => (curr.id > prev.id ? curr : prev), games[0]);
            if (!gameRow) return errorJSON("No games found for this player");
            
            roomId = gameRow.id; // update roomId to the actual ID from the database

            const game : BJGame.Game = new BJGame.Game(gameRow);

            return retJSON(game);
        }    
        
        if (action === "hit") { // ACTION: HIT

            const game = await getGame();
            if (!(game instanceof BJGame.Game)) return errorJSON("Game not found");
            if (!game.playerHit()) return errorJSON("Player hit failed");

            await settleGame(game);
            return retJSON(game);
        }

        if (action === "stand") { // ACTION: STAND

            const game = await getGame();
            if (!(game instanceof BJGame.Game)) return errorJSON("Game not found");
            if (!game.playerStand()) return errorJSON("Player stand failed");

            await settleGame(game);
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
        console.log("Error in handler:", error);
        return errorJSON(error.message, 500);
    }
}
