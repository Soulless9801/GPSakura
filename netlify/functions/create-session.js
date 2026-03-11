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
    const { clientId } = body;

    console.log(`Creating session for clientId: ${clientId}`);

    const clientVal = clientId && clientId.trim() !== "" && clientId.startsWith("player_");

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
        body: JSON.stringify({ signature }),
    };
};