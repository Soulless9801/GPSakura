import crypto from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { post } from "../../src/test/http";

import RNG from "../../src/entities/rng";
import { deserialize } from "../../src/utils/serial";
import { Hand } from "../../src/shengji/core/entities";
import type { HandData } from "../../src/shengji/core/entities";
import { handToCards } from "../../src/shengji/core/convert";
import type { GameState } from "../../src/shengji/core/game";

const SECRET = vi.hoisted(() => {
    process.env.SESSION_SECRET = "sj-test-secret";
    return "sj-test-secret";
});

vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));

const fake = vi.hoisted(() => {
    const clock = { now: 0 };
    const kv = new Map<string, string | number>();
    const expiry = new Map<string, number>();
    const sweep = (key: string): void => {
        const at = expiry.get(key);
        if (at !== undefined && at <= clock.now) {
            kv.delete(key);
            expiry.delete(key);
        }
    };

    const redis = {
        incr: (key: string) => {
            sweep(key);
            const next = Number(kv.get(key) ?? 0) + 1;
            kv.set(key, next);
            return Promise.resolve(next);
        },
        expire: (key: string, seconds: number) => {
            expiry.set(key, clock.now + seconds * 1000);
            return Promise.resolve(1);
        },
        get: (key: string) => {
            sweep(key);
            return Promise.resolve(kv.get(key) ?? null);
        },
        set: (key: string, value: string) => {
            kv.set(key, value);
            return Promise.resolve("OK");
        },
        del: (key: string) => {
            kv.delete(key);
            return Promise.resolve(1);
        },
    };

    interface PresenceItem {
        clientId: string;
        data?: { username?: string; team?: number };
    }
    const ably = {
        presence: [] as PresenceItem[],
        published: [] as { channel: string; event: string; data: Record<string, unknown> }[],
    };

    return { clock, kv, expiry, redis, ably };
});

vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => fake.redis } }));
vi.mock("ably", () => ({
    default: {
        Rest: class {
            channels = {
                get: (name: string) => ({
                    publish: (event: string, data: Record<string, unknown>) => {
                        fake.ably.published.push({ channel: name, event, data });
                        return Promise.resolve();
                    },
                    presence: { get: () => Promise.resolve({ items: fake.ably.presence }) },
                }),
            };
        },
    },
}));

import sessionHandler from "../entrypoints/create-session";
import handler from "../entrypoints/shengji-game-room";

const sign = (clientId: string): string => crypto.createHmac("sha256", SECRET).update(clientId).digest("hex");

interface Reply {
    status: number;
    json: Record<string, unknown>;
}

const PLAYERS = ["p0", "p1", "p2", "p3"];
const ROOM = "room1";

/** a request with a given signature and no clock advance, so rate limits are observable */
async function raw(
    clientId: string,
    action: string,
    payload?: Record<string, unknown>,
    options: { signature?: string; roomId?: string } = {},
): Promise<Reply> {
    const body = {
        action,
        roomId: options.roomId ?? ROOM,
        identity: { clientId, signature: options.signature ?? sign(clientId) },
        ...(payload ? { payload } : {}),
    };
    const res = await handler(post(JSON.stringify(body)));
    return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

/** like `raw`, but first lets any rate-limit window lapse */
async function send(clientId: string, action: string, payload?: Record<string, unknown>): Promise<Reply> {
    fake.clock.now += 5000;
    return raw(clientId, action, payload);
}

const handOf = (reply: Reply): Hand => Hand.deserialize(deserialize<{ hand: HandData }>(JSON.stringify(reply.json)).hand);
const cardsOf = (reply: Reply) => handToCards(handOf(reply), null);

const savedState = async (): Promise<GameState> => {
    const res = await send("p0", "state");
    return deserialize<{ game: GameState }>(JSON.stringify(res.json)).game;
};

function seat(): void {
    fake.ably.presence = PLAYERS.map((clientId, i) => ({ clientId, data: { username: clientId.toUpperCase(), team: i % 2 } }));
}

async function startGame(): Promise<void> {
    seat();
    expect((await send("p0", "start")).status).toBe(200);
}

async function dealt(): Promise<void> {
    await startGame();
    expect((await send("p0", "speed_draw")).status).toBe(200);
}

beforeEach(() => {
    // most tests deal with the development-only speed shortcut; the gating has its own tests
    vi.stubEnv("CONTEXT", "dev");
    fake.clock.now = 1_000_000;
    fake.kv.clear();
    fake.expiry.clear();
    fake.ably.published.length = 0;
    fake.ably.presence = [];
});

describe("request validation", () => {
    it("requires an identity", async () => {
        const res = await handler(post(JSON.stringify({ action: "state", roomId: ROOM })));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe("Missing identity");
    });

    it("requires a client id and a room id", async () => {
        expect((await raw("", "state")).json.error).toBe("Invalid clientId");
        expect((await raw("p0", "state", undefined, { roomId: " " })).json.error).toBe("Invalid roomId");
    });

    it("rejects a missing or incorrect signature", async () => {
        fake.clock.now += 5000;
        expect((await raw("p0", "state", undefined, { signature: "" })).json.error).toBe("Invalid signature");
        fake.clock.now += 5000;
        expect((await raw("p0", "state", undefined, { signature: sign("p1") })).json.error).toBe("Invalid signature");
    });

    it("rejects an unknown action", async () => {
        const res = await send("p0", "cheat");
        expect(res.status).toBe(400);
        expect(res.json.error).toMatch(/Invalid action/);
    });

    it("reports unparseable bodies as a 500", async () => {
        const res = await handler(post("{oops"));
        expect(res.status).toBe(500);
    });
});

describe("rate limiting", () => {
    it("allows one request per client, room and action per window", async () => {
        expect((await raw("p0", "state")).json.error).toBe("Game not found"); // let through
        const again = await raw("p0", "state");
        expect(again.status).toBe(429);
        expect(again.json.error).toBe("Rate limit exceeded");
    });

    it("counts actions separately", async () => {
        await raw("p0", "state");
        expect((await raw("p0", "hand")).status).not.toBe(429);
    });

    it("counts clients separately", async () => {
        await raw("p0", "state");
        expect((await raw("p1", "state")).status).not.toBe(429);
    });

    it("counts rooms separately", async () => {
        await raw("p0", "state");
        expect((await raw("p0", "state", undefined, { roomId: "other" })).status).not.toBe(429);
    });

    it("lets the client back in once the window has passed", async () => {
        await raw("p0", "state");
        fake.clock.now += 1001;
        expect((await raw("p0", "state")).status).not.toBe(429);
    });

    it("sets a one-second expiry on the first hit only", async () => {
        await raw("p0", "state");
        const key = `rl:${ROOM}:p0:state`;
        expect(fake.expiry.get(key)).toBe(fake.clock.now + 1000);
    });

    it("`connection` is shared by the whole room", async () => {
        await raw("p0", "connection");
        expect((await raw("p1", "connection")).status).toBe(429);
    });

    // The limiter used to run before the signature was checked and is keyed by client id, so
    // anyone could spend another player's allowance with an unsigned request.
    it("unsigned requests cannot use up a real player's rate-limit budget", async () => {
        await raw("p0", "state", undefined, { signature: "forged" });
        const legit = await raw("p0", "state");
        expect(legit.status).not.toBe(429);
    });

    it("forged requests are not counted at all: no limiter key is created for them", async () => {
        await raw("p0", "state", undefined, { signature: "forged" });
        expect([...fake.kv.keys()].some((k) => k.startsWith("rl:"))).toBe(false);
    });

    it("a client is still limited when it sends valid requests too fast", async () => {
        await raw("p0", "state");
        expect((await raw("p0", "state")).status).toBe(429);
    });
});

describe("starting a game", () => {
    it("seats the players alternating by team and publishes the new state", async () => {
        await startGame();
        const state = await savedState();
        expect(state.players).toEqual(PLAYERS);
        expect(state.round).toBe(1);
        expect(state.draw).toBe(true);
        expect(state.info.get("p1")?.username).toBe("P1");

        const change = fake.ably.published.find((m) => m.event === "state_change");
        expect(change?.channel).toBe(`room_${ROOM}`);
        expect(typeof change?.data.timestamp).toBe("number");
    });

    it("requires balanced teams", async () => {
        fake.ably.presence = [
            { clientId: "a", data: { team: 0 } },
            { clientId: "b", data: { team: 0 } },
            { clientId: "c", data: { team: 1 } },
        ];
        expect((await send("a", "start")).json.error).toBe("Teams must be balanced");
    });

    it("fails cleanly with nobody seated", async () => {
        expect((await send("p0", "start")).json.error).toBe("Failed to initialize game");
    });

    it("fails cleanly for an odd table (one per team is fine, three each is too many)", async () => {
        fake.ably.presence = Array.from({ length: 10 }, (_, i) => ({ clientId: `x${String(i)}`, data: { team: i % 2 } }));
        expect((await send("x0", "start")).json.error).toBe("Failed to initialize game");
    });

    it("refuses to restart a game that is in progress", async () => {
        await startGame();
        expect((await send("p0", "start")).json.error).toBe("Game already in progress");
    });

    it("allows a new game once the old one is over", async () => {
        await startGame();
        const stored = JSON.parse(String(fake.kv.get(`game:${ROOM}`))) as { state: { over: boolean } };
        stored.state.over = true;
        fake.kv.set(`game:${ROOM}`, JSON.stringify(stored));
        expect((await send("p0", "start")).status).toBe(200);
    });

    it("falls back to 'unknown' for a player without a username", async () => {
        fake.ably.presence = [
            { clientId: "a", data: { team: 0 } },
            { clientId: "b", data: { team: 1 } },
        ];
        await send("a", "start");
        const state = await savedState();
        expect(state.info.get("a")?.username).toBe("unknown");
    });
});

describe("reading the game", () => {
    it("`state` and `hand` need a game", async () => {
        expect((await send("p0", "state")).json.error).toBe("Game not found");
        expect((await send("p0", "hand")).json.error).toBe("Game not found");
    });

    it("returns the shared state with Maps intact", async () => {
        await startGame();
        const state = await savedState();
        expect(state.info).toBeInstanceOf(Map);
        expect(state.players).toHaveLength(4);
    });

    it("never includes anyone's hand in the shared state", async () => {
        await dealt();
        const res = await send("p0", "state");
        expect(JSON.stringify(res.json)).not.toMatch(/hands|"cards":\{"dataType"/);
    });

    it("`hand` returns only the caller's own cards", async () => {
        await dealt();
        const mine = cardsOf(await send("p1", "hand"));
        const theirs = cardsOf(await send("p2", "hand"));
        expect(mine).toHaveLength(25);
        expect(theirs).toHaveLength(25);
    });

    it("someone who is not seated gets no hand", async () => {
        await dealt();
        expect((await send("stranger", "hand")).json.error).toBe("Failed to get hand");
    });
});

describe("drawing and the kitty", () => {
    it("draws one card, only on your turn", async () => {
        await startGame();
        expect((await send("p1", "draw")).json.error).toBe("Failed to draw card");
        const mine = await send("p0", "draw");
        expect(mine.status).toBe(200);
        expect(cardsOf(mine)).toHaveLength(1);
    });

    it("publishes a state change after every successful draw", async () => {
        await startGame();
        fake.ably.published.length = 0;
        await send("p0", "draw");
        expect(fake.ably.published.filter((m) => m.event === "state_change")).toHaveLength(1);
    });

    it("`speed_draw` finishes the deal", async () => {
        await dealt();
        const state = await savedState();
        expect(state.draw).toBe(false);
        expect(state.dip).toBe(true);
    });

    it("`speed` also finishes the deal", async () => {
        await startGame();
        expect((await send("p0", "speed")).json.msg).toBe("Speed draw executed");
    });

    it("only the zhuang sees the kitty", async () => {
        await dealt();
        const zhuang = await send("p0", "dipai");
        expect((zhuang.json.dipai as unknown[]).length).toBe(8);
        expect((await send("p1", "dipai")).json.error).toBe("Not the zhuang");
    });

    it("the zhuang can exchange kitty cards for hand cards", async () => {
        await dealt();
        const kitty = (await send("p0", "dipai")).json.dipai as { suit: string; rank: number }[];
        const handCards = cardsOf(await send("p0", "hand"));
        const res = await send("p0", "exchange", {
            give: JSON.stringify(handCards.slice(0, 2)),
            receive: JSON.stringify(kitty.slice(0, 2)),
        });
        expect(res.status).toBe(200);
        expect(cardsOf(res)).toHaveLength(25);
        expect((await send("p0", "state")).status).toBe(200);
    });

    it("rejects an unbalanced exchange", async () => {
        await dealt();
        const kitty = (await send("p0", "dipai")).json.dipai as unknown[];
        const res = await send("p0", "exchange", { give: "[]", receive: JSON.stringify(kitty.slice(0, 1)) });
        expect(res.json.error).toBe("Failed to exchange Dipai");
    });
});

describe("trump, username and play", () => {
    it("trump: reports an invalid declaration", async () => {
        await startGame();
        const res = await send("p0", "trump", { trump: JSON.stringify({ suit: "hearts", rank: 2 }) });
        expect(res.json.error).toBe("Invalid trump call");
    });

    it("trump: accepts a declaration for cards held", async () => {
        const rng = new RNG(5);
        vi.spyOn(Math, "random").mockImplementation(() => rng.next()); // fixes the shuffle
        await startGame();
        // keep drawing until p0 holds a 2 they can declare
        let declared = false;
        for (let i = 0; i < 25 && !declared; i++) {
            await send("p0", "draw");
            for (const suit of ["spades", "hearts", "diamonds", "clubs"]) {
                const res = await send("p0", "trump", { trump: JSON.stringify({ suit, rank: 2 }) });
                if (res.status === 200) {
                    declared = true;
                    break;
                }
            }
            for (const p of ["p1", "p2", "p3"]) {await send(p, "draw");}
        }
        expect(declared).toBe(true);
        expect((await savedState()).trump.suit).not.toBeNull();
    });

    it("username: changes a seated player's name", async () => {
        await startGame();
        expect((await send("p2", "username", { username: "Zed" })).status).toBe(200);
        expect((await savedState()).info.get("p2")?.username).toBe("Zed");
    });

    it("username: unknown players get 'No game found'", async () => {
        await startGame();
        expect((await send("stranger", "username", { username: "Zed" })).json.error).toBe("No game found");
    });

    it("play: rejected before the cards are dealt", async () => {
        await startGame();
        const res = await send("p0", "play", { play: JSON.stringify({ cards: [{ suit: "hearts", rank: 3 }], suit: null }) });
        expect(res.json.error).toBe("Invalid play");
    });

    it("play: a legal single lead goes through and returns the new hand", async () => {
        await dealt();
        const zhuangHand = cardsOf(await send("p0", "hand"));
        await send("p0", "exchange", { give: "[]", receive: "[]" });
        const lead = zhuangHand.find((c) => c.suit !== "spades" && c.suit !== "jokers" && c.rank !== 2) ?? zhuangHand[0];
        const res = await send("p0", "play", { play: JSON.stringify({ cards: [lead], suit: null }) });
        expect(res.status).toBe(200);
        expect(cardsOf(res)).toHaveLength(24);
    });

    it("shuai: a play that is not a legal throw is refused", async () => {
        await dealt();
        await send("p0", "exchange", { give: "[]", receive: "[]" });
        const res = await send("p0", "shuai", {
            play: JSON.stringify({ cards: [{ suit: "hearts", rank: 3 }, { suit: "clubs", rank: 4 }], suit: null }),
        });
        expect(res.json.error).toBe("Invalid shuai");
    });

    // The payload fields used to be JSON.parse'd with no guard, so a missing or malformed value
    // threw inside the handler and the client saw a 500 "Internal server error".
    it("a malformed play payload is a client error (4xx), not a 500", async () => {
        await dealt();
        const res = await send("p0", "play", { play: "not json" });
        expect(res.status).toBeLessThan(500);
        expect(res.json.error).toBe("Invalid play");
    });

    describe("malformed payloads are rejected as client errors", () => {
        const goodCard = { suit: "hearts", rank: 3 };

        it.each([
            ["not json", "not json"],
            ["missing", undefined],
            ["a number", 5],
            ["an object instead of a string", { cards: [goodCard] }],
            ["null", "null"],
            ["no cards", JSON.stringify({})],
            ["cards not a list", JSON.stringify({ cards: "x" })],
            ["a card with a bad suit", JSON.stringify({ cards: [{ suit: "stars", rank: 3 }] })],
            ["a card with a bad rank", JSON.stringify({ cards: [{ suit: "hearts", rank: 99 }] })],
            ["a card with a string rank", JSON.stringify({ cards: [{ suit: "hearts", rank: "3" }] })],
            ["null cards", JSON.stringify({ cards: [null] })],
            ["an array", JSON.stringify([goodCard])],
        ])("play: %s", async (_label, play) => {
            await dealt();
            await send("p0", "exchange", { give: "[]", receive: "[]" });
            const res = await send("p0", "play", play === undefined ? {} : { play });
            expect(res.status).toBe(400);
            expect(res.json.error).toBe("Invalid play");
        });

        it.each([["not json"], [undefined], [JSON.stringify({ cards: [{ suit: "x" }] })]])("shuai: %s", async (play) => {
            await dealt();
            await send("p0", "exchange", { give: "[]", receive: "[]" });
            const res = await send("p0", "shuai", play === undefined ? {} : { play });
            expect(res.status).toBe(400);
            expect(res.json.error).toBe("Invalid shuai");
        });

        it.each([
            ["not json", "oops"],
            ["missing", undefined],
            ["no rank", JSON.stringify({ suit: "hearts" })],
            ["a null suit", JSON.stringify({ suit: null, rank: 2 })],
            ["a bad suit", JSON.stringify({ suit: "stars", rank: 2 })],
            ["a string rank", JSON.stringify({ suit: "hearts", rank: "2" })],
        ])("trump: %s", async (_label, trump) => {
            await startGame();
            const res = await send("p0", "trump", trump === undefined ? {} : { trump });
            expect(res.status).toBe(400);
            expect(res.json.error).toBe("Invalid trump call");
        });

        it.each([
            ["give not json", { give: "x", receive: "[]" }],
            ["receive missing", { give: "[]" }],
            ["bad card in give", { give: JSON.stringify([{ suit: "x", rank: 1 }]), receive: "[]" }],
            ["not a list", { give: "{}", receive: "[]" }],
        ])("exchange: %s", async (_label, payload) => {
            await dealt();
            const res = await send("p0", "exchange", payload);
            expect(res.status).toBe(400);
            expect(res.json.error).toBe("Failed to exchange Dipai");
        });

        it("a rejected payload changes nothing: the game is not saved or published", async () => {
            await dealt();
            await send("p0", "exchange", { give: "[]", receive: "[]" });
            const before = String(fake.kv.get(`game:${ROOM}`));
            fake.ably.published.length = 0;
            await send("p0", "play", { play: "not json" });
            expect(String(fake.kv.get(`game:${ROOM}`))).toBe(before);
            expect(fake.ably.published).toHaveLength(0);
        });

        it("never answers any of them with a 500", async () => {
            await dealt();
            for (const action of ["play", "shuai", "trump", "exchange"]) {
                for (const value of ["", "null", "[]", "{}", "{\"cards\":null}", "\"x\"", "12", "{"]) {
                    const res = await send("p0", action, { play: value, trump: value, give: value, receive: value });
                    expect(res.status, `${action} ${value}`).toBeLessThan(500);
                }
            }
        });
    });

    describe("usernames", () => {
        it("a missing username is rejected", async () => {
            await startGame();
            const res = await send("p0", "username", {});
            expect(res.json.error).toBe("Missing username");
        });

        it.each([[""], ["   "], [5], [null], [{}]])("rejects %j", async (username) => {
            await startGame();
            expect((await send("p0", "username", { username })).json.error).toBe("Missing username");
        });

        it("trims and caps the name", async () => {
            await startGame();
            await send("p0", "username", { username: `  ${"x".repeat(100)}  ` });
            expect((await savedState()).info.get("p0")?.username).toBe("x".repeat(32));
        });

        it("caps names that arrive through presence when the game starts", async () => {
            fake.ably.presence = PLAYERS.map((clientId, i) => ({ clientId, data: { username: "y".repeat(500), team: i % 2 } }));
            await send("p0", "start");
            expect((await savedState()).info.get("p1")?.username).toBe("y".repeat(32));
        });
    });
});

describe("pausing", () => {
    it("publishes only when presence changes the paused state", async () => {
        await startGame();
        fake.ably.published.length = 0;
        await send("p0", "connection");
        expect(fake.ably.published).toHaveLength(0);
        fake.ably.presence = fake.ably.presence.slice(0, 3);
        await send("p0", "connection");
        expect(fake.ably.published).toHaveLength(1);
        const saved = fake.kv.get(`game:${ROOM}`);
        await send("p1", "connection");
        expect(fake.ably.published).toHaveLength(1);
        expect(fake.kv.get(`game:${ROOM}`)).toBe(saved);
        seat();
        await send("p0", "connection");
        expect(fake.ably.published).toHaveLength(2);
    });

    async function paused(): Promise<void> {
        await dealt();
        fake.ably.presence = fake.ably.presence.slice(0, 3); // p3 drops out
        expect((await send("p0", "connection")).status).toBe(200);
    }

    it("`connection` pauses the game when a seated player is not present", async () => {
        await paused();
        expect((await savedState()).paused).toBe(true);
    });

    it("`connection` resumes it once everyone is back", async () => {
        await paused();
        seat();
        await send("p0", "connection");
        expect((await savedState()).paused).toBe(false);
    });

    it("blocks game actions with 423 while paused", async () => {
        await paused();
        for (const action of ["draw", "play", "trump", "exchange", "dipai", "start", "speed_draw"]) {
            const res = await send("p0", action, {});
            expect(res.status, action).toBe(423);
        }
    });

    it("still allows reads, usernames and ending the game while paused", async () => {
        await paused();
        expect((await send("p0", "state")).status).toBe(200);
        expect((await send("p0", "hand")).status).toBe(200);
        expect((await send("p0", "username", { username: "N" })).status).toBe(200);
        expect((await send("p0", "end")).status).toBe(200);
    });

    it("`connection` needs a game", async () => {
        expect((await send("p0", "connection")).json.error).toBe("Game not found");
    });
});

describe("ending the game", () => {
    it("lets a player delete the room's game and tells everyone", async () => {
        await startGame();
        fake.ably.published.length = 0;
        const res = await send("p1", "end");
        expect(res.json.msg).toBe("Game ended");
        expect(fake.kv.has(`game:${ROOM}`)).toBe(false);
        expect(fake.ably.published.at(-1)?.data.game).toBeNull();
    });

    it("refuses anyone who is not seated", async () => {
        await startGame();
        const res = await send("stranger", "end");
        expect(res.json.error).toBe("Only players can end the game");
        expect(fake.kv.has(`game:${ROOM}`)).toBe(true);
    });

    it("needs a game", async () => {
        expect((await send("p0", "end")).json.error).toBe("Game not found");
    });
});

describe("the speed-draw shortcut is development only", () => {
    const speedActions = ["speed_draw", "speed"];

    it.each(speedActions)("`%s` works under `netlify dev` (CONTEXT=dev)", async (action) => {
        await startGame();
        expect((await send("p0", action)).status).toBe(200);
        expect((await savedState()).draw).toBe(false);
    });

    it.each(speedActions)("`%s` works when NETLIFY_DEV=true", async (action) => {
        vi.stubEnv("CONTEXT", "");
        vi.stubEnv("NETLIFY_DEV", "true");
        await startGame();
        expect((await send("p0", action)).status).toBe(200);
    });

    it.each(["production", "deploy-preview", "branch-deploy", ""])("is refused when CONTEXT=%j", async (context) => {
        await startGame();
        vi.stubEnv("CONTEXT", context);
        vi.stubEnv("NETLIFY_DEV", "");
        for (const action of speedActions) {
            const res = await send("p0", action);
            expect(res.status, `${action} in ${context}`).toBe(403);
            expect(res.json.error).toMatch(/only available in development/);
        }
        expect((await savedState()).draw).toBe(true); // nothing was dealt
    });

    it("a refused speed draw neither saves nor publishes", async () => {
        await startGame();
        vi.stubEnv("CONTEXT", "production");
        const before = String(fake.kv.get(`game:${ROOM}`));
        fake.ably.published.length = 0;
        await send("p0", "speed_draw");
        expect(String(fake.kv.get(`game:${ROOM}`))).toBe(before);
        expect(fake.ably.published).toHaveLength(0);
    });

    it.each(speedActions)("even in development `%s` is for seated players only", async (action) => {
        await startGame();
        const res = await send("stranger", action);
        expect(res.status).toBe(403);
        expect(res.json.error).toBe("Only players can speed draw");
        expect((await savedState()).draw).toBe(true);
    });

    it("every seated player may use it in development", async () => {
        await startGame();
        expect((await send("p3", "speed_draw")).status).toBe(200);
    });
});

describe("authorisation", () => {
    // create-session used to sign any clientId for any caller, so a signature proved nothing
    // about identity. The server now mints both id and signature, so an attacker has no way
    // to obtain a signature for somebody else's id.
    it("a signature cannot be minted for someone else's id, so their hand stays private", async () => {
        await dealt();
        const minted = await sessionHandler(post(JSON.stringify({ action: "sign", clientId: "p1" })));
        expect(minted?.status).toBe(400);
        const { signature } = (await minted.json()) as { signature?: string };

        fake.clock.now += 5000;
        const stolen = await raw("p1", "hand", undefined, { signature: signature ?? "" });
        expect(stolen.status).not.toBe(200);
        expect(stolen.json.error).toBe("Invalid signature");
    });

    it("an identity issued by the server works in the room", async () => {
        await startGame();
        const issued = await sessionHandler(post(JSON.stringify({ action: "issue" })));
        const { clientId, signature } = (await issued.json()) as { clientId: string; signature: string };

        fake.clock.now += 5000;
        const res = await raw(clientId, "state", undefined, { signature });
        expect(res.status).toBe(200);
    });
});
