const dotenv = require('dotenv');

dotenv.config();

const fs = require('fs');
const path = require('path');


const { SPREADSHEET_ID } = process.env;

exports.handler = async (event, context) => {

	let csv;

	const delim = ';';

	try {
		const SHEET_ID = "0";
		const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=tsv&gid=${SHEET_ID}`;

		const response = await fetch(url);

		if (!response.ok) throw new Error();

		csv = await response.text();
		csv = csv.replaceAll('\t', ';');

		// console.log(`Fetched ${csv.length} rows from Google Sheets`);

	} catch (error) {
		const filePath = path.resolve('./netlify/functions/data/cfProblems.csv');
		csv = fs.readFileSync(filePath, 'utf8');
	}

	return {
		statusCode: 200,
		headers: { 'Content-Type': 'text/csv' },
		body: csv
	};
};