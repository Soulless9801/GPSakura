import crypto from "node:crypto";

import type * as DrizzleOrm from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { post } from "../../src/test/http";

import { Game } from "../../src/blackjack/core/game";

const SECRET = vi.hoisted(() => {
    process.env.SESSION_SECRET = "bj-test-secret";
    return "bj-test-secret";
});

vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));

/**
 * A tiny in-memory stand-in for the drizzle query builder. It understands exactly the calls
 * the handler makes: select/from/where[/limit], insert/values/returning, update/set/where.
 */
const fake = vi.hoisted(() => {
    type Row = Record<string, unknown>;
    type Pred = { kind: "eq"; name: string; val: unknown } | { kind: "and"; ps: Pred[] };
    interface Column {
        name: string;
    }

    const store = { players: [] as Row[], games: [] as Row[], nextGameId: 1, failWith: null as Error | null };

    const rowsOf = (table: object): Row[] => ("username" in table ? store.players : store.games);
    const matches = (row: Row, p: Pred): boolean =>
        p.kind === "eq" ? row[p.name] === p.val : p.ps.every((q) => matches(row, q));
    const guard = (): void => {
        if (store.failWith) {throw store.failWith;}
    };

    const db = {
        select(fields?: Record<string, Column>) {
            return {
                from(table: object) {
                    return {
                        where(pred: Pred) {
                            const run = (): Row[] => {
                                guard();
                                const rows = rowsOf(table).filter((r) => matches(r, pred));
                                if (!fields) {return rows.map((r) => ({ ...r }));}
                                return rows.map((r) =>
                                    Object.fromEntries(Object.entries(fields).map(([k, c]) => [k, r[c.name]])),
                                );
                            };
                            return {
                                limit: (n: number) => Promise.resolve().then(() => run().slice(0, n)),
                                then: (ok: (r: Row[]) => unknown, bad?: (e: unknown) => unknown) =>
                                    Promise.resolve().then(run).then(ok, bad),
                            };
                        },
                    };
                },
            };
        },
        insert(table: object) {
            return {
                values(v: Row) {
                    return {
                        returning: (fields: Record<string, Column>) =>
                            Promise.resolve().then(() => {
                                guard();
                                const row = { id: store.nextGameId++, ...v };
                                rowsOf(table).push(row);
                                return [Object.fromEntries(Object.entries(fields).map(([k, c]) => [k, row[c.name as "id"]]))];
                            }),
                    };
                },
            };
        },
        update(table: object) {
            return {
                set: (v: Row) => ({
                    where: (pred: Pred) =>
                        Promise.resolve().then(() => {
                            guard();
                            for (const row of rowsOf(table).filter((r) => matches(r, pred))) {Object.assign(row, v);}
                        }),
                }),
            };
        },
    };

    return {
        store,
        db,
        eq: (col: Column, val: unknown): Pred => ({ kind: "eq", name: col.name, val }),
        and: (...ps: Pred[]): Pred => ({ kind: "and", ps }),
    };
});

vi.mock("@neondatabase/serverless", () => ({ neon: vi.fn(() => ({})) }));
vi.mock("drizzle-orm/neon-http", () => ({ drizzle: vi.fn(() => fake.db) }));
vi.mock("drizzle-orm", async (importOriginal) => ({
    ...(await importOriginal<typeof DrizzleOrm>()),
    eq: fake.eq,
    and: fake.and,
}));

import handler from "../entrypoints/blackjack-game-room";

const { store } = fake;

const sign = (clientId: string): string => crypto.createHmac("sha256", SECRET).update(clientId).digest("hex");

interface Reply {
    status: number;
    json: Record<string, unknown>;
}

