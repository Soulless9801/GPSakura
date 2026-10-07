import { describe, expect, it } from "vitest";

import RNG from "/src/entities/rng";
import { legalMoves, moveKey, playInfo, toHand } from "/src/shengji/advisor/moves";
import { craft } from "/src/test/shengji";

import * as SJComp from "./comparison";
import type { Card, Rank, Suit, Trump } from "./entities";

const card = (suit: Suit, rank: number): Card => ({ suit, rank: rank as Rank });
const H = (rank: number): Card => card("hearts", rank);
const C = (rank: number): Card => card("clubs", rank);
const D = (rank: number): Card => card("diamonds", rank);
const S = (rank: number): Card => card("spades", rank);

const TRUMP: Trump = { suit: "spades", rank: 2 };
const key = (c: Card): string => `${c.suit}:${String(c.rank)}`;

function counts(cards: Card[]): Map<string, number> {
    const out = new Map<string, number>();
    for (const c of cards) {out.set(key(c), (out.get(key(c)) ?? 0) + 1);}
    return out;
}

const ihand = (cards: Card[], trump: Trump = TRUMP): SJComp.IHand => SJComp.handToInfo(toHand(cards), trump);

/** may `play` be led as a throw, given the other players' hands? */
function leadThrow(play: Card[], others: Card[][], trump: Trump = TRUMP): boolean {
    return SJComp.isShuaiValid(playInfo(play, trump), playInfo([], trump), ihand(play, trump), others.map(toHand), trump);
}

function followThrow(lead: Card[], hand: Card[], play: Card[], trump: Trump = TRUMP): boolean {
    return SJComp.isShuaiValid(playInfo(play, trump), playInfo(lead, trump), ihand(hand, trump), [], trump);
}

describe("leading a throw: can an opponent beat it?", () => {
    it("a lone top card cannot be beaten", () => {
        expect(leadThrow([H(14)], [[H(13), H(13)]])).toBe(true);
    });

    it("a card is beaten by any higher card of the suit", () => {
        expect(leadThrow([H(13)], [[H(14)]])).toBe(false);
    });

    it("an equal or lower card does not beat it", () => {
        expect(leadThrow([H(13)], [[H(13), H(12), H(3)]])).toBe(true);
    });

    it("a pair is beaten by a higher pair, not by singles and not by a lower pair", () => {
        const mine = [H(14), H(9), H(9)];
        expect(leadThrow(mine, [[H(13), H(12)]])).toBe(true);
        expect(leadThrow(mine, [[H(8), H(8)]])).toBe(true);
        expect(leadThrow(mine, [[H(10), H(10)]])).toBe(false);
    });

    it("a triple can supply the pair that beats a pair", () => {
        expect(leadThrow([H(14), H(9), H(9)], [[H(13), H(13), H(13)]])).toBe(false);
    });

    it("a pair cannot beat a triple component", () => {
        expect(leadThrow([H(14), H(9), H(9), H(9)], [[H(13), H(13)]])).toBe(true);
        expect(leadThrow([H(14), H(9), H(9), H(9)], [[H(13), H(13), H(13)]])).toBe(false);
    });

    it("a tractor is beaten only by a higher tractor, not by two separate pairs", () => {
        const mine = [H(14), H(9), H(9), H(10), H(10)];
        expect(leadThrow(mine, [[H(12), H(12), H(13), H(13)]])).toBe(false);
        expect(leadThrow(mine, [[H(12), H(12), H(11), H(11)]])).toBe(false); // 11-12 is a tractor above 9-10
        expect(leadThrow(mine, [[H(13), H(13), H(11), H(11)]])).toBe(true); // 11 and 13 are not consecutive
        expect(leadThrow(mine, [[H(7), H(7), H(8), H(8)]])).toBe(true);
    });

    it("a tractor can be beaten by one built from triples", () => {
        const mine = [H(14), H(9), H(9), H(10), H(10)];
        expect(leadThrow(mine, [[H(12), H(12), H(12), H(13), H(13), H(13)]])).toBe(false);
    });

    it("every component has to be safe, and one beatable component sinks the throw", () => {
        const mine = [H(14), H(13), H(9), H(9)];
        expect(leadThrow(mine, [[H(3)]])).toBe(true);
        expect(leadThrow(mine, [[H(10), H(10)]])).toBe(false); // beats the pair
    });

    it("any one of the opponents can sink it", () => {
        const mine = [H(13), H(12)];
        expect(leadThrow(mine, [[H(3)], [D(3)], [H(14)]])).toBe(false);
        expect(leadThrow(mine, [[H(3)], [D(3)], [C(14)]])).toBe(true);
    });

    it("other suits and ruffs do not count: only the throw's own line", () => {
        expect(leadThrow([H(14), H(13)], [[S(3), S(3), C(14)]])).toBe(true);
    });

    it("works in the trump line, including the trump rank and jokers", () => {
        const mine = [S(14), S(13)];
        expect(leadThrow(mine, [[H(2)]])).toBe(false); // an off-suit 2 is above the trump ace
        expect(leadThrow([card("jokers", 2)], [[card("jokers", 1), S(2)]])).toBe(true);
        expect(leadThrow([card("jokers", 1)], [[card("jokers", 2)]])).toBe(false);
    });

    it("must be a single line", () => {
        expect(leadThrow([], [])).toBe(false);
        expect(leadThrow([H(14), C(14)], [[D(3)]])).toBe(false);
        expect(leadThrow([S(14), H(2), card("jokers", 1)], [[D(3)]])).toBe(true);
    });

    it("cannot mix a plain suit with its trump-rank card", () => {
        expect(leadThrow([H(14), H(2)], [[C(3)]])).toBe(false);
        expect(leadThrow([H(14), H(2)], [[C(3)]], { suit: null, rank: 2 })).toBe(false);
        expect(leadThrow([H(14), H(2)], [[C(3)]], { suit: "hearts", rank: 2 })).toBe(true);
    });

    it("an empty field of opponents cannot beat anything", () => {
        expect(leadThrow([H(14), H(13)], [])).toBe(true);
    });
});

describe("leading a throw: independent oracle for 'beatable'", () => {
    /** can `opponent` beat the m-tuple run of n cards topped by `top`? written as plain loops */
    function oracleBeats(opponent: Card[], n: number, m: number, top: Card, trump: Trump): boolean {
        const held = counts(opponent.filter((c) => SJComp.checkInline(c, top, trump)));
        const line: Card[] = [];
        for (const k of held.keys()) {
            const [suit, rank] = k.split(":");
            line.push(card(suit as Suit, Number(rank)));
        }
        SJComp.sortCards(line, trump); // ascending

        for (let top2 = line.length - 1; top2 >= 0; top2--) {
            if (!SJComp.isCardBigger(line[top2], top, trump)) {continue;}
            let ok = true;
            for (let k = 0; k < n && ok; k++) {
                const idx = top2 - k;
                if (idx < 0 || (held.get(key(line[idx])) ?? 0) < m) {ok = false;}
                else if (k > 0 && !SJComp.isCardNext(line[idx + 1], line[idx], trump)) {ok = false;}
            }
            if (ok) {return true;}
        }
        return false;
    }

    function pool(rng: RNG, size: number, maxCopies: number, ranks: number[]): Card[] {
        const out: Card[] = [];
        const used = new Map<string, number>();
        let guard = 0;
        while (out.length < size && guard++ < 200) {
            const c = H(rng.pick(ranks));
            if ((used.get(key(c)) ?? 0) >= maxCopies) {continue;}
            used.set(key(c), (used.get(key(c)) ?? 0) + 1);
            out.push(c);
        }
        return out;
    }

    /** a run of 2-3 consecutive ranks held as pairs (or triples), plus a loose card */
    function tractorish(rng: RNG, ranks: number[], copies = 2): Card[] {
        const start = rng.int(0, ranks.length - 3);
        const length = rng.int(2, 3);
        const out: Card[] = [];
        for (let k = 0; k < length; k++) {
            for (let c = 0; c < copies; c++) {out.push(H(ranks[start + k]));}
        }
        if (rng.chance(0.5)) {out.push(H(rng.pick(ranks)));}
        return out;
    }

    it("agrees with a brute-force check on random throws and opponents", () => {
        const rng = new RNG(8080);
        const ranks = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
        let beatable = 0;
        let safe = 0;
        let withTractor = 0;

        for (let i = 0; i < 1500; i++) {
            const trump: Trump = rng.chance(0.5) ? TRUMP : { suit: "clubs", rank: rng.int(2, 14) as Rank };
            // half the throws are built around a run of consecutive pairs, so tractors are common
            const mine = rng.chance(0.5)
                ? tractorish(rng, ranks)
                : pool(rng, rng.int(1, 6), 2, ranks);
            const others = Array.from({ length: rng.int(1, 3) }, () => [
                ...(rng.chance(0.4) ? tractorish(rng, ranks, 3) : []),
                ...pool(rng, rng.int(1, 6), 3, ranks),
                ...(rng.chance(0.5) ? [C(14), D(3)] : []),
            ]);

            const struct = SJComp.playToInfo({ cards: [...mine], suit: null }, trump).struct;
            if (struct.cards.some((run) => run.length > 1)) {withTractor++;}

            // A printed suit can contain both plain cards and trump-rank cards; that is
            // two lines, and cannot be thrown even if no opponent could beat either part.
            let expected = mine.every(c => SJComp.checkInline(c, mine[0], trump));
            for (let g = 0; g < struct.cards.length && expected; g++) {
                const run = struct.cards[g];
                for (const opponent of others) {
                    if (oracleBeats(opponent, run.length, struct.count[g], run[run.length - 1], trump)) {
                        expected = false;
                        break;
                    }
                }
            }

            if (expected) {safe++;}
            else {beatable++;}
            expect(leadThrow(mine, others, trump), `trump ${JSON.stringify(trump)} mine ${moveKey(mine)} others ${others.map(moveKey).join(" / ")}`).toBe(expected);
        }

        expect(safe).toBeGreaterThan(100);
        expect(beatable).toBeGreaterThan(100);
        expect(withTractor).toBeGreaterThan(50);
    });
});

describe("following a throw", () => {
    const lead = [H(14), H(13), H(12)];

    it("answers with as many cards of the suit as were thrown", () => {
        expect(followThrow(lead, [H(3), H(4), H(5), C(14)], [H(3), H(4), H(5)])).toBe(true);
    });

    it("may not ignore the suit when able to follow it", () => {
        const hand = [H(3), H(4), H(5), C(14), C(13), C(12)];
        expect(followThrow(lead, hand, [C(14), C(13), C(12)])).toBe(false);
        expect(followThrow(lead, hand, [H(3), H(4), C(12)])).toBe(false);
    });

    it("dumps a short suit completely and pads with anything", () => {
        const hand = [H(3), C(4), C(5), S(14)];
        expect(followThrow(lead, hand, [H(3), C(4), C(5)])).toBe(true);
        expect(followThrow(lead, hand, [H(3), C(4), S(14)])).toBe(true);
        expect(followThrow(lead, hand, [C(4), C(5), S(14)])).toBe(false); // held a heart, did not play it
    });

    it("a void player may play any cards, mixed suits included", () => {
        const hand = [C(4), D(5), S(14), S(3)];
        expect(followThrow(lead, hand, [C(4), D(5), S(14)])).toBe(true);
    });

    it("must play exactly as many cards as were thrown", () => {
        const hand = [H(3), H(4), H(5), H(6)];
        expect(followThrow(lead, hand, [H(3), H(4)])).toBe(false);
        expect(followThrow(lead, hand, [H(3), H(4), H(5), H(6)])).toBe(false);
    });

    it("must play cards from the hand", () => {
        expect(followThrow(lead, [H(3), H(4), H(5)], [H(3), H(4), H(6)])).toBe(false);
    });

    it("a throw containing a pair is answered by a pair when one is held", () => {
        const pairThrow = [H(14), H(9), H(9)];
        const hand = [H(3), H(3), H(7), H(8)];
        expect(followThrow(pairThrow, hand, [H(3), H(3), H(7)])).toBe(true);
        expect(followThrow(pairThrow, hand, [H(3), H(7), H(8)])).toBe(false);
    });

    it("the same rules apply when the advisor asks (isPlayValid delegates for throw leads)", () => {
        const hand = [H(3), C(4), C(5), S(14)];
        const viaPlayValid = (play: Card[]): boolean =>
            SJComp.isPlayValid(playInfo(play, TRUMP), playInfo(lead, TRUMP), ihand(hand), TRUMP);
        expect(viaPlayValid([H(3), C(4), C(5)])).toBe(true);
        expect(viaPlayValid([C(4), C(5), S(14)])).toBe(false);
        expect(viaPlayValid([H(3)])).toBe(false);
    });
});

describe("following a throw made only of singles (independent oracle)", () => {
    // With no pairs in the throw there is no structure to match, so the rules reduce to
    // "same number of cards, follow the suit, dump a short suit".
    function oracle(hand: Card[], lead: Card[], play: Card[], trump: Trump): boolean {
        if (play.length !== lead.length) {return false;}
        const held = counts(hand);
        for (const [k, n] of counts(play)) {
            if ((held.get(k) ?? 0) < n) {return false;}
        }
        const inLine = (c: Card): boolean => SJComp.checkInline(c, lead[0], trump);
        const suitCards = hand.filter(inLine);
        if (suitCards.length >= lead.length) {return play.every(inLine);}
        const played = counts(play);
        return [...counts(suitCards)].every(([k, n]) => (played.get(k) ?? 0) >= n);
    }

    function subsets(hand: Card[], size: number): Card[][] {
        const seen = new Set<string>();
        const out: Card[][] = [];
        const pick = (start: number, chosen: Card[]): void => {
            if (chosen.length === size) {
                const id = moveKey(chosen);
                if (!seen.has(id)) {
                    seen.add(id);
                    out.push([...chosen]);
                }
                return;
            }
            for (let i = start; i < hand.length; i++) {
                chosen.push(hand[i]);
                pick(i + 1, chosen);
                chosen.pop();
            }
        };
        pick(0, []);
        return out;
    }

    it("agrees on every possible reply", () => {
        const rng = new RNG(31337);
        const all = [H(3), H(5), H(8), H(9), H(11), C(3), C(9), D(4), S(3), S(9), H(2), card("jokers", 1)];
        let checked = 0;

        for (let i = 0; i < 300; i++) {
            const trump: Trump = rng.chance(0.5) ? TRUMP : { suit: "hearts", rank: 6 };
            const size = rng.int(2, 4);
            const hand = Array.from({ length: rng.int(size, 8) }, () => rng.pick(all));
            const lead = [H(14), H(13), H(12), H(10)].slice(0, size);

            for (const play of subsets(hand, size)) {
                checked++;
                expect(followThrow(lead, hand, play, trump), `trump ${JSON.stringify(trump)} hand ${moveKey(hand)} lead ${moveKey(lead)} play ${moveKey(play)}`).toBe(
                    oracle(hand, lead, play, trump),
                );
            }
        }
        expect(checked).toBeGreaterThan(2000);
    });

    it("matches an independent oracle for a tractor, a pair, and two singles", () => {
        const rng = new RNG(92831);
        // Eight cards: a 9-10 tractor, a pair of queens, and two singles.
        const lead = [H(9), H(9), H(10), H(10), H(12), H(12), H(13), H(14)];
        let checked = 0;
        let legal = 0;
        let illegal = 0;
        for (let trial = 0; trial < 150; trial++) {
            const hand: Card[] = [];
            for (const rank of [3, 4, 5, 6, 7, 8]) {
                for (let copy = rng.int(0, 2); copy > 0; copy--) {hand.push(H(rank));}
            }
            while (hand.length < 10) {hand.push(C(rng.int(3, 14)));}
            const trump: Trump = trial % 2 ? TRUMP : { suit: "hearts", rank: 2 };
            const held = counts(hand);
            const heldPairs = [3, 4, 5, 6, 7, 8].filter(rank => held.get(key(H(rank))) === 2);
            const needsTractor = heldPairs.some(rank => heldPairs.includes(rank + 1));
            for (const play of subsets(hand, lead.length)) {
                const played = counts(play);
                const playedPairs = heldPairs.filter(rank => played.get(key(H(rank))) === 2);
                const hasTractor = playedPairs.some(rank => playedPairs.includes(rank + 1));
                const expected = oracle(hand, lead, play, trump)
                    && playedPairs.length >= Math.min(3, heldPairs.length)
                    && (!needsTractor || hasTractor);
                expect(followThrow(lead, hand, play, trump), `hand ${moveKey(hand)} play ${moveKey(play)}`).toBe(expected);
                checked++;
                if (expected) {legal++;} else {illegal++;}
            }
        }
        expect(checked).toBeGreaterThan(1000);
        expect(legal).toBeGreaterThan(100);
        expect(illegal).toBeGreaterThan(100);
    });
});

describe("the advisor can answer a throw", () => {
    const lead = [H(14), H(13), H(12)];

    // legalMoves asks isPlayValid, which used to treat any lead that was not a single group as
    // "play any single group", so a throw left the advisor with no legal reply whatsoever.
    it.each([
        ["a hand holding the suit", [H(3), H(4), H(5), C(9)]],
        ["a short suit", [H(3), C(4), C(5), C(6)]],
        ["a void hand", [C(3), C(4), C(5), C(6)]],
        ["a pair in the suit", [H(3), H(3), H(4), C(9)]],
    ])("offers legal replies to a throw from %s", (_label, hand) => {
        const moves = legalMoves(hand, lead, TRUMP);
        expect(moves.length).toBeGreaterThan(0);
        for (const move of moves) {
            expect(move).toHaveLength(3);
            expect(followThrow(lead, hand, move), moveKey(move)).toBe(true);
        }
    });

    it("never offers a play that breaks the suit-following rule", () => {
        const hand = [H(3), C(4), C(5), C(6)];
        for (const move of legalMoves(hand, lead, TRUMP)) {
            expect(move.some((c) => key(c) === "hearts:3"), moveKey(move)).toBe(true);
        }
    });

    it("every hand has some reply to a random throw (no deadlock)", () => {
        const rng = new RNG(555);
        const ranks = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
        for (let i = 0; i < 200; i++) {
            const throwSize = rng.int(2, 5);
            const thrown = Array.from({ length: throwSize }, () => H(rng.pick(ranks)));
            const struct = playInfo(thrown, TRUMP).struct;
            if (struct.cards.length < 2) {continue; } // want a real throw: more than one group
            const hand = Array.from({ length: rng.int(throwSize, 10) }, () =>
                rng.pick([H(rng.pick(ranks)), C(rng.pick(ranks)), D(rng.pick(ranks)), S(rng.pick(ranks))]),
            );
            expect(legalMoves(hand, thrown, TRUMP).length, `throw ${moveKey(thrown)} hand ${moveKey(hand)}`).toBeGreaterThan(0);
        }
    });
});

describe("a throw through the game", () => {
    // seat 0 throws A K Q of hearts; nobody else holds a heart that could beat it
    function setup() {
        return craft({
            hands: {
                p0: [H(14), H(13), H(12), C(3)],
                p1: [H(3), C(4), C(5), C(6)], // short in hearts: dump the 3, pad with clubs
                p2: [D(3), D(4), D(5), D(6)], // void: anything
                p3: [H(4), H(5), H(6), C(9)], // can follow in full
            },
            overrides: { count: 4, atk: 1, trump: { suit: "spades", rank: 2 } },
        });
    }

    it("is accepted when unbeatable and makes the trick a throw", () => {
        const { game, state } = setup();
        expect(game.tryShuai("p0", { cards: [H(14), H(13), H(12)], suit: null })).toBe(true);
        expect(state.shuai).toBe(true);
        expect(state.turn).toBe(1);
    });

    it("is refused when an opponent could beat a component", () => {
        const { game, state } = craft({
            hands: { p0: [H(13), H(12), C(3)], p1: [H(14), C(4)], p2: [D(3)], p3: [D(4)] },
            overrides: { count: 3, atk: 1 },
        });
        expect(game.tryShuai("p0", { cards: [H(13), H(12)], suit: null })).toBe(false);
        expect(state.shuai).toBe(false);
        expect(state.turn).toBe(0);
    });

    it("followers cannot answer short, and a dumped short suit plus padding is accepted", () => {
        const { game } = setup();
        game.tryShuai("p0", { cards: [H(14), H(13), H(12)], suit: null });

        expect(game.tryShuai("p1", { cards: [H(3)], suit: null })).toBe(false); // too few cards
        expect(game.tryShuai("p1", { cards: [C(4), C(5), C(6)], suit: null })).toBe(false); // kept the heart
        expect(game.tryShuai("p1", { cards: [H(3), C(4), C(5)], suit: null })).toBe(true);
    });

    it("plays out to the end of the trick, with the right winner and card count", () => {
        const { game, state } = setup();
        game.tryShuai("p0", { cards: [H(14), H(13), H(12)], suit: null });
        game.tryShuai("p1", { cards: [H(3), C(4), C(5)], suit: null });
        game.tryShuai("p2", { cards: [D(3), D(4), D(5)], suit: null });
        game.tryShuai("p3", { cards: [H(4), H(5), H(6)], suit: null });

        expect(state.count).toBe(1); // 4 - 3 cards
        expect(state.shuai).toBe(false);
        expect(state.lead).toBe(0); // the throw cannot be beaten
        expect(state.chu).toBe(0);
        expect(state.turn).toBe(0);
        expect(state.discard).toHaveLength(12);
    });

    it("a ruff of a throw needs the same number of trumps", () => {
        const { game, state } = craft({
            hands: { p0: [H(14), H(13), C(3)], p1: [S(3), S(4), C(4)], p2: [D(3), D(4)], p3: [D(5), D(6)] },
            overrides: { count: 3, atk: 1 },
        });
        game.tryShuai("p0", { cards: [H(14), H(13)], suit: null });
        expect(game.tryShuai("p1", { cards: [S(3), S(4)], suit: null })).toBe(true); // void in hearts: free to ruff
        expect(state.lead).toBe(1);
    });
});
