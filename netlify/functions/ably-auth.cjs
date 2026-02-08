const dotenv = require('dotenv');

dotenv.config();

const { ABLY_API_KEY } = process.env;

const Ably = require('ably');

const client = new Ably.Rest(ABLY_API_KEY);

export const handler = async () => {
    const tokenRequest = await client.auth.createTokenRequest({
        clientId: "anonymous-" + Math.random().toString(36).slice(2),
    });

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(tokenRequest),
    };
};
