import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import type { HandlerEvent } from '@netlify/functions';

dotenv.config();

const { SPREADSHEET_ID } = process.env;

export const handler = async (_event: HandlerEvent) => {

    let csv;

    try {

        const SHEET_ID : string = '0';
        const url : string = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=tsv&gid=${SHEET_ID}`;

        const res = await fetch(url);

        if (!res.ok) {throw new Error();}

        csv = await res.text();
        csv = csv.replaceAll('\t', ';'); // replace delimiter

        
    } catch {
        try {
            const filePath = path.resolve('./netlify/functions/data/cfProblems.csv');
            csv = fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: `codeforces-sheet-data: Internal server error ${message}` }),
            };
        }
    }

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
    };
};
