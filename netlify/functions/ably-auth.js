import dotenv from 'dotenv';
import Ably from 'ably';
import { verify } from './create-session.js';

dotenv.config();

const { ABLY_API_KEY } = process.env;

const client = new Ably.Rest(ABLY_API_KEY);

export const handler = async (event) => {

    const clientId = event.queryStringParameters?.clientId;
    const signature = event.queryStringParameters?.signature;

    if (!clientId || !signature) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: "Invalid authentication parameters" }),
        };
    }

    if (!verify(clientId, signature)) {
        return {
            statusCode: 403,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: "Authentication failed" }),
        };
    }

    const tokenRequest = await client.auth.createTokenRequest({
        clientId,
        capability: {
            '*': ['subscribe', 'presence'],
        },
    });

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenRequest),
    };
};