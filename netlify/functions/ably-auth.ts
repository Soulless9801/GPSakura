import dotenv from 'dotenv';

dotenv.config();

import Ably from 'ably';

import { errorJSON, successJSON } from './json.ts';

const { ABLY_API_KEY } = process.env;

const client = new Ably.Rest(ABLY_API_KEY!);

export const handler = async (event: any) => {

    try {
        
        const clientId = event.queryStringParameters?.clientId;

        const tokenRequest = await client.auth.createTokenRequest({
            clientId,
            capability: {
                '*': ['subscribe', 'presence'],
            },
        });

        return successJSON(tokenRequest);

    } catch (error) {
        // console.log("Error generating Ably token request:", error);
        return errorJSON("Internal server error", 500);
    }
};