import dotenv from 'dotenv';

dotenv.config();

import Ably from 'ably';

import { errorJSON, successJSON } from './data/json.ts';

import { verify } from "./create-session";

const { ABLY_API_KEY } = process.env;

const client = new Ably.Rest(ABLY_API_KEY!);

export const handler = async (event: any) => {

    try {
        
        const clientId = event.queryStringParameters?.clientId;
        const signature = event.queryStringParameters?.signature;

        if (!clientId || !signature) return errorJSON("Missing clientId or signature", 400);
        if (!verify(clientId, signature)) return errorJSON("Invalid signature", 403);

        console.log(`ably-auth: Received token generation request for clientId ${clientId}`);

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