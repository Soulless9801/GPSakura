import dotenv from 'dotenv';

dotenv.config();

import Ably from 'ably';

import { errorJSON, successJSON } from './data/json.ts';

import { verify } from "./create-session";

const { ABLY_API_KEY_CLIENT } = process.env;

const client = new Ably.Rest({ key: ABLY_API_KEY_CLIENT });

export default async function handler(request: Request): Promise<Response> {

    try {
        
        const params = new URL(request.url).searchParams;
        const clientId = params.get("clientId");
        const signature = params.get("signature");

        if (!clientId || !signature) {return errorJSON("Missing clientId or signature", 400);}
        if (!verify(clientId, signature)) {return errorJSON("Invalid signature", 403);}

        const tokenRequest = await client.auth.createTokenRequest({
            clientId,
            capability: {
                'room:*:shengji': ['subscribe', 'presence'],
            },
        });

        return successJSON(tokenRequest);

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return errorJSON(`ably-auth: Internal server error ${message}`, 500);
    }
}
