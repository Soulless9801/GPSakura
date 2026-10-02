import dotenv from 'dotenv';

dotenv.config();

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import type { HandlerEvent } from '@netlify/functions';
import { players } from "../../db/schema.ts";

import { errorJSON, successJSON } from './data/json.ts';

const sql = neon(process.env.NEON_DATABASE_URL ?? "");

const db = drizzle(sql);

// request a new entry in player schema to be created

export async function handler(_event: HandlerEvent) {

    try {

        const result = await db
            .insert(players)
            .values({
                //TODO: implement neon username
                username: 'anonymous',
                money: 1000,
            })
            .returning({
                player_id: players.id,
                money: players.money,
            });

        // console.log(result);

        const ret = result[0];

        return successJSON({
            player_id: ret.player_id,
            money: ret.money,
        });
        
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return errorJSON(`neon-create-user: Internal server error ${message}`, 500);
    }
}
