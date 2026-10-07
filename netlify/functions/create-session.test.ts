import crypto from "node:crypto";

import type { HandlerEvent } from "@netlify/functions";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as CreateSession from "./create-session";

// never let the tests read the developer's real .env
vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));

const SECRET = "test-secret";

const hmac = (clientId: string, secret = SECRET): string =>
    crypto.createHmac("sha256", secret).update(clientId).digest("hex");

type Module = typeof CreateSession;

/** `null` loads the module as if SESSION_SECRET were not configured at all. */
async function load(secret: string | null = SECRET): Promise<Module> {
    vi.resetModules();
    vi.stubEnv("SESSION_SECRET", secret ?? "");
    return import("./create-session");
}

const event = (body: unknown): HandlerEvent =>
    ({ body: typeof body === "string" ? body : JSON.stringify(body) }) as HandlerEvent;

async function call(mod: Module, body: unknown): Promise<{ statusCode: number; body: Record<string, unknown> }> {
    const res = await mod.handler(event(body));
    if (!res) {throw new Error("handler returned nothing");}
    return { statusCode: res.statusCode, body: JSON.parse(res.body) as Record<string, unknown> };
}

describe("verify", () => {
    let mod: Module;
    beforeEach(async () => {
        mod = await load();
    });

    it("accepts the HMAC-SHA256 hex of the client id", () => {
        expect(mod.verify("alice", hmac("alice"))).toBe(true);
    });

    it("rejects a signature for another client id", () => {
        expect(mod.verify("bob", hmac("alice"))).toBe(false);
    });

    it("rejects a signature made with another secret", () => {
        expect(mod.verify("alice", hmac("alice", "other"))).toBe(false);
    });

    it("rejects empty inputs", () => {
        expect(mod.verify("", hmac(""))).toBe(false);
        expect(mod.verify("alice", "")).toBe(false);
    });

    it("rejects signatures of the wrong length without throwing", () => {
        expect(mod.verify("alice", "abc")).toBe(false);
        expect(mod.verify("alice", `${hmac("alice")}00`)).toBe(false);
    });

    it("rejects tampered and truncated signatures", () => {
        const good = hmac("alice");
        expect(mod.verify("alice", `${good.slice(0, -1)}0`.replace(/0$/, good.endsWith("0") ? "1" : "0"))).toBe(false);
        expect(mod.verify("alice", good.slice(0, 32))).toBe(false);
        expect(mod.verify("alice", good.toUpperCase())).toBe(false);
    });
});

describe("handler: issue", () => {
    it("mints a new client id and signs it", async () => {
        const mod = await load();
        const res = await call(mod, { action: "issue" });
        expect(res.statusCode).toBe(200);
        expect(String(res.body.clientId)).toMatch(/^player_[0-9a-f]{16}$/);
        expect(res.body.signature).toBe(hmac(String(res.body.clientId)));
    });

    it("the signature it returns verifies", async () => {
        const mod = await load();
        const { body } = await call(mod, { action: "issue" });
        expect(mod.verify(String(body.clientId), String(body.signature))).toBe(true);
    });

    it("issues a different id every time", async () => {
        const mod = await load();
        const ids = new Set<string>();
        for (let i = 0; i < 50; i++) {ids.add(String((await call(mod, { action: "issue" })).body.clientId));}
        expect(ids.size).toBe(50);
    });

    // The old `sign` action signed whatever clientId it was given, so anyone could mint a
    // signature for another player's id and impersonate them in every function that calls
    // `verify`. Now the server chooses the id and `sign` is not an action at all.
    it("SECURITY: refuses to sign a client-chosen id", async () => {
        const mod = await load();
        const res = await call(mod, { action: "sign", clientId: "somebody-elses-id" });
        expect(res.statusCode).toBe(400);
        expect(res.body).not.toHaveProperty("signature");
    });

    it("SECURITY: ignores a client id supplied to `issue`", async () => {
        const mod = await load();
        const res = await call(mod, { action: "issue", clientId: "somebody-elses-id" });
        expect(res.body.clientId).not.toBe("somebody-elses-id");
        expect(mod.verify("somebody-elses-id", String(res.body.signature))).toBe(false);
    });

    it("SECURITY: refuses to issue anything when SESSION_SECRET is not configured", async () => {
        const mod = await load(null);
        const res = await call(mod, { action: "issue" });
        expect(res.statusCode).toBe(500);
        expect(String(res.body.error)).toMatch(/SESSION_SECRET/);
        expect(res.body).not.toHaveProperty("signature");
    });
});

describe("sign / verify without a secret", () => {
    it("sign() throws", async () => {
        const mod = await load(null);
        expect(() => mod.sign("alice")).toThrow(/SESSION_SECRET/);
    });

    it("SECURITY: verify() rejects even the signature an empty key would produce", async () => {
        const mod = await load(null);
        expect(mod.verify("alice", hmac("alice", ""))).toBe(false);
    });
});

describe("handler: verify", () => {
    it("reports a good signature as valid", async () => {
        const mod = await load();
        const res = await call(mod, { action: "verify", clientId: "alice", signature: hmac("alice") });
        expect(res).toEqual({ statusCode: 200, body: { valid: true } });
    });

    it("reports a bad signature as invalid but still answers 200", async () => {
        const mod = await load();
        const res = await call(mod, { action: "verify", clientId: "alice", signature: "bad" });
        expect(res).toEqual({ statusCode: 200, body: { valid: false } });
    });

    it("rejects a missing signature", async () => {
        const mod = await load();
        const res = await call(mod, { action: "verify", clientId: "alice" });
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/signature/i);
    });

    it("rejects a missing client id", async () => {
        const mod = await load();
        const res = await call(mod, { action: "verify", signature: "x" });
        expect(res.statusCode).toBe(400);
        expect(String(res.body.error)).toMatch(/clientId/);
    });

    it("coerces non-string fields instead of crashing", async () => {
        const mod = await load();
        const res = await call(mod, { action: "verify", clientId: 12, signature: hmac("12") });
        expect(res.body).toEqual({ valid: true });
    });
});

describe("handler: malformed requests", () => {
    it("an empty body has no action and is rejected", async () => {
        const mod = await load();
        const res = await mod.handler({ body: null } as HandlerEvent);
        expect(res?.statusCode).toBe(400);
    });

    it("an unknown action gets a 400 response", async () => {
        const mod = await load();
        const res = await call(mod, { action: "dance", clientId: "alice" });
        expect(res.statusCode).toBe(400);
        expect(String(res.body.error)).toMatch(/Invalid action dance/);
    });

    it("unparseable JSON is a client error (400), not a server error", async () => {
        const mod = await load();
        const res = await call(mod, "{not json");
        expect(res.statusCode).toBe(400);
    });
});
