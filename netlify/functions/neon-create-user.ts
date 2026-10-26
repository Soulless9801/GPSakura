import dotenv from 'dotenv';

dotenv.config();

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { players } from "../../db/schema.ts";

import { errorJSON, successJSON } from './data/json.ts';
import { sign } from './create-session';
import { toUsername } from './data/guards';

const sql = neon(process.env.NEON_DATABASE_URL ?? "");

const db = drizzle(sql);

// request a new entry in player schema to be created

export default async function handler(request: Request): Promise<Response> {

    try {
        let body;
        try {
            body = JSON.parse((await request.text()) || '{}');
        } catch {
            return errorJSON("neon-create-user: Invalid JSON body", 400);
        }

        // Extract username from request, defaulting to 'anonymous' if not provided or invalid
        const username = toUsername(body.username) ?? 'anonymous';
        
        const result = await db
            .insert(players)
            .values({
                username,
                money: 1000,
            })
            .returning({
                player_id: players.id,
                money: players.money,
            });

        // console.log(result);

        const ret = result[0];

        // the player id is the client id the game rooms authenticate, so the server signs it
        // here, at creation, instead of signing whatever id a client later asks about
        return successJSON({
            player_id: ret.player_id,
            money: ret.money,
            signature: sign(String(ret.player_id)),
        });
        
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return errorJSON(`neon-create-user: Internal server error ${message}`, 500);
    }
}
