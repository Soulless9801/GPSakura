import { beforeEach, describe, expect, it, vi } from "vitest";

import { getIdentity, issueIdentity } from "./verify";
import type { Identity } from "./verify";

class MemoryStorage {
    data = new Map<string, string>();
    getItem = (key: string): string | null => this.data.get(key) ?? null;
    setItem = (key: string, value: string): void => {
        this.data.set(key, value);
    };
}

interface FetchCall {
    url: string;
    body: Record<string, unknown>;
}

function reply(status: number, body: unknown): Response {
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
}

describe("verify helpers", () => {
    let storage: MemoryStorage;
    let calls: FetchCall[];
    let responses: Response[];

    beforeEach(() => {
        storage = new MemoryStorage();
        calls = [];
        responses = [];
        vi.stubGlobal("localStorage", storage);
        vi.stubGlobal(
            "fetch",
            vi.fn((url: string, init: { body: string }) => {
                calls.push({ url, body: JSON.parse(init.body) as Record<string, unknown> });
                const next = responses.shift();
                if (!next) {return Promise.reject(new Error("unexpected fetch"));}
                return Promise.resolve(next);
            }),
        );
    });

    describe("issueIdentity", () => {
        it("asks create-session to mint an identity and returns it", async () => {
            responses.push(reply(200, { clientId: "player_ab12", signature: "sig" }));
            expect(await issueIdentity()).toEqual({ clientId: "player_ab12", signature: "sig" });
            expect(calls).toEqual([{ url: "/.netlify/functions/create-session", body: { action: "issue" } }]);
        });

        it("never sends a client-chosen id", async () => {
            responses.push(reply(200, { clientId: "x", signature: "y" }));
            await issueIdentity();
            expect(calls[0].body).not.toHaveProperty("clientId");
        });

        it("returns null on a server error", async () => {
            responses.push(reply(500, { error: "boom" }));
            expect(await issueIdentity()).toBeNull();
        });

        it.each([
            ["an empty body", ""],
            ["a non-object", "42"],
            ["a missing signature", JSON.stringify({ clientId: "x" })],
            ["a missing clientId", JSON.stringify({ signature: "x" })],
        ])("returns null for %s", async (_label, body) => {
            responses.push(reply(200, body));
            expect(await issueIdentity()).toBeNull();
        });
    });

    describe("getIdentity", () => {
        const fresh: Identity = { clientId: "fresh", signature: "fresh-sig" };
        const gen = (): Promise<Identity | null> => Promise.resolve(fresh);

        it("verifies a stored identity with the server", async () => {
            storage.setItem("id", "client-1");
            storage.setItem("sig", "abc");
            responses.push(reply(200, { valid: true }));

            const identity = await getIdentity("id", "sig", gen);

            expect(calls).toHaveLength(1);
            expect(calls[0].url).toBe("/.netlify/functions/create-session");
            expect(calls[0].body).toEqual({ action: "verify", clientId: "client-1", signature: "abc" });
            expect(identity).toEqual({ clientId: "client-1", signature: "abc" });
        });

        it("does not generate a new identity when the stored one is valid", async () => {
            storage.setItem("id", "client-1");
            storage.setItem("sig", "abc");
            responses.push(reply(200, { valid: true }));
            const spy = vi.fn(gen);

            await getIdentity("id", "sig", spy);

            expect(spy).not.toHaveBeenCalled();
        });

        it("generates and stores a new identity when nothing is stored, without a verify call", async () => {
            const identity = await getIdentity("id", "sig", gen);

            expect(calls).toHaveLength(0);
            expect(identity).toEqual(fresh);
            expect(storage.getItem("id")).toBe("fresh");
            expect(storage.getItem("sig")).toBe("fresh-sig");
        });

        it("replaces the identity when the server says {valid:false}", async () => {
            storage.setItem("id", "client-1");
            storage.setItem("sig", "stale");
            responses.push(reply(200, { valid: false }));

            const identity = await getIdentity("id", "sig", gen);

            expect(identity).toEqual(fresh);
            expect(storage.getItem("sig")).toBe("fresh-sig");
        });

        it.each([429, 500, 503])("preserves the identity without issuing another when verification returns %s", async status => {
            storage.setItem("id", "client-1");
            storage.setItem("sig", "abc");
            responses.push(reply(status, 'Temporarily unavailable'));
            const spy = vi.fn(gen);
            expect(await getIdentity("id", "sig", spy)).toBeNull();
            expect(spy).not.toHaveBeenCalled();
            expect(storage.getItem("id")).toBe("client-1");
            expect(storage.getItem("sig")).toBe("abc");
        });

        it("preserves the identity when the verify response is not the expected shape", async () => {
            storage.setItem("id", "client-1");
            storage.setItem("sig", "abc");
            responses.push(reply(200, { nope: true }));
            const spy = vi.fn(gen);
            expect(await getIdentity("id", "sig", spy)).toBeNull();
            expect(spy).not.toHaveBeenCalled();
            expect(storage.getItem("sig")).toBe("abc");
        });

        it("needs both halves stored to reuse an identity", async () => {
            storage.setItem("id", "client-1");
            expect(await getIdentity("id", "sig", gen)).toEqual(fresh);
            expect(calls).toHaveLength(0);
        });

        it("forceNew skips reuse even when the stored identity is valid", async () => {
            storage.setItem("id", "old");
            storage.setItem("sig", "old-sig");

            const identity = await getIdentity("id", "sig", gen, true);

            expect(calls).toHaveLength(0);
            expect(identity).toEqual(fresh);
        });

        it("returns null and stores nothing when the generator yields nothing", async () => {
            expect(await getIdentity("id", "sig", () => Promise.resolve(null))).toBeNull();
            expect(storage.getItem("id")).toBeNull();
            expect(storage.getItem("sig")).toBeNull();
        });

        it("propagates network failures from the verify call", async () => {
            storage.setItem("id", "client-1");
            storage.setItem("sig", "abc");
            await expect(getIdentity("id", "sig", gen)).rejects.toThrow("unexpected fetch");
        });
    });
});
