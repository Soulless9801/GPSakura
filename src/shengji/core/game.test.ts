import { beforeEach, describe, expect, it } from "vitest";

import RNG from "/src/entities/rng";
import {
    buildHand,
    card,
    cardKey,
    cardsHeld,
    craft,
    dealAndSkipKitty,
    newTable,
    playRound,
    seedRandom,
    tally,
} from "/src/test/shengji";
import type { Table } from "/src/test/shengji";

import { Game, baseGame } from "./game";
import { pointValue } from "./entities";
import { handToCards } from "./convert";
import { analyse } from "/src/shengji/advisor/advisor";

const H = (rank: number) => card("hearts", rank);
const S = (rank: number) => card("spades", rank);
const C = (rank: number) => card("clubs", rank);
const SJ = card("jokers", 1);
const BJ = card("jokers", 2);

describe("initializeGame", () => {
    it("seats an even number of players from 2 to 8", () => {
        for (const n of [2, 4, 6, 8]) {
            const game = baseGame();
            const players = Array.from({ length: n }, (_, i) => `p${String(i)}`);
            expect(game.initializeGame(players, players)).toBe(game);
            expect(game.getState().players).toEqual(players);
        }
    });

    it("rejects odd, too few and too many players", () => {
        for (const n of [0, 1, 3, 5, 7, 9, 10]) {
            const players = Array.from({ length: n }, (_, i) => `p${String(i)}`);
            expect(baseGame().initializeGame(players, players)).toBeNull();
        }
    });

    it("starts round 1 in the drawing phase with everything zeroed", () => {
        const { state, players } = newTable(4);
        expect(state).toMatchObject({
            round: 1,
            atk: 0,
            draw: true,
            dip: false,
            over: false,
            paused: false,
            declare: 0,
            zhuang: 0,
            turn: 0,
            score: 0,
            points: 0,
            count: 0,
            alt: 2,
        });
        expect(state.trump).toEqual({ suit: null, rank: 2 });
        expect(state.discard).toEqual([]);
        expect(players.map((p) => state.info.get(p)?.index)).toEqual([0, 1, 2, 3]);
    });

    it("records usernames alongside seat indices", () => {
        const { state } = newTable(4);
        expect(state.info.get("p2")).toEqual({ index: 2, username: "P2", play: null });
    });

    it("builds one deck per two seats", () => {
        for (const n of [2, 4, 6, 8]) {
            const { game } = newTable(n);
            expect(game.getDeck().unload()).toHaveLength(54 * (n / 2));
        }
    });

    it("gives every player an empty hand", () => {
        const { game, players } = newTable();
        for (const p of players) {expect(handToCards(game.getHand(p) ?? buildHand([]), null)).toEqual([]);}
    });

    // `zip` of players and users by index: a short `users` array leaves `username` undefined.
    it("does not validate that users and players line up", () => {
        const game = baseGame();
        game.initializeGame(["a", "b"], ["only-one"]);
        expect(game.getState().info.get("b")?.username).toBeUndefined();
    });
});

describe("changeUsername", () => {
    it("updates a seated player and reports success", () => {
        const { game, state } = newTable();
        expect(game.changeUsername("p1", "Alice")).toBe(true);
        expect(state.info.get("p1")?.username).toBe("Alice");
    });

    it("refuses an unknown player", () => {
        expect(newTable().game.changeUsername("stranger", "x")).toBe(false);
    });
});

describe("drawing", () => {
    it("only the player whose turn it is may draw", () => {
        const { game } = newTable();
        expect(game.drawCard("p1")).toBe(false);
        expect(game.drawCard("p0")).toBe(true);
        expect(game.drawCard("p0")).toBe(false);
        expect(game.drawCard("p1")).toBe(true);
    });

    it("rejects strangers", () => {
        expect(newTable().game.drawCard("nobody")).toBe(false);
    });

    it("advances the turn round the table and counts laps at seat 0", () => {
        const { game, state } = newTable();
        for (const p of ["p0", "p1", "p2", "p3"]) {game.drawCard(p);}
        expect(state.turn).toBe(0);
        expect(state.count).toBe(1);
    });

    it("hands out 25 cards each and closes the draw with the kitty left over", () => {
        const { game, state, players } = newTable();
        expect(game.speedDraw()).toBe(true);

        expect(state.draw).toBe(false);
        expect(state.dip).toBe(true);
        expect(state.count).toBe(25);
        for (const p of players) {expect(handToCards(game.getHand(p) ?? buildHand([]), null)).toHaveLength(25);}
        expect(game.getDipai(players[state.zhuang])).toHaveLength(8);
        expect(game.getDeck().draw()).toBeNull();
    });

    it("kitty size follows the table size", () => {
        for (const [n, kitty] of [[2, 4], [4, 8], [6, 12], [8, 16]] as const) {
            const { game, state, players } = newTable(n);
            game.speedDraw();
            expect(game.getDipai(players[state.zhuang])).toHaveLength(kitty);
        }
    });

    it("finishDraw hands the lead to the zhuang and the attack to the other side", () => {
        const { game, state } = newTable();
        state.zhuang = 1;
        state.turn = 1;
        game.speedDraw();
        expect(state.turn).toBe(1);
        expect(state.chu).toBe(1);
        expect(state.lead).toBe(1);
        expect(state.atk).toBe(0); // zhuang is seat 1 (team 1), so team 0 attacks
        expect(state.declare).toBe(0);
    });

    it("speedDraw is refused outside the draw phase and after the game ends", () => {
        const table = newTable();
        table.game.speedDraw();
        expect(table.game.speedDraw()).toBe(false);

        const over = newTable();
        over.state.over = true;
        expect(over.game.speedDraw()).toBe(false);
        expect(over.game.drawCard("p0")).toBe(false);
    });

    it("every card in the pack ends up in a hand or the kitty, exactly once", () => {
        seedRandom(99);
        const table = newTable();
        table.game.speedDraw();
        const all = [
            ...cardsHeld(table),
            ...(table.game.getDipai(table.players[table.state.zhuang]) ?? []),
        ];
        const counts = tally(all);
        expect(all).toHaveLength(108);
        expect(counts.size).toBe(54);
        for (const n of counts.values()) {expect(n).toBe(2);}
    });

    it("deals 25 each when the first draw starts from a non-zero seat", () => {
        const table = newTable();
        table.state.round = 2;
        table.state.zhuang = 2;
        table.state.turn = 2;
        table.game.speedDraw();
        expect(table.state.count).toBe(25);
        expect(handToCards(table.game.getHand("p2") ?? buildHand([]), null)).toHaveLength(25);
    });
});

describe("callTrump", () => {
    let table: Table;

    beforeEach(() => {
        table = newTable();
    });

    const give = (player: string, cards: ReturnType<typeof card>[]): void => {
        const hand = table.game.getHand(player);
        for (const c of cards) {hand?.addCard(c);}
    };

    it("declares a suit with a single trump-rank card", () => {
        give("p2", [H(2)]);
        expect(table.game.callTrump("p2", { suit: "hearts", rank: 2 })).toBe(true);
        expect(table.state.trump.suit).toBe("hearts");
        expect(table.state.whodec).toBe(2);
        expect(table.state.declare).toBe(1);
    });

    it("in round 1 the declarer becomes the zhuang", () => {
        give("p3", [H(2)]);
        table.game.callTrump("p3", { suit: "hearts", rank: 2 });
        expect(table.state.zhuang).toBe(3);
    });

    it("in later rounds the zhuang does not move", () => {
        table.state.round = 2;
        table.state.zhuang = 1;
        give("p3", [H(2)]);
        table.game.callTrump("p3", { suit: "hearts", rank: 2 });
        expect(table.state.zhuang).toBe(1);
    });

    it("a card you do not hold cannot be declared", () => {
        expect(table.game.callTrump("p0", { suit: "hearts", rank: 2 })).toBe(false);
        expect(table.state.trump.suit).toBeNull();
    });

    it("only the current trump rank may be declared", () => {
        give("p0", [H(5)]);
        expect(table.game.callTrump("p0", { suit: "hearts", rank: 5 })).toBe(false);
    });

    it("a pair overrides a single, but a single cannot override a pair or an equal pair", () => {
        give("p0", [H(2)]);
        give("p1", [C(2), C(2)]);
        give("p2", [S(2)]);

        expect(table.game.callTrump("p0", { suit: "hearts", rank: 2 })).toBe(true);
        expect(table.game.callTrump("p1", { suit: "clubs", rank: 2 })).toBe(true);
        expect(table.game.callTrump("p2", { suit: "spades", rank: 2 })).toBe(false);
        expect(table.state.trump.suit).toBe("clubs");
        expect(table.state.declare).toBe(2);
    });

    it("an equal-sized declaration does not override", () => {
        give("p0", [H(2)]);
        give("p1", [C(2)]);
        expect(table.game.callTrump("p0", { suit: "hearts", rank: 2 })).toBe(true);
        expect(table.game.callTrump("p1", { suit: "clubs", rank: 2 })).toBe(false);
        expect(table.state.trump.suit).toBe("hearts");
    });

    it("a null suit is never a valid call", () => {
        give("p0", [H(2)]);
        expect(table.game.callTrump("p0", { suit: null, rank: 2 })).toBe(false);
    });

    it("rejects strangers", () => {
        expect(table.game.callTrump("ghost", { suit: "hearts", rank: 2 })).toBe(false);
    });

    it("is refused once the draw has finished or the game is over", () => {
        give("p0", [H(2)]);
        table.state.draw = false;
        expect(table.game.callTrump("p0", { suit: "hearts", rank: 2 })).toBe(false);
        table.state.draw = true;
        table.state.over = true;
        expect(table.game.callTrump("p0", { suit: "hearts", rank: 2 })).toBe(false);
    });

    describe("jokers", () => {
        it("two of the same joker declare no-trump (4 players)", () => {
            give("p0", [SJ, SJ]);
            expect(table.game.callTrump("p0", { suit: "jokers", rank: 2 })).toBe(true);
            expect(table.state.trump.suit).toBe("jokers");
            expect(table.state.declare).toBe(2);
        });

        it("one of each joker also declares", () => {
            give("p1", [SJ, BJ]);
            expect(table.game.callTrump("p1", { suit: "jokers", rank: 2 })).toBe(true);
        });

        it("a lone joker does not", () => {
            give("p0", [BJ]);
            expect(table.game.callTrump("p0", { suit: "jokers", rank: 2 })).toBe(false);
        });

        it("overrides a suit declaration, and a bigger set of trump-rank cards can then override it", () => {
            give("p0", [H(2), H(2)]);
            give("p1", [BJ, BJ]);
            give("p2", [S(2), S(2), S(2)]);
            expect(table.game.callTrump("p0", { suit: "hearts", rank: 2 })).toBe(true);
            expect(table.game.callTrump("p1", { suit: "jokers", rank: 2 })).toBe(true);
            expect(table.game.callTrump("p2", { suit: "spades", rank: 2 })).toBe(true); // 3 > 2
            expect(table.state.trump.suit).toBe("spades");
        });

        it("the joker rule scales with the table (6 players need three of one kind or two each)", () => {
            const six = newTable(6);
            six.game.getHand("p0")?.addCard(SJ);
            six.game.getHand("p0")?.addCard(SJ);
            expect(six.game.callTrump("p0", { suit: "jokers", rank: 2 })).toBe(false);
            six.game.getHand("p0")?.addCard(SJ);
            expect(six.game.callTrump("p0", { suit: "jokers", rank: 2 })).toBe(true);
            expect(six.state.declare).toBe(3);
        });
    });
});

describe("declaring in a later round", () => {
    it("a suit can be declared again after the previous round's suit was cleared", () => {
        const table = craft({ hands: {}, overrides: { draw: true, round: 2, zhuang: 1, trump: { suit: null, rank: 3 } } });
        table.game.getHand("p0")?.addCard(H(3));
        expect(table.game.callTrump("p0", { suit: "hearts", rank: 3 })).toBe(true);
        expect(table.state.trump.suit).toBe("hearts");
        expect(table.state.zhuang).toBe(1); // the zhuang only moves by declaring in round 1
    });
});

describe("exchangeDipai", () => {
    function atKitty(): Table {
        const table = newTable();
        table.game.speedDraw();
        return table;
    }

    it("lets the zhuang swap cards with the kitty, once", () => {
        const table = atKitty();
        const zhuang = table.players[table.state.zhuang];
        const hand = table.game.getHand(zhuang);
        const kitty = table.game.getDipai(zhuang) ?? [];
        const give = handToCards(hand ?? buildHand([]), null).slice(0, 2);
        const take = kitty.slice(0, 2);

        expect(table.game.exchangeDipai(zhuang, give, take)).toBe(true);

        expect(table.state.dip).toBe(false);
        const after = handToCards(hand ?? buildHand([]), null);
        expect(after).toHaveLength(25);
        expect(table.game.getDipai(zhuang)).toHaveLength(8);
        expect(table.game.exchangeDipai(zhuang, [], [])).toBe(false); // already done
    });

    it("moves the exact cards in each direction", () => {
        const table = atKitty();
        const zhuang = table.players[table.state.zhuang];
        const handBefore = tally(handToCards(table.game.getHand(zhuang) ?? buildHand([]), null));
        const kittyBefore = tally(table.game.getDipai(zhuang) ?? []);
        const give = handToCards(table.game.getHand(zhuang) ?? buildHand([]), null).slice(0, 3);
        const take = (table.game.getDipai(zhuang) ?? []).slice(0, 3);

        table.game.exchangeDipai(zhuang, give, take);

        const handAfter = tally(handToCards(table.game.getHand(zhuang) ?? buildHand([]), null));
        const kittyAfter = tally(table.game.getDipai(zhuang) ?? []);
        for (const c of give) {
            handBefore.set(cardKey(c), (handBefore.get(cardKey(c)) ?? 0) - 1);
            kittyBefore.set(cardKey(c), (kittyBefore.get(cardKey(c)) ?? 0) + 1);
        }
        for (const c of take) {
            handBefore.set(cardKey(c), (handBefore.get(cardKey(c)) ?? 0) + 1);
            kittyBefore.set(cardKey(c), (kittyBefore.get(cardKey(c)) ?? 0) - 1);
        }
        const nonZero = (m: Map<string, number>): [string, number][] =>
            [...m.entries()].filter(([, n]) => n > 0).sort();
        expect(nonZero(handAfter)).toEqual(nonZero(handBefore));
        expect(nonZero(kittyAfter)).toEqual(nonZero(kittyBefore));
    });

    it("must give and take the same number of cards", () => {
        const table = atKitty();
        const zhuang = table.players[table.state.zhuang];
        const kitty = table.game.getDipai(zhuang) ?? [];
        const give = handToCards(table.game.getHand(zhuang) ?? buildHand([]), null).slice(0, 1);
        expect(table.game.exchangeDipai(zhuang, give, kitty.slice(0, 2))).toBe(false);
        expect(table.state.dip).toBe(true);
    });

    it("cannot give a card that is not in hand", () => {
        const table = atKitty();
        const zhuang = table.players[table.state.zhuang];
        const hand = table.game.getHand(zhuang);
        const missing = [...Array.from({ length: 13 }, (_, i) => H(i + 2))].find((c) => (hand?.countCard(c) ?? 0) === 0);
        const kitty = table.game.getDipai(zhuang) ?? [];
        if (!missing) {return;}
        expect(table.game.exchangeDipai(zhuang, [missing], kitty.slice(0, 1))).toBe(false);
    });

    it("cannot take a card that is not in the kitty", () => {
        const table = atKitty();
        const zhuang = table.players[table.state.zhuang];
        const kitty = table.game.getDipai(zhuang) ?? [];
        const absent = [...Array.from({ length: 13 }, (_, i) => C(i + 2))].find((c) => !kitty.some((k) => cardKey(k) === cardKey(c)));
        const give = handToCards(table.game.getHand(zhuang) ?? buildHand([]), null).slice(0, 1);
        if (!absent) {return;}
        expect(table.game.exchangeDipai(zhuang, give, [absent])).toBe(false);
    });

    it("only the player whose turn it is may exchange", () => {
        const table = atKitty();
        expect(table.game.exchangeDipai("p1", [], [])).toBe(false);
    });

    it("is refused outside the kitty phase", () => {
        const table = newTable();
        expect(table.game.exchangeDipai("p0", [], [])).toBe(false);
    });

    it("only the zhuang is shown the kitty", () => {
        const table = atKitty();
        expect(table.game.getDipai(table.players[(table.state.zhuang + 1) % 4])).toBeNull();
        expect(table.game.getDipai(table.players[table.state.zhuang])).not.toBeNull();
    });
});

describe("tryPlay", () => {
    it("refuses plays before the draw and kitty are finished", () => {
        const table = newTable();
        expect(table.game.tryPlay("p0", { cards: [H(3)], suit: null })).toBe(false);
        table.game.speedDraw();
        expect(table.game.tryPlay("p0", { cards: [H(3)], suit: null })).toBe(false);
    });

    it("refuses an empty play, a stranger and the wrong turn", () => {
        const table = craft({ hands: { p0: [H(3)], p1: [H(4)], p2: [H(5)], p3: [H(6)] }, overrides: { count: 1 } });
        expect(table.game.tryPlay("p0", { cards: [], suit: null })).toBe(false);
        expect(table.game.tryPlay("ghost", { cards: [H(3)], suit: null })).toBe(false);
        expect(table.game.tryPlay("p1", { cards: [H(4)], suit: null })).toBe(false);
    });

    it("refuses cards the player does not hold, leaving the hand intact", () => {
        const table = craft({ hands: { p0: [H(3)], p1: [H(4)], p2: [H(5)], p3: [H(6)] }, overrides: { count: 1 } });
        expect(table.game.tryPlay("p0", { cards: [H(9)], suit: null })).toBe(false);
        expect(table.game.getHand("p0")?.countCard(H(3))).toBe(1);
        expect(table.state.turn).toBe(0);
    });

    it("an illegal lead changes nothing: the turn and points stay put", () => {
        const table = craft({ hands: { p0: [H(3), H(4)], p1: [], p2: [], p3: [] }, overrides: { count: 2 } });
        table.game.tryPlay("p0", { cards: [H(3), H(4)], suit: null }); // two singles: not a legal lead
        expect(table.state.turn).toBe(0);
        expect(table.state.points).toBe(0);
    });

    it("removes played cards from the hand and passes the turn", () => {
        const table = craft({ hands: { p0: [H(3), H(4)], p1: [H(5)], p2: [H(6)], p3: [H(7)] }, overrides: { count: 2 } });
        expect(table.game.tryPlay("p0", { cards: [H(3)], suit: null })).toBe(true);
        expect(table.game.getHand("p0")?.countCard(H(3))).toBe(0);
        expect(table.state.turn).toBe(1);
        expect(table.state.info.get("p0")?.play?.cards).toEqual([H(3)]);
    });

    it("enforces following suit", () => {
        const table = craft({ hands: { p0: [H(3)], p1: [H(5), C(14)], p2: [], p3: [] }, overrides: { count: 1 } });
        table.game.tryPlay("p0", { cards: [H(3)], suit: null });
        expect(table.game.tryPlay("p1", { cards: [C(14)], suit: null })).toBe(false);
        expect(table.game.tryPlay("p1", { cards: [H(5)], suit: null })).toBe(true);
    });

    it("tracks the current winner as plays come in", () => {
        const table = craft({ hands: { p0: [H(3)], p1: [H(14)], p2: [H(4)], p3: [H(5)] }, overrides: { count: 1 } });
        table.game.tryPlay("p0", { cards: [H(3)], suit: null });
        expect(table.state.lead).toBe(0);
        table.game.tryPlay("p1", { cards: [H(14)], suit: null });
        expect(table.state.lead).toBe(1);
        table.game.tryPlay("p2", { cards: [H(4)], suit: null });
        expect(table.state.lead).toBe(1);
    });

    it("a trump ruffs a plain lead from a void seat", () => {
        const table = craft({ hands: { p0: [H(14)], p1: [S(3)], p2: [H(4)], p3: [H(5)] }, overrides: { count: 1 } });
        table.game.tryPlay("p0", { cards: [H(14)], suit: null });
        table.game.tryPlay("p1", { cards: [S(3)], suit: null });
        expect(table.state.lead).toBe(1);
    });

    it("accumulates the points of every card in the trick, then clears them", () => {
        const table = craft({
            hands: { p0: [H(5), C(3)], p1: [H(10), C(3)], p2: [H(13), C(3)], p3: [H(3), C(3)] },
            overrides: { count: 2 },
        });
        table.game.tryPlay("p0", { cards: [H(5)], suit: null });
        table.game.tryPlay("p1", { cards: [H(10)], suit: null });
        table.game.tryPlay("p2", { cards: [H(13)], suit: null });
        expect(table.state.points).toBe(25);
        table.game.tryPlay("p3", { cards: [H(3)], suit: null });
        expect(table.state.points).toBe(0);
    });
});

describe("trick resolution", () => {
    // Team of seat i is i % 2; with zhuang 0 the attackers are team 1 (seats 1 and 3).
    function trick(winnerSeat: 0 | 1 | 2 | 3): Table {
        const plays = [H(3), H(3), H(3), H(3)];
        plays[winnerSeat] = H(14);
        const hands = {
            p0: [plays[0], C(3)],
            p1: [plays[1], H(5)],
            p2: [plays[2], H(10)],
            p3: [plays[3], H(13)],
        };
        const table = craft({ hands, overrides: { count: 2, atk: 1 } });
        for (const [i, p] of table.players.entries()) {
            table.game.tryPlay(p, { cards: [plays[i]], suit: null });
        }
        return table;
    }

    it("the winner of a trick leads the next one", () => {
        for (const seat of [0, 1, 2, 3] as const) {
            const table = trick(seat);
            expect(table.state.chu).toBe(seat);
            expect(table.state.turn).toBe(seat);
            expect(table.state.lead).toBe(seat);
        }
    });

    it("attackers take the points when they win", () => {
        const table = craft({
            hands: { p0: [H(5)], p1: [H(14)], p2: [H(10)], p3: [H(13)] },
            overrides: { count: 99, atk: 1 },
        });
        for (const p of table.players) {
            const c = table.game.getHand(p);
            const only = handToCards(c ?? buildHand([]), null)[0];
            table.game.tryPlay(p, { cards: [only], suit: null });
        }
        expect(table.state.score).toBe(5 + 10 + 10);
    });

    it("defenders winning a trick score nothing for the attackers", () => {
        const table = craft({
            hands: { p0: [H(14)], p1: [H(5)], p2: [H(10)], p3: [H(13)] },
            overrides: { count: 99, atk: 1 },
        });
        for (const p of table.players) {
            const only = handToCards(table.game.getHand(p) ?? buildHand([]), null)[0];
            table.game.tryPlay(p, { cards: [only], suit: null });
        }
        expect(table.state.lead).toBe(0);
        expect(table.state.score).toBe(0);
    });

    it("moves the played cards onto the discard pile", () => {
        const table = trick(0);
        expect(table.state.discard).toHaveLength(4);
    });

    it("the trick count goes down by the size of the lead", () => {
        const table = trick(0);
        expect(table.state.count).toBe(1);
    });
});

describe("end of round scoring", () => {
    /**
     * One trick left, one card each, trump suit spades. Seat 0 leads and the zhuang side is
     * team 0, so team 1 (seats 1 and 3) attacks. The ace wins the trick: seat 1's if
     * `attackersWin`, seat 0's otherwise. The trick carries one 5 (5 points) and the kitty
     * holds a 5 and a 10 (15 points). A last trick won by the attackers is worth the kitty
     * twice (a one-card lead doubles it), so the attackers' final score is
     * `score + 5 + 30`; if the defenders win it, the final score is just `score`.
     */
    function lastTrick(options: {
        score: number;
        attackersWin: boolean;
        rank?: number;
        alt?: number;
        zhuang?: number;
        players?: number;
    }): Table {
        const seats = options.players ?? 4;
        const plays = options.attackersWin
            ? [H(6), H(14), H(7), H(5)]
            : [H(14), H(4), H(7), H(5)];
        while (plays.length < seats) {plays.push(H(8));}

        const hands: Record<string, ReturnType<typeof card>[]> = {};
        plays.slice(0, seats).forEach((c, i) => {
            hands[`p${String(i)}`] = [c];
        });

        const table = craft({
            players: seats,
            hands,
            dipai: [C(5), C(10)],
            overrides: {
                count: 1,
                atk: 1,
                score: options.score,
                zhuang: options.zhuang ?? 0,
                trump: { suit: "spades", rank: (options.rank ?? 3) as 3 },
                alt: (options.alt ?? 5) as 5,
            },
        });
        table.players.forEach((p, i) => {
            expect(table.game.tryPlay(p, { cards: [plays[i]], suit: null })).toBe(true);
        });
        return table;
    }

    /** Land the attackers on exactly `finalScore`. */
    function finishWith(finalScore: number, attackersWin: boolean, rank = 3, alt = 5, zhuang = 0): Table {
        const score = attackersWin ? finalScore - 35 : finalScore;
        return lastTrick({ score, attackersWin, rank, alt, zhuang });
    }

    describe("attackers reaching 80 take over", () => {
        it.each([
            [80, 5, 3], // swap: new trump rank is the old alt (5), no bonus
            [119, 5, 3],
            [120, 6, 3], // +1
            [160, 7, 3], // +2
            [200, 8, 3], // +3
        ])("final score %d -> trump rank %d, old rank kept as alt %d", (final, rank, alt) => {
            const table = finishWith(final, true);
            expect(table.state.trump.rank).toBe(rank);
            expect(table.state.alt).toBe(alt);
        });

        it("flips the attacking side, advances the zhuang by one seat and starts round 2", () => {
            const table = finishWith(100, true);
            expect(table.state.atk).toBe(0);
            expect(table.state.zhuang).toBe(1);
            expect(table.state.round).toBe(2);
            expect(table.state.over).toBe(false);
        });
    });

    describe("attackers below 80 lose", () => {
        it.each([
            [79, 4], // +1
            [40, 4],
            [39, 5], // <40: +2
            [5, 5],
            [0, 6], // shutout: +3
        ])("final score %d -> trump rank %d", (final, rank) => {
            const table = finishWith(final, false);
            expect(table.state.trump.rank).toBe(rank);
            expect(table.state.alt).toBe(5); // unchanged: the sides do not swap
        });

        it("keeps the attacking side and moves the zhuang two seats", () => {
            const table = finishWith(60, false);
            expect(table.state.atk).toBe(1);
            expect(table.state.zhuang).toBe(2);
            expect(table.state.round).toBe(2);
        });

        it("wraps the zhuang round the table", () => {
            const table = finishWith(60, false, 3, 5, 3);
            expect(table.state.zhuang).toBe(1);
        });
    });

    describe("kitty bonus", () => {
        it("goes to the attackers only when they take the last trick", () => {
            // defenders take the last trick: the score stays 60, so the defenders win (+1)
            expect(lastTrick({ score: 60, attackersWin: false }).state.trump.rank).toBe(4);
            // attackers take it: 60 + 5 + 30 = 95, so the attackers take over
            const won = lastTrick({ score: 60, attackersWin: true });
            expect(won.state.trump.rank).toBe(5);
            expect(won.state.alt).toBe(3);
        });

        it("is multiplied by the size of the lead", () => {
            // two-card (pair) last trick won by the attackers: kitty (15) x 4
            const table = craft({
                hands: { p0: [H(6), H(6)], p1: [H(14), H(14)], p2: [H(7), H(7)], p3: [H(9), H(9)] },
                dipai: [C(5), C(10)],
                overrides: { count: 2, atk: 1, score: 5, trump: { suit: "spades", rank: 3 }, alt: 5 },
            });
            for (const [i, p] of table.players.entries()) {
                const rank = [6, 14, 7, 9][i];
                expect(table.game.tryPlay(p, { cards: [H(rank), H(rank)], suit: null })).toBe(true);
            }
            // 5 + 15*4 = 65 (+ 0 trick points) -> below 80, defenders win: rank 3 -> 4
            expect(table.state.round).toBe(2);
            expect(table.state.trump.rank).toBe(4);
            // ...but at 20 starting points it is 80 and the attackers win
            const table2 = craft({
                hands: { p0: [H(6), H(6)], p1: [H(14), H(14)], p2: [H(7), H(7)], p3: [H(9), H(9)] },
                dipai: [C(5), C(10)],
                overrides: { count: 2, atk: 1, score: 20, trump: { suit: "spades", rank: 3 }, alt: 5 },
            });
            for (const [i, p] of table2.players.entries()) {
                const rank = [6, 14, 7, 9][i];
                table2.game.tryPlay(p, { cards: [H(rank), H(rank)], suit: null });
            }
            expect(table2.state.trump.rank).toBe(5);
        });
    });

    describe("resetting for the next round", () => {
        it("clears score, count, hands and the kitty, and goes back to drawing", () => {
            const table = finishWith(100, true);
            const { state } = table;
            expect(state.score).toBe(0);
            expect(state.count).toBe(0);
            expect(state.draw).toBe(true);
            expect(state.dip).toBe(false);
            expect(handToCards(table.game.getHand("p0") ?? buildHand([]), null)).toEqual([]);
            expect(table.game.getDeck().unload()).toHaveLength(108);
        });

        it("makes the new zhuang the one to declare first", () => {
            const table = finishWith(100, true);
            expect(table.state.whodec).toBe(table.state.zhuang);
        });

        // endTrick used to run `turn = chu = lead` after endRound had set `turn = zhuang`, so
        // the next deal started with whoever won the final trick.
        it("the next deal starts with the new zhuang, whoever won the last trick", () => {
            const table = finishWith(60, false); // defenders win the last trick: seat 0 leads
            expect(table.state.zhuang).toBe(2);
            expect(table.state.turn).toBe(2);
            expect(table.state.chu).toBe(2);
            expect(table.state.lead).toBe(2);
            expect(table.state.shuai).toBe(false);
        });

        it("also when the attackers win the last trick and the zhuang moves one seat", () => {
            const table = finishWith(100, true);
            expect(table.state.zhuang).toBe(1);
            expect(table.state.turn).toBe(1);
        });

        it("clears the trump suit: a suit is only trump for the round it was declared in", () => {
            const table = finishWith(60, false);
            expect(table.state.trump.suit).toBeNull();
            expect(table.state.trump.rank).toBe(4); // the new rank is kept
        });

        it("empties the discard pile so the next round starts with nothing 'seen'", () => {
            const table = finishWith(60, false);
            expect(table.state.discard).toEqual([]);
        });

        it("only the player whose turn it is (the new zhuang) may draw first", () => {
            const table = finishWith(60, false);
            expect(table.game.drawCard("p0")).toBe(false);
            expect(table.game.drawCard("p2")).toBe(true);
        });
    });

    describe("the game ends", () => {
        it("when the trump rank would pass the ace", () => {
            const table = finishWith(60, false, 14);
            expect(table.state.over).toBe(true);
        });

        it("not when the rank lands exactly on the ace", () => {
            const table = finishWith(60, false, 13);
            expect(table.state.trump.rank).toBe(14);
            expect(table.state.over).toBe(false);
        });

        it("refuses further play once over", () => {
            const table = finishWith(60, false, 14);
            expect(table.game.tryPlay("p0", { cards: [H(3)], suit: null })).toBe(false);
            expect(table.game.speedDraw()).toBe(false);
        });

        it("endGame() can also be forced", () => {
            const table = newTable();
            table.game.endGame();
            expect(table.state.over).toBe(true);
        });
    });

    it("scales the 80-point threshold with the table (6 players need 120)", () => {
        const lost = lastTrick({ score: 100, attackersWin: false, players: 6, rank: 3, alt: 5 });
        expect(lost.state.trump.rank).toBe(4); // 100 < 120: defenders win
        const won = lastTrick({ score: 120, attackersWin: false, players: 6, rank: 3, alt: 5 });
        expect(won.state.trump.rank).toBe(5); // 120: attackers take over
    });
});

describe("pause", () => {
    it("setPaused toggles the flag", () => {
        const { game, state } = newTable();
        game.setPaused(true);
        expect(state.paused).toBe(true);
        game.setPaused(false);
        expect(state.paused).toBe(false);
    });
});

describe("serialisation", () => {
    it("round-trips a dealt game exactly", () => {
        seedRandom(5);
        const table = newTable();
        table.game.speedDraw();

        const copy = Game.deserializeGame(table.game.serializeGame());
        expect(copy).not.toBeNull();
        if (!copy) {return;}

        expect(copy.getState()).toEqual(table.state);
        for (const p of table.players) {
            expect(handToCards(copy.getHand(p) ?? buildHand([]), null)).toEqual(
                handToCards(table.game.getHand(p) ?? buildHand([]), null),
            );
        }
        expect(copy.getDipai(table.players[table.state.zhuang])).toEqual(
            table.game.getDipai(table.players[table.state.zhuang]),
        );
    });

    it("restores Map-typed state as real Maps", () => {
        const table = newTable();
        const copy = Game.deserializeGame(table.game.serializeGame());
        expect(copy?.getState().info).toBeInstanceOf(Map);
        expect(copy?.getHand("p0")).not.toBeNull();
    });

    it("a restored game plays on identically", () => {
        seedRandom(11);
        const original = newTable();
        dealAndSkipKitty(original);
        const clone = Game.deserializeGame(original.game.serializeGame());
        expect(clone).not.toBeNull();
        if (!clone) {return;}
        const cloneTable: Table = { game: clone, players: original.players, state: clone.getState() };

        const a = playRound(original, new RNG(3));
        const b = playRound(cloneTable, new RNG(3));
        expect(b).toEqual(a);
        expect(cloneTable.state).toEqual(original.state);
    });

    it("returns null when a required part is missing", () => {
        expect(Game.deserializeGame("{}")).toBeNull();
        expect(Game.deserializeGame(JSON.stringify({ state: {}, hands: {}, deck: {} }))).toBeNull();
    });

    it("throws on text that is not JSON (callers must guard)", () => {
        expect(() => Game.deserializeGame("not json")).toThrow(SyntaxError);
    });

    it("an empty base game is a valid, serialisable shell", () => {
        const copy = Game.deserializeGame(baseGame().serializeGame());
        expect(copy?.getState().players).toEqual([]);
    });
});

describe("view helpers", () => {
    it("getHand returns null for an unknown player", () => {
        expect(newTable().game.getHand("ghost")).toBeNull();
    });

    it("getDipai is null for everyone but the zhuang", () => {
        const table = newTable();
        expect(table.game.getDipai("p1")).toBeNull();
        expect(table.game.getDipai("p0")).toEqual([]);
    });
});

describe("simulated rounds (random legal play)", () => {
    const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1);

    function simulate(seed: number): {
        table: Table;
        log: ReturnType<typeof playRound>;
        kitty: ReturnType<typeof card>[];
        dealt: number;
        hands: ReturnType<typeof card>[];
    } {
        seedRandom(seed);
        const table = newTable();
        table.game.speedDraw();
        const zhuang = table.players[table.state.zhuang];
        const kitty = [...(table.game.getDipai(zhuang) ?? [])];
        const hands = cardsHeld(table);
        table.game.exchangeDipai(zhuang, [], []);
        const log = playRound(table, new RNG(seed * 7919));
        return { table, log, kitty, dealt: hands.length, hands };
    }

    it("the engine never rejects a move the validator enumerated", () => {
        for (const seed of SEEDS) {
            const { log } = simulate(seed);
            expect(log.rejected, `seed ${String(seed)}`).toBe(0);
        }
    });

    it("a 4-player round deals 100 cards and takes between 1 and 25 tricks", () => {
        for (const seed of SEEDS) {
            const { log, dealt } = simulate(seed);
            expect(dealt).toBe(100);
            expect(log.plays % 4).toBe(0);
            expect(log.plays).toBeLessThanOrEqual(100);
            expect(log.plays).toBeGreaterThanOrEqual(4);
        }
    });

    it("every dealt card is played exactly once", () => {
        for (const seed of SEEDS) {
            const { table, log, hands } = simulate(seed);
            expect(table.state.round).toBe(2);
            expect(log.played).toHaveLength(100);
            expect([...tally(log.played)].sort()).toEqual([...tally(hands)].sort());
        }
    });

    it("the points played plus the kitty add up to the 200 in the pack", () => {
        for (const seed of SEEDS) {
            const { log, kitty } = simulate(seed);
            const played = log.played.reduce((a, c) => a + pointValue(c), 0);
            const kittyTotal = kitty.reduce((a, c) => a + pointValue(c), 0);
            expect(played + kittyTotal, `seed ${String(seed)}`).toBe(200);
        }
    });

    it("leaves a clean table for round 2", () => {
        for (const seed of SEEDS) {
            const { table } = simulate(seed);
            expect(table.state).toMatchObject({ round: 2, draw: true, dip: false, score: 0, count: 0, points: 0 });
            expect(cardsHeld(table)).toHaveLength(0);
        }
    });

    it("the zhuang advances by 1 or 2 seats and the rank by at least 1", () => {
        for (const seed of SEEDS) {
            const { table } = simulate(seed);
            expect([1, 2]).toContain(table.state.zhuang);
            expect(table.state.trump.rank).toBeGreaterThanOrEqual(2);
        }
    });

    it("round 2 begins with the new zhuang to draw", () => {
        for (const seed of SEEDS) {
            const { table } = simulate(seed);
            expect(table.state.turn, `seed ${String(seed)}`).toBe(table.state.zhuang);
        }
    });

    it("after round 1 every player is dealt exactly 25 cards", () => {
        for (const seed of SEEDS) {
            const { table } = simulate(seed);
            table.game.speedDraw();
            for (const p of table.players) {
                expect(handToCards(table.game.getHand(p) ?? buildHand([]), null), `seed ${String(seed)}`).toHaveLength(25);
            }
        }
    });

    it("after round 1 the kitty is exactly 8 cards", () => {
        for (const seed of SEEDS) {
            const { table } = simulate(seed);
            table.game.speedDraw();
            expect(table.game.getDipai(table.players[table.state.zhuang])).toHaveLength(8);
        }
    });
});

describe("several rounds in a row", () => {
    const ROUNDS = 6;

    // the game mutates `over` behind the compiler's back, so read it through a function
    const isOver = (table: Table): boolean => table.state.over;

    /** play whole rounds until `rounds` have finished or the game ends */
    function playRounds(seed: number, rounds: number, tableSize = 4) {
        seedRandom(seed);
        const table = newTable(tableSize);
        const rng = new RNG(seed * 31);
        const per = 25;
        const kittySize = 54 * (tableSize / 2) - per * tableSize;
        const finished: { round: number; log: ReturnType<typeof playRound> }[] = [];

        for (let round = 1; round <= rounds && !table.state.over; round++) {
            expect(table.state.round).toBe(round);
            expect(table.state.draw, `round ${String(round)} starts in the draw phase`).toBe(true);
            expect(table.state.turn, `round ${String(round)}: the zhuang draws first`).toBe(round === 1 ? 0 : table.state.zhuang);
            expect(table.state.discard, `round ${String(round)}: nothing seen yet`).toEqual([]);
            if (round > 1) {expect(table.state.trump.suit, `round ${String(round)}: no suit declared yet`).toBeNull();}

            table.game.speedDraw();

            for (const p of table.players) {
                expect(handToCards(table.game.getHand(p) ?? buildHand([]), null), `round ${String(round)} hand of ${p}`).toHaveLength(per);
            }
            const zhuang = table.players[table.state.zhuang];
            expect(table.game.getDipai(zhuang), `round ${String(round)} kitty`).toHaveLength(kittySize);
            expect(table.state.turn).toBe(table.state.zhuang);

            table.game.exchangeDipai(zhuang, [], []);
            const log = playRound(table, rng);
            expect(log.rejected, `round ${String(round)} had a rejected legal move`).toBe(0);
            expect(log.played, `round ${String(round)} plays every dealt card`).toHaveLength(per * tableSize);
            finished.push({ round, log });
        }
        return { table, finished };
    }

    it("every round deals evenly, starts at the zhuang and plays out cleanly (4 players)", () => {
        for (let seed = 1; seed <= 15; seed++) {
            const { finished } = playRounds(seed, ROUNDS);
            expect(finished.length, `seed ${String(seed)}`).toBeGreaterThanOrEqual(2);
        }
    });

    it("the same holds at other table sizes", () => {
        for (const size of [2, 6, 8]) {
            const { finished } = playRounds(3, 3, size);
            expect(finished.length, `${String(size)} players`).toBeGreaterThanOrEqual(2);
        }
    });

    it("the zhuang is always a valid seat and the rank never goes backwards", () => {
        for (let seed = 1; seed <= 10; seed++) {
            seedRandom(seed);
            const table = newTable();
            const rng = new RNG(seed);
            let previousRank = 2;
            for (let round = 1; round <= ROUNDS && !table.state.over; round++) {
                dealAndSkipKitty(table);
                playRound(table, rng);
                expect(table.state.zhuang).toBeGreaterThanOrEqual(0);
                expect(table.state.zhuang).toBeLessThan(4);
                // the two sides track their own rank, so compare the larger of the pair
                const best = Math.max(table.state.trump.rank, table.state.alt);
                expect(best).toBeGreaterThanOrEqual(previousRank);
                previousRank = best;
            }
        }
    });

    it("the discard pile is exactly the cards played so far in the current round", () => {
        seedRandom(4);
        const table = newTable();
        const rng = new RNG(4);
        for (let round = 1; round <= 3 && !table.state.over; round++) {
            dealAndSkipKitty(table);
            const startRound = table.state.round;
            let tricks = 0;
            while (table.state.round === startRound && !isOver(table)) {
                const before = table.state.discard.length;
                const log = playRound(table, rng, 1);
                if (table.state.round !== startRound) {break;}
                if (log.plays === 0) {break;}
                if (table.state.discard.length !== before) {tricks++;}
                expect(table.state.discard.length % 4).toBe(0);
            }
            expect(tricks).toBeGreaterThan(0);
        }
    });

    // GameRoom hands `game.discard` to the advisor as the cards already seen. Before the pile
    // was cleared between rounds, round 2 reported "appears 3 times, but only 2 decks" and the
    // advisor refused to give advice.
    it("the advisor accepts a position built from the live state in every round", () => {
        seedRandom(8);
        const table = newTable();
        const rng = new RNG(8);
        for (let round = 1; round <= 3 && !table.state.over; round++) {
            dealAndSkipKitty(table);
            const startRound = table.state.round;
            let checked = 0;
            while (table.state.round === startRound && !isOver(table)) {
                const { state, game, players } = table;
                const player = players[state.turn];
                const hand = handToCards(game.getHand(player) ?? buildHand([]), state.trump);
                const trick = players
                    .map((_, i) => state.info.get(players[(state.chu + i) % 4])?.play?.cards ?? [])
                    .slice(0, (state.turn - state.chu + 4) % 4)
                    .filter((cards) => cards.length > 0);

                const advice = analyse({ numPlayers: 4, decks: 2, trump: state.trump, hand, trick, seen: state.discard });
                expect(advice.problems, `round ${String(round)}, ${String(hand.length)} cards left`).toEqual([]);
                checked++;

                if (playRound(table, rng, 1).rejected) {break;}
            }
            expect(checked).toBeGreaterThan(10);
        }
    });
});
