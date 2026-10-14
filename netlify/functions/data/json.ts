import { serialize } from '../../../src/utils/serial.ts';

export function errorJSON(message: string, code = 400): Response {
    return new Response(serialize({ error: message }), {
        status: code,
        headers: { "Content-Type": "application/json" },
    });
}

export function successJSON(payload: object | null): Response {
    // Preserve the shared Map encoding used by the game clients.
    return new Response(serialize(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
}
