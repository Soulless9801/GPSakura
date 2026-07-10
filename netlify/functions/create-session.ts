import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

import { errorJSON, successJSON } from './data/json.ts';

const { SESSION_SECRET } = process.env;

function sign(clientId: string) {
    return crypto
        .createHmac('sha256', SESSION_SECRET!)
        .update(clientId)
        .digest('hex');
}

export function verify(clientId: string, signature: string) {
    if (!clientId || !signature) return false;
    const expected = sign(clientId);
    return expected === signature;
}

export const handler = async (event: any) => {

    try {

        const body = JSON.parse(event.body || '{}');

        const action = String(body.action || "").trim();
        const clientId = String(body.clientId || "").trim();
        const signature = String(body.signature || "").trim();

        console.log(`create-session: Received action ${action} for clientId: ${clientId}`);

        const clientVal: string = String(clientId || "").trim();

        if (clientVal.length === 0) return errorJSON("Missing clientId", 400);

        if (action === "sign") {
            const sig = sign(clientVal);

            return successJSON({ signature: sig });
        }

        if (action === "verify") {
            const sigVal: string = String(signature || "").trim();

            if (sigVal.length === 0) return errorJSON("Missing signature", 400);

            const isValid = verify(clientVal, sigVal);

            return successJSON({ valid: isValid });
        }

    } catch (error) {
        // console.error("Error in create-session handler:", error);
        return errorJSON("Internal server error", 500);
    }
};