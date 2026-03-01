import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

const { SPREADSHEET_ID } = process.env;

export const handler = async (event, context) => {

    console.log("HANDLER EXECTUED");

    let csv;

    try {
        const SHEET_ID = '0';
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=tsv&gid=${SHEET_ID}`;

        const response = await fetch(url);

        if (!response.ok) throw new Error();

        csv = await response.text();
        csv = csv.replaceAll('\t', ';');

        console.log(`Fetched ${csv.length} rows from Google Sheets`);
    } catch (error) {
        const filePath = path.resolve('./netlify/functions/data/cfProblems.csv');
        csv = fs.readFileSync(filePath, 'utf8');
    }

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
    };
};
