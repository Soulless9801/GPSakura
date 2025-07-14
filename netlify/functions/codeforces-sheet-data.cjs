require('dotenv').config();
const fs = require('fs');

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
        body: 'No data found in the Google Sheet.'
      };
    }
    csv = data.map(row => row.join(';')).join('\n');
  } catch (error) {
    console.error("Error fetching Google Sheets data:", error.message);
    try {
      // Read the fallback CSV file. Ensure that this file is deployed with your function.
      csv = fs.readFileSync('/cf/cfProblems.csv', 'utf8');
      console.log("Using local CSV file.");
    } catch (fsError) {
      console.error("Error reading local CSV file:", fsError.message);
      return {
        statusCode: 500,
        body: 'Unable to fetch data from Google Sheets and local file.'
      };
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/csv' },
    body: csv
  };
};