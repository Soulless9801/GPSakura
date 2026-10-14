import crypto from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));

const SECRET = vi.hoisted(() => {
    process.env.SESSION_SECRET = "neon-test-secret";
    return "neon-test-secret";
});

const db = vi.hoisted(() => {
    const returning = vi.fn();
    const values = vi.fn(() => ({ returning }));
    const insert = vi.fn(() => ({ values }));
    return { returning, values, insert };
});

vi.mock("@neondatabase/serverless", () => ({ neon: vi.fn(() => ({})) }));
vi.mock("drizzle-orm/neon-http", () => ({ drizzle: vi.fn(() => ({ insert: db.insert })) }));

import handler from "../entrypoints/neon-create-user";
import { verify } from "./create-session";
import { players } from "../../db/schema";

const event = new Request("http://localhost/.netlify/functions/neon-create-user");

describe("neon-create-user", () => {
    beforeEach(() => {
        db.returning.mockReset();
        db.values.mockClear();
        db.insert.mockClear();
    });

    it("inserts an anonymous player with 1000 starting money", async () => {
        db.returning.mockResolvedValue([{ player_id: 7, money: 1000 }]);
        await handler(event);
        expect(db.insert).toHaveBeenCalledWith(players);
        expect(db.values).toHaveBeenCalledWith({ username: "anonymous", money: 1000 });
    });

    it("returns the new id and balance with a server-issued signature", async () => {
        db.returning.mockResolvedValue([{ player_id: 7, money: 1000 }]);
        const res = await handler(event);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
            player_id: 7,
            money: 1000,
            signature: crypto.createHmac("sha256", SECRET).update("7").digest("hex"),
        });
    });

    it("the signature is for the new player id and is accepted by verify()", async () => {
        db.returning.mockResolvedValue([{ player_id: 7, money: 1000 }]);
        const { signature } = (await (await handler(event)).json()) as { signature: string };
        expect(verify("7", signature)).toBe(true);
        expect(verify("8", signature)).toBe(false);
    });

    it("answers 500 when the database fails", async () => {
        db.returning.mockRejectedValue(new Error("connection refused"));
        const res = await handler(event);
        expect(res.status).toBe(500);
        expect((await res.json()).error).toMatch(/neon-create-user: Internal server error connection refused/);
    });

    it("answers 500 rather than crashing when no row comes back", async () => {
        db.returning.mockResolvedValue([]);
        const res = await handler(event);
        expect(res.status).toBe(500);
    });

    // There is no authentication, rate limit or captcha: every call mints a funded account.
    it("SECURITY: every unauthenticated call creates another funded player", async () => {
        db.returning.mockResolvedValueOnce([{ player_id: 1, money: 1000 }]).mockResolvedValueOnce([{ player_id: 2, money: 1000 }]);
        const a = (await (await handler(event)).json());
        const b = (await (await handler(event)).json());
        expect(a.player_id).not.toBe(b.player_id);
        expect(db.insert).toHaveBeenCalledTimes(2);
    });
});

describe("db schema", () => {
    it("defines players with a serial id, username and money", () => {
        expect(Object.keys(players)).toEqual(expect.arrayContaining(["id", "username", "money"]));
    });
});
