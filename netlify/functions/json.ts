import { serialize } from '../../src/utils/serial.ts';

export function errorJSON(message: string, code = 400) {
    return {
        statusCode: code,
        headers: {
            "Content-Type": "application/json",
        },
        body: serialize({ error: message }),
    };
}

export function successJSON(payload: any) {
    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
        },
        body: serialize(payload),
    };
}