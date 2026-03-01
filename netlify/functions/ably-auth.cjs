const dotenv = require('dotenv');

dotenv.config();

const { ABLY_API_KEY } = process.env;

const Ably = require('ably');

const client = new Ably.Rest(ABLY_API_KEY);

exports.handler = async (event) => {

    const clientId = `player_${Math.random().toString(36).slice(2)}`;
    
    const tokenRequest = await client.auth.createTokenRequest({
        clientId: clientId,
        capability: {
            "*": ["subscribe", "presence"],
        },
    });

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(tokenRequest),
    };
};
