import crypto from "node:crypto";

import type { HandlerEvent } from "@netlify/functions";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { handler as AblyHandler } from "./ably-auth";

vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));

const ably = vi.hoisted(() => ({
    createTokenRequest: vi.fn(),
    keys: [] as unknown[],
}));

vi.mock("ably", () => ({
    default: {
        Rest: class {
            auth = { createTokenRequest: ably.createTokenRequest };
            constructor(options: unknown) {
                ably.keys.push(options);
            }
        },
    },
}));

const SECRET = "ably-test-secret";
const sign = (clientId: string): string => crypto.createHmac("sha256", SECRET).update(clientId).digest("hex");

type Handler = typeof AblyHandler;

async function load(): Promise<Handler> {
    vi.resetModules();
    vi.stubEnv("SESSION_SECRET", SECRET);
    vi.stubEnv("ABLY_API_KEY_CLIENT", "app.key:secret");
    return (await import("./ably-auth")).handler;
}

const request = (params?: Record<string, string>): HandlerEvent =>
    ({ queryStringParameters: params }) as unknown as HandlerEvent;

describe("ably-auth", () => {
    let handler: Handler;

    beforeEach(async () => {
        ably.createTokenRequest.mockReset();
        ably.createTokenRequest.mockResolvedValue({ keyName: "app.key", mac: "m" });
        ably.keys.length = 0;
        handler = await load();
    });

    it("configures the Ably client with the client-scoped key", () => {
        expect(ably.keys).toEqual([{ key: "app.key:secret" }]);
    });

    it("issues a token request for a correctly signed client", async () => {
        const res = await handler(request({ clientId: "alice", signature: sign("alice") }));
        expect(res?.statusCode).toBe(200);
        expect(JSON.parse(res?.body ?? "")).toEqual({ keyName: "app.key", mac: "m" });
    });

    it("binds the token to the verified client id", async () => {
        await handler(request({ clientId: "alice", signature: sign("alice") }));
        expect(ably.createTokenRequest).toHaveBeenCalledTimes(1);
        expect(ably.createTokenRequest.mock.calls[0][0]).toMatchObject({ clientId: "alice" });
    });

    it("never lets the browser publish: subscribe and presence only", async () => {
        await handler(request({ clientId: "alice", signature: sign("alice") }));
        const { capability } = ably.createTokenRequest.mock.calls[0][0] as { capability: Record<string, string[]> };
        const granted = Object.values(capability).flat();
        expect(granted.sort()).toEqual(["presence", "subscribe"]);
        expect(granted).not.toContain("publish");
    });

    it("rejects a request with no query string", async () => {
        const res = await handler(request());
        expect(res?.statusCode).toBe(400);
        expect(ably.createTokenRequest).not.toHaveBeenCalled();
    });

    it.each([
        [{ clientId: "alice" }],
        [{ signature: "abc" }],
        [{ clientId: "", signature: "abc" }],
    ])("rejects missing parameters %j with 400", async (params) => {
        const res = await handler(request(params));
        expect(res?.statusCode).toBe(400);
        expect(ably.createTokenRequest).not.toHaveBeenCalled();
    });

    it("rejects a bad signature with 403 and issues nothing", async () => {
        const res = await handler(request({ clientId: "alice", signature: sign("bob") }));
        expect(res?.statusCode).toBe(403);
        expect(ably.createTokenRequest).not.toHaveBeenCalled();
    });

    it("reports Ably failures as a 500 naming the function", async () => {
        ably.createTokenRequest.mockRejectedValue(new Error("ably down"));
        const res = await handler(request({ clientId: "alice", signature: sign("alice") }));
        expect(res?.statusCode).toBe(500);
        expect(JSON.parse(res?.body ?? "").error).toMatch(/ably-auth: Internal server error ably down/);
    });
});
