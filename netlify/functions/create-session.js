import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const { SESSION_SECRET } = process.env;

function sign(clientId) {
    return crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(clientId)
        .digest('hex');
}

export function verify(clientId, signature) {
    const expected = sign(clientId);
    return expected === signature;
}

export const handler = async (event) => {

    const body = JSON.parse(event.body || '{}');
    const { action, clientId, signature } = body;

    const clientVal = clientId && clientId.trim() !== "" && clientId.startsWith("player_");
    const signatureVal = signature && signature.trim() !== "";

    if (action === "create") {

        if (!clientVal) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ error: "Invalid clientId" }),
            };
        }

        const signature = sign(clientId);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ clientId, signature }),
        };

    } else if (action === "verify") {

        if (!clientVal || !signatureVal) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ error: "Missing clientId or signature" }),
            };
        }

        const isValid = verify(clientId, signature);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ valid: isValid }),
        };

    } else {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: "Invalid action" }),
        };
    }
};