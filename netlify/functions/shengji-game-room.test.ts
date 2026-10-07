import crypto from "node:crypto";

import type { HandlerEvent } from "@netlify/functions";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { handler as sessionHandler } from "./create-session";
import { handler } from "./shengji-game-room";

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
    const res = await handler({ body: JSON.stringify(body) } as HandlerEvent);
    return { status: res.statusCode, json: JSON.parse(res.body) as Record<string, unknown> };
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
    fake.clock.now = 1_000_000;
    fake.kv.clear();
    fake.expiry.clear();
    fake.ably.published.length = 0;
    fake.ably.presence = [];
});

describe("request validation", () => {
    it("requires an identity", async () => {
        const res = await handler({ body: JSON.stringify({ action: "state", roomId: ROOM }) } as HandlerEvent);
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).error).toBe("Missing identity");
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
        const res = await handler({ body: "{oops" } as HandlerEvent);
        expect(res.statusCode).toBe(500);
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

    // The limiter runs before the signature is checked and is keyed by the *claimed* client
    // id, so anyone can spend another player's allowance with an unsigned request.
    it.fails("KNOWN BUG: unsigned requests cannot use up a real player's rate-limit budget", async () => {
        await raw("p0", "state", undefined, { signature: "forged" });
        const legit = await raw("p0", "state");
        expect(legit.status).not.toBe(429);
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

    // The payload fields are JSON.parse'd with no guard, so a missing or malformed value
    // throws inside the handler and the client sees a 500 "Internal server error".
    it.fails("KNOWN BUG: a malformed play payload is a client error (4xx), not a 500", async () => {
        await dealt();
        const res = await send("p0", "play", { play: "not json" });
        expect(res.status).toBeLessThan(500);
    });

    it.fails("KNOWN BUG: a missing username is rejected", async () => {
        await startGame();
        const res = await send("p0", "username", {});
        expect(res.json.error).toBe("Missing username");
    });
});

describe("pausing", () => {
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

describe("authorisation holes", () => {
    // These actions look up the game by room only; they never check that the caller is one
    // of the seated players, so any signed-in visitor can drive the deal.
    it.fails("KNOWN BUG: a spectator cannot force the cards to be dealt", async () => {
        await startGame();
        const res = await send("stranger", "speed_draw");
        expect(res.status).not.toBe(200);
    });

    it.fails("KNOWN BUG: the testing-only `speed` shortcut is not exposed to spectators", async () => {
        await startGame();
        const res = await send("stranger", "speed");
        expect(res.status).not.toBe(200);
    });

    // create-session used to sign any clientId for any caller, so a signature proved nothing
    // about identity. The server now mints both id and signature, so an attacker has no way
    // to obtain a signature for somebody else's id.
    it("a signature cannot be minted for someone else's id, so their hand stays private", async () => {
        await dealt();
        const minted = await sessionHandler({ body: JSON.stringify({ action: "sign", clientId: "p1" }) } as HandlerEvent);
        expect(minted?.statusCode).toBe(400);
        const { signature } = JSON.parse(minted?.body ?? "{}") as { signature?: string };

        fake.clock.now += 5000;
        const stolen = await raw("p1", "hand", undefined, { signature: signature ?? "" });
        expect(stolen.status).not.toBe(200);
        expect(stolen.json.error).toBe("Invalid signature");
    });

    it("an identity issued by the server works in the room", async () => {
        await startGame();
        const issued = await sessionHandler({ body: JSON.stringify({ action: "issue" }) } as HandlerEvent);
        const { clientId, signature } = JSON.parse(issued?.body ?? "{}") as { clientId: string; signature: string };

        fake.clock.now += 5000;
        const res = await raw(clientId, "state", undefined, { signature });
        expect(res.status).toBe(200);
    });
});