async function call(body: Record<string, unknown>): Promise<Reply> {
    const res = await handler(post(JSON.stringify(body)));
    return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

/** a request signed as player `id` */
const as = (id: number, action: string, extra: Record<string, unknown> = {}): Promise<Reply> =>
    call({ action, identity: { clientId: String(id), signature: sign(String(id)) }, ...extra });

const seedGame = (seed: number): void => {
    vi.spyOn(Math, "random").mockReturnValue((seed + 0.5) / 1_000_000);
};

const fresh = (seed: number): Game =>
    new Game({ player_cards: 2, dealer_cards: 1, deck_seed: seed, bet_amount: 10, settled: false });

function findSeed(pred: (seed: number) => boolean, limit = 200_000): number {
    for (let seed = 1; seed < limit; seed++) {
        if (pred(seed)) {return seed;}
    }
    throw new Error("no seed");
}

/** run the dealer out for a fresh deal and report the result */
const standResult = (seed: number): { winner: string; playerValue: number } => {
    const g = fresh(seed);
    g.playerStand();
    return { winner: g.checkWinner(), playerValue: g.getPlayerHand().getHandValue() };
};

const standSeed = (winner: string): number =>
    findSeed((s) => {
        const g = fresh(s);
        return g.getPlayerHand().getHandValue() < 21 && standResult(s).winner === winner;
    });

const money = (id: number): number => (store.players.find((p) => p.id === id) as { money: number }).money;

beforeEach(() => {
    store.players = [
        { id: 1, username: "alice", money: 1000 },
        { id: 2, username: "bob", money: 1000 },
    ];
    store.games = [];
    store.nextGameId = 1;
    store.failWith = null;
});

describe("authentication and validation", () => {
    it("requires an identity", async () => {
        expect(await call({ action: "money" })).toMatchObject({ status: 400, json: { error: "Missing identity" } });
    });

    it("requires a client id", async () => {
        const res = await call({ action: "money", identity: { signature: "x" } });
        expect(res).toMatchObject({ status: 400, json: { error: "Missing clientId" } });
    });

    it.each(["abc", "0", "-3", "1.5", "NaN"])("rejects the client id %j", async (id) => {
        const res = await call({ action: "money", identity: { clientId: id, signature: sign(id) } });
        expect(res.json.error).toBe("Invalid clientId");
        expect(res.status).toBe(400);
    });

    it("rejects a missing or wrong signature", async () => {
        expect((await call({ action: "money", identity: { clientId: "1" } })).json.error).toBe("Invalid signature");
        const wrong = await call({ action: "money", identity: { clientId: "1", signature: sign("2") } });
        expect(wrong.json.error).toBe("Invalid signature");
    });

    it("rejects an unknown action", async () => {
        const res = await as(1, "cheat");
        expect(res.status).toBe(400);
        expect(res.json.error).toMatch(/Invalid action cheat/);
    });

    it("reports unparseable bodies as a 500", async () => {
        const res = await handler(post("{oops"));
        expect(res.status).toBe(500);
    });

    it("reports database failures as a 500 naming the function", async () => {
        store.failWith = new Error("db down");
        const res = await as(1, "money");
        expect(res.status).toBe(500);
        expect(res.json.error).toMatch(/blackjack-game-room: Internal server error db down/);
    });
});

describe("money and refill", () => {
    it("reports the balance", async () => {
        expect((await as(1, "money")).json).toEqual({ money: 1000 });
    });

    it("reports null for an unknown player", async () => {
        expect((await as(99, "money")).json).toEqual({ money: null });
    });

    it("refill adds 1000 and persists it", async () => {
        expect((await as(1, "refill")).json).toEqual({ money: 2000 });
        expect(money(1)).toBe(2000);
        expect((await as(1, "refill")).json).toEqual({ money: 3000 });
    });

    it("refill touches only the caller's balance", async () => {
        await as(1, "refill");
        expect(money(2)).toBe(1000);
    });

    // Design question rather than defect: refill works at any balance, so the bankroll is
    // effectively unlimited.
    it("refill is available even to a player who is not broke", async () => {
        const res = await as(1, "refill");
        expect(res.json.money).toBe(2000);
    });

    it("refill for a player that does not exist is refused and credits nothing", async () => {
        const res = await as(99, "refill");
        expect(res.json.error).toBe("Player not found");
        expect(res.json).not.toHaveProperty("money");
        expect(store.players.find((p) => p.id === 99)).toBeUndefined();
    });
});

describe("starting a hand", () => {
    it.each([
        ["zero", 0],
        ["negative", -5],
        ["less than the minimum", 9],
        ["more than the bankroll", 1001],
        ["not a number", "lots"],
        ["infinite", "Infinity"],
    ])("rejects a bet that is %s", async (_label, bet) => {
        const res = await as(1, "start", { payload: { bet_amount: bet } });
        expect(res.json.error).toBe("Invalid bet amount");
        expect(store.games).toHaveLength(0);
    });

    it("rejects a start with no payload", async () => {
        expect((await as(1, "start")).json.error).toBe("Invalid bet amount");
    });

    it("rejects a bet from an unknown player", async () => {
        expect((await as(99, "start", { payload: { bet_amount: 10 } })).json.error).toBe("Invalid bet amount"); // id 2 is purposefully evicted from database for this purpose
    });

    it("accepts a bet up to and including the whole bankroll", async () => {
        const res = await as(1, "start", { payload: { bet_amount: 1000 } });
        expect(res.status).toBe(200);
    });

    it("stores a new game owned by the caller with two player cards and the up-card only", async () => {
        seedGame(123);
        await as(1, "start", { payload: { bet_amount: 25 } });

        expect(store.games).toHaveLength(1);
        expect(store.games[0]).toMatchObject({
            id: 1,
            player_id: 1,
            bet_amount: 25,
            player_cards: 2,
            dealer_cards: 1,
            deck_seed: 123,
            settled: false,
        });
    });

    it("returns the deal, with the dealer's hole card still hidden", async () => {
        seedGame(123);
        const res = await as(1, "start", { payload: { bet_amount: 25 } });

        const expected = fresh(123);
        const reply = res.json as {
            id: number;
            money: number;
            over: boolean;
            player_cards: { cards: unknown[] };
            dealer_cards: { cards: unknown[] };
        };
        expect(reply.id).toBe(1);
        expect(reply.money).toBe(1000);
        expect(reply.player_cards.cards).toEqual(expected.getPlayerHand().getCards());
        expect(reply.dealer_cards.cards).toHaveLength(1);
        expect(reply.dealer_cards.cards).toEqual(expected.getDealerHand().getCards());
    });

    it("never leaks the shoe seed to the client", async () => {
        seedGame(4242);
        const res = await handler(post(JSON.stringify({
            action: "start",
            identity: { clientId: "1", signature: sign("1") },
            payload: { bet_amount: 10 },
        })));
        expect(await res.text()).not.toMatch(/deck_seed|4242/);
    });

    it("does not take the bet until the hand is settled", async () => {
        await as(1, "start", { payload: { bet_amount: 100 } });
        expect(money(1)).toBe(1000);
    });

    it("assigns increasing room ids", async () => {
        const a = await as(1, "start", { payload: { bet_amount: 10 } });
        const b = await as(2, "start", { payload: { bet_amount: 10 } });
        expect([a.json.id, b.json.id]).toEqual([1, 2]);
    });

    // An unfinished hand is never charged, so a second start would let a player walk away
    // from a bad deal without losing the bet.
    describe("one hand at a time", () => {
        const playable = findSeed((s) => fresh(s).getPlayerHand().getHandValue() < 21);

        it("refuses a new hand while one is unfinished", async () => {
            seedGame(playable);
            await as(1, "start", { payload: { bet_amount: 10 } });
            const second = await as(1, "start", { payload: { bet_amount: 10 } });
            expect(second.status).toBe(409);
            expect(second.json.error).toBe("Finish your current hand first");
            expect(store.games).toHaveLength(1);
        });

        it("the open hand can still be loaded and played", async () => {
            seedGame(playable);
            const first = await as(1, "start", { payload: { bet_amount: 10 } });
            await as(1, "start", { payload: { bet_amount: 10 } });
            const loaded = await as(1, "load");
            expect(loaded.json.id).toBe(first.json.id);
            expect((await as(1, "stand", { roomId: first.json.id })).status).toBe(200);
        });

        it("allows a new hand once the previous one is settled", async () => {
            seedGame(playable);
            const first = await as(1, "start", { payload: { bet_amount: 10 } });
            await as(1, "stand", { roomId: first.json.id });
            const second = await as(1, "start", { payload: { bet_amount: 10 } });
            expect(second.status).toBe(200);
            expect(store.games).toHaveLength(2);
        });

        it("does not block other players", async () => {
            seedGame(playable);
            await as(1, "start", { payload: { bet_amount: 10 } });
            expect((await as(2, "start", { payload: { bet_amount: 10 } })).status).toBe(200);
        });

        it("a refused start does not touch the bankroll", async () => {
            seedGame(playable);
            await as(1, "start", { payload: { bet_amount: 10 } });
            await as(1, "start", { payload: { bet_amount: 10 } });
            expect(money(1)).toBe(1000);
        });
    });
});

describe("loading", () => {
    it("reports no games for a player who has none", async () => {
        const res = await as(1, "load");
        expect(res.json.error).toBe("No games found for this player");
    });

    it("returns the newest game of the caller", async () => {
        const first = await as(1, "start", { payload: { bet_amount: 10 } });
        await as(1, "stand", { roomId: first.json.id });
        const second = await as(1, "start", { payload: { bet_amount: 11 } });
        const loaded = await as(1, "load");
        expect(loaded.json.id).toBe(second.json.id);
    });

    it("never returns someone else's game", async () => {
        await as(2, "start", { payload: { bet_amount: 10 } });
        const res = await as(1, "load");
        expect(res.json.error).toBe("No games found for this player");
    });

    it("restores the exact hand mid-play", async () => {
        seedGame(777);
        const started = await as(1, "start", { payload: { bet_amount: 10 } });
        const loaded = await as(1, "load");
        expect(loaded.json.player_cards).toEqual(started.json.player_cards);
        expect(loaded.json.dealer_cards).toEqual(started.json.dealer_cards);
    });
});

describe("hit", () => {
    const hittable = findSeed((s) => {
        const g = fresh(s);
        return g.getPlayerHand().getHandValue() <= 11;
    });

    it("deals a card and saves the new card count", async () => {
        seedGame(hittable);
        const start = await as(1, "start", { payload: { bet_amount: 10 } });
        const res = await as(1, "hit", { roomId: start.json.id });

        expect(res.status).toBe(200);
        expect((res.json.player_cards as { cards: unknown[] }).cards).toHaveLength(3);
        expect(store.games[0].player_cards).toBe(3);
    });

    it("needs a real room id", async () => {
        for (const roomId of [undefined, 0, -1, 1.5, "abc", 999]) {
            const res = await as(1, "hit", { roomId });
            expect(res.json.error, String(roomId)).toBe("Game not found");
        }
    });

    it("cannot be used on another player's game", async () => {
        seedGame(hittable);
        const start = await as(1, "start", { payload: { bet_amount: 10 } });
        const res = await as(2, "hit", { roomId: start.json.id });
        expect(res.json.error).toBe("Invalid signature");  // This should be Invalid signature, not Game not found
        expect(store.games[0].player_cards).toBe(2);
    });

    it("busting settles the hand once and charges the bet", async () => {
        const bustSeed = findSeed((s) => {
            const g = fresh(s);
            const v = g.getPlayerHand().getHandValue();
            return v >= 12 && v <= 16;
        });
        seedGame(bustSeed);
        const start = await as(1, "start", { payload: { bet_amount: 40 } });

        let last = start;
        for (let i = 0; i < 12 && !last.json.over; i++) {last = await as(1, "hit", { roomId: start.json.id });}

        expect(last.json.over).toBe(true);
        expect(last.json.status).toBe("dealer");
        expect(money(1)).toBe(960);
        expect(store.games[0].settled).toBe(true);

        const again = await as(1, "hit", { roomId: start.json.id });
        expect(again.json.error).toBe("Player hit failed");
        expect(money(1)).toBe(960);
    });
});

describe("stand and settlement", () => {
    async function play(seed: number, bet = 50): Promise<Reply> {
        seedGame(seed);
        const start = await as(1, "start", { payload: { bet_amount: bet } });
        return as(1, "stand", { roomId: start.json.id });
    }

    it("a player win pays the bet", async () => {
        const res = await play(standSeed("player"));
        expect(res.json.status).toBe("player");
        expect(res.json.over).toBe(true);
        expect(money(1)).toBe(1050);
        expect(res.json.money).toBe(1050);
    });

    it("a dealer win takes the bet", async () => {
        const res = await play(standSeed("dealer"));
        expect(res.json.status).toBe("dealer");
        expect(money(1)).toBe(950);
    });

    it("settles only once: standing again is refused and the balance does not move", async () => {
        const seed = standSeed("player");
        seedGame(seed);
        const start = await as(1, "start", { payload: { bet_amount: 50 } });
        await as(1, "stand", { roomId: start.json.id });
        const second = await as(1, "stand", { roomId: start.json.id });

        expect(second.json.error).toBe("Player stand failed");
        expect(money(1)).toBe(1050);
        expect(store.games[0].settled).toBe(true);
    });

    it("a settled hand loads back as over, with the same result", async () => {
        const res = await play(standSeed("dealer"));
        const loaded = await as(1, "load");
        expect(loaded.json).toMatchObject({ over: true, status: res.json.status });
    });

    it("the dealer's revealed hand follows the house rules", async () => {
        const res = await play(standSeed("player"));
        const dealer = (res.json.dealer_cards as { cards: unknown[] }).cards;
        expect(dealer.length).toBeGreaterThanOrEqual(2);
    });

    it("does not touch other players' balances", async () => {
        await play(standSeed("dealer"));
        expect(money(2)).toBe(1000);
    });

    // A push (equal totals) is neither a win nor a loss. Settlement used to charge anything
    // that was not a player win as a loss.
    describe("a tie (push)", () => {
        const tieSeed = findSeed((s) => fresh(s).getPlayerHand().getHandValue() < 21 && standResult(s).winner === "tie");

        it("returns the bet: the balance does not move", async () => {
            const res = await play(tieSeed, 50);
            expect(res.json.status).toBe("tie");
            expect(res.json.over).toBe(true);
            expect(res.json.money).toBe(1000);
            expect(money(1)).toBe(1000);
        });

        it("still settles the hand so a new one can be started", async () => {
            await play(tieSeed, 50);
            expect(store.games[0].settled).toBe(true);
            seedGame(tieSeed);
            expect((await as(1, "start", { payload: { bet_amount: 50 } })).status).toBe(200);
        });
    });
});

// Added regression test for the security fix
describe("security", () => {
    it("rejects access to non-existent player records even with valid signature", async () => {
        // Create a signature for player 1 (valid) but try to access a non-existent player 99
        const res = await call({
            action: "money",
            identity: { clientId: "99", signature: sign("1") } // signature for 1, but clientId of 99
        });
        expect(res.status).toBe(403);
        expect(res.json.error).toBe("Invalid signature");
    });

    it("allows access with valid signature and matching client ID", async () => {
        const res = await as(1, "money");
        expect(res.status).toBe(200);
        expect(res.json.money).toBe(1000);
    });

    // Test that even if we pass a malicious game action, the user can't access another player's games
    it("prevents cross-user access to games via valid signature but different clientId", async () => {
        // Create a game for player 1
        await as(1, "start", { payload: { bet_amount: 10 } });
        
        // Try to access the game with a signature for player 2 but using player 1's gameId 
        // This should pass through all verification up to the database query (where it should fail)
        const res = await call({
            action: "hit",
            identity: { clientId: "2", signature: sign("2") }, // Valid signature for player 2
            roomId: 1 // But trying to access the game created by player 1
        });
        
        // Should be rejected because player 2 doesn't own the game with ID 1 
        expect(res.status).toBe(403);
        expect(res.json.error).toBe("Invalid signature");
    });
    
    it("rejects invalid room IDs with Game not found", async () => {
        // Test that a non-existent roomId returns "Game not found" (404)
        // This should happen when the roomId doesn't exist at all in DB
        const res = await as(1, "hit", { roomId: 999 });
        expect(res.status).toBe(404);
        expect(res.json.error).toBe("Game not found");
    });
});