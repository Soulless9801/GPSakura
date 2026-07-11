import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

const { SPREADSHEET_ID } = process.env;

export const handler = async (event: any) => {

    let csv;

    try {

        const SHEET_ID : string = '0';
        const url : string = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=tsv&gid=${SHEET_ID}`;

        const res = await fetch(url);

        if (!res.ok) throw new Error();

        csv = await res.text();
        csv = csv.replaceAll('\t', ';'); // replace delimiter

        console.log(`codeforces-sheet-data: Fetched ${csv.length} rows from Google Sheets`);
        
    } catch (error) {
        console.error(`codeforces-sheet-data: Error fetching data from Google Sheets`, error);
        try {
            const filePath = path.resolve('./netlify/functions/data/cfProblems.csv');
            csv = fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: "Error fetching data from Google Sheets and local fallback" }),
            };
        }
    }

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
    };
};
