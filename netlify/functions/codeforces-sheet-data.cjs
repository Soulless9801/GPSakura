import dotenv from 'dotenv';

dotenv.config();

import fs from 'fs';
import path from 'path';


const { GOOGLE_API_KEY, SPREADSHEET_ID } = process.env;

exports.handler = async (event, context) => {
  let csv;
  try {
    const TAB_NAME = 'Sheet1';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${TAB_NAME}?alt=json&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Sheets API returned ${response.status}`);
    }
    const jsonData = await response.json();
    const data = jsonData.values;
    if (!data || !data.length) {
      return {
        statusCode: 404,
        body: 'Empty Google Sheet'
      };
    }
    csv = data.map(row => row.join(';')).join('\n');
  } catch (error) {
    try {
      const filePath = path.resolve('./netlify/functions/data/cfProblems.csv');
      csv = fs.readFileSync(filePath, 'utf8');
    } catch (fsError) {
      return {
        statusCode: 500,
        body: 'Unable to fetch Data'
      };
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/csv' },
    body: csv
  };
};