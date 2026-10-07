import dotenv from 'dotenv';
import crypto from 'crypto';
import type { HandlerEvent } from '@netlify/functions';

dotenv.config();

import { errorJSON, successJSON } from './data/json.ts';

const { SESSION_SECRET } = process.env;

// A signature is only worth anything if the server alone can make it, so refuse to run
// without a secret rather than falling back to a guessable key.
export function sign(clientId: string): string {
    if (!SESSION_SECRET) {throw new Error("SESSION_SECRET is not configured");}
    return crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(clientId)
        .digest('hex');
}

export function verify(clientId: string, signature: string): boolean {
    if (!clientId || !signature || !SESSION_SECRET) {return false;}
    const expected = Buffer.from(sign(clientId));
    const given = Buffer.from(signature);
    return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

// Callers never choose their own id: the server mints it, so a signature proves the id was
// issued here and cannot be requested for somebody else's.
function newClientId(): string {
    return `player_${crypto.randomBytes(8).toString('hex')}`;
}

export const handler = async (event: HandlerEvent) => {

    try {

        let body;
        try {
            body = JSON.parse(event.body || '{}');
        } catch {
            return errorJSON("create-session: Invalid JSON body", 400);
        }

        const action = String(body.action || "").trim();

        if (action === "issue") {
            const clientId = newClientId();
            return successJSON({ clientId, signature: sign(clientId) });
        }

        if (action === "verify") {
            const clientId: string = String(body.clientId || "").trim();
            const signature: string = String(body.signature || "").trim();

            if (clientId.length === 0) {return errorJSON("Missing clientId", 400);}
            if (signature.length === 0) {return errorJSON("Missing signature", 400);}

            return successJSON({ valid: verify(clientId, signature) });
        }

        return errorJSON(`create-session: Invalid action ${action}`, 400);

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return errorJSON(`create-session: Internal server error ${message}`, 500);
    }
};
