import { describe, expect, it } from "vitest";

import * as SJComp from "/src/shengji/core/comparison";

import RNG from "/src/entities/rng";

import { analyse, unseenCounts, winningPosition } from "./advisor";
import { legalMoves, moveKey, playInfo, toHand } from "./moves";
import type { Card, Move, Position, Trump } from "./types";

const TRUMP: Trump = { suit: "spades", rank: 2 };

const H = (rank: number): Card => ({ suit: "hearts", rank: rank as Card["rank"] });
const S = (rank: number): Card => ({ suit: "spades", rank: rank as Card["rank"] });
const C = (rank: number): Card => ({ suit: "clubs", rank: rank as Card["rank"] });

function position(over: Partial<Position>): Position {
    return {
        numPlayers: 4,
        decks: 2,
        trump: TRUMP,
        hand: [],
        trick: [],
        seen: [],
        ...over,
    };
}

const keys = (moves: Move[]): Set<string> => new Set(moves.map(moveKey));

describe("legal move generation", () => {
    it("offers every single and the pair when leading", () => {
        const hand: Card[] = [H(5), H(6), H(6), H(7), C(14)];
        const found = keys(legalMoves(hand, null, TRUMP));

        expect(found.has(moveKey([H(5)]))).toBe(true);
        expect(found.has(moveKey([C(14)]))).toBe(true);
        expect(found.has(moveKey([H(6), H(6)]))).toBe(true);
        // 6-7 is consecutive but only the 6 is held twice, so there is no tractor
        expect(found.has(moveKey([H(6), H(6), H(7), H(7)]))).toBe(false);
    });

    it("offers a tractor when two consecutive pairs are held", () => {
        const hand: Card[] = [H(6), H(6), H(7), H(7), C(14)];
        const found = keys(legalMoves(hand, null, TRUMP));
        expect(found.has(moveKey([H(6), H(6), H(7), H(7)]))).toBe(true);
    });

    it("forces you to follow the led suit", () => {
        const hand: Card[] = [H(5), H(9), C(14), S(3)];
        const moves = legalMoves(hand, [H(12)], TRUMP);

        expect(moves.length).toBeGreaterThan(0);
        for (const move of moves) {
            expect(move.length).toBe(1);
            expect(move[0].suit).toBe("hearts");
        }
    });

    it("lets you discard anything once you are void in the led suit", () => {
        const hand: Card[] = [C(14), C(3), S(3)];
        const moves = legalMoves(hand, [H(12)], TRUMP);
        expect(moves.length).toBe(3);
    });

    it("never produces a play the engine calls illegal", () => {
        const hand: Card[] = [H(5), H(6), H(6), H(9), C(14), C(3), S(4)];
        const lead: Move = [H(12), H(12)];
        const ihand = SJComp.handToInfo(toHand(hand), TRUMP);
        const ilead = playInfo(lead, TRUMP);

        const moves = legalMoves(hand, lead, TRUMP);
        expect(moves.length).toBeGreaterThan(0);
        for (const move of moves) {
            expect(SJComp.isPlayValid(playInfo(move, TRUMP), ilead, ihand, TRUMP)).toBe(true);
        }
    });
    it("allows non-splitting of triples when playing pairs", () => {
        const hand: Card[] = [H(6), H(6), H(6), H(7), H(8)];
        const lead: Move = [H(12), H(12)];
        const moves = legalMoves(hand, lead, TRUMP);
        expect(moves).toContainEqual([H(7), H(8)]);
    });
    it("allows filling in of a triple tlj with equal number of pairs", () => {
        const hand: Card[] = [H(6), H(6), H(7), H(7), H(8), H(8), H(9), H(10)];
        const lead: Move = [H(12), H(12), H(12), H(13), H(13), H(13)];
        const moves = legalMoves(hand, lead, TRUMP);
        expect(moves).toContainEqual([H(6), H(6), H(7), H(7), H(9), H(10)]);
    });
    it("allows killing with main when out of a suit", () => {
        const hand: Card[] = [S(9), S(10)];
        const lead: Move = [H(12)];
        const moves = legalMoves(hand, lead, TRUMP);
        expect(moves).toContainEqual([S(9)]);
    });
});

describe("reading the trick", () => {
    it("tracks who is winning", () => {
        expect(winningPosition([[H(14)], [H(3)]], TRUMP)).toBe(0);
        expect(winningPosition([[H(3)], [H(14)]], TRUMP)).toBe(1);
        // a trump ruffs a plain lead
        expect(winningPosition([[H(14)], [S(3)]], TRUMP)).toBe(1);
        expect(winningPosition([], TRUMP)).toBe(null);
    });
});

describe("advice", () => {
    it("feeds points to a winning partner", () => {
        // positions 0 and 2 are partners; the leader took it with the ace
        const advice = analyse(
            position({
                hand: [H(13), H(3), H(4)],
                trick: [[H(14)], [H(6)]],
            }),
        );

        expect(advice.problems).toEqual([]);
        expect(advice.facts.winningSide).toBe("partner");
        expect(advice.candidates[0].move.map((c) => c.rank)).toEqual([13]);
        expect(advice.candidates[0].rules.map((r) => r.id)).toContain(
            "feed-points-to-a-winning-partner",
        );
    });

    it("holds points back when an opponent has the trick", () => {
        // one play so far, so the opponent at position 0 is winning and I am at 1
        const advice = analyse(
            position({
                hand: [H(13), H(3), H(4)],
                trick: [[H(14)]],
            }),
        );

        expect(advice.facts.winningSide).toBe("opponent");
        expect(advice.candidates[0].move[0].rank).not.toBe(13);

        // the rule scales by points in the move, so it only bites on the King — and it
        // has to push the King to the bottom of the ranking
        const king = advice.candidates.find((c) => c.move[0].rank === 13);
        expect(king).toBeDefined();
        if (!king) {return;}
        expect(king.rules.map((r) => r.id)).toContain("hold-points-when-you-are-losing");
        expect(king.score).toBe(Math.min(...advice.candidates.map((c) => c.score)));
    });

    it("will not ruff a trick carrying no points", () => {
        // void in hearts, holding trumps and junk, nothing in the pot
        const advice = analyse(
            position({
                hand: [S(14), C(3), C(4)],
                trick: [[H(9)]],
            }),
        );

        expect(advice.facts.potPoints).toBe(0);
        expect(advice.candidates[0].move[0].suit).not.toBe("spades");
    });

    it("reports every legal option, best first", () => {
        const advice = analyse(position({ hand: [H(5), H(6), H(6), C(14)] }));

        expect(advice.problems).toEqual([]);
        expect(advice.candidates.length).toBe(advice.facts.legalMoveCount);
        for (let i = 1; i < advice.candidates.length; i++) {
            expect(advice.candidates[i - 1].score).toBeGreaterThanOrEqual(advice.candidates[i].score);
        }
    });

    it("rejects a position holding more copies than the pack has", () => {
        const advice = analyse(position({ hand: [H(5), H(5), H(5)] }));
        expect(advice.problems.length).toBeGreaterThan(0);
        expect(advice.candidates).toEqual([]);
    });

    it("rejects a trick with mismatched play lengths", () => {
        const advice = analyse(
            position({ hand: [H(5), H(6)], trick: [[H(9), H(9)], [H(3)]] }),
        );
        expect(advice.problems.length).toBeGreaterThan(0);
    });
});

describe("unseen cards", () => {
    it("starts from `decks` copies of every card and subtracts hand, seen and trick", () => {
        const unseen = unseenCounts(
            position({ hand: [H(5), H(5)], seen: [H(5)], trick: [[S(14)]], decks: 2 }),
        );
        const count = (c: Card): number => unseen.find(([u]) => u.suit === c.suit && u.rank === c.rank)?.[1] ?? 0;

        expect(count(H(5))).toBe(0); // 2 held + 1 seen > 2 decks: floored out of the list
        expect(count(S(14))).toBe(1);
        expect(count(H(6))).toBe(2);
    });

    it("totals 54 x decks minus everything accounted for", () => {
        const unseen = unseenCounts(position({ hand: [H(5), H(6)], seen: [C(3)], trick: [[H(7)], [H(8)]], decks: 2 }));
        expect(unseen.reduce((sum, [, n]) => sum + n, 0)).toBe(108 - 5);
    });

    it("ignores cards that are not in the pack", () => {
        const unseen = unseenCounts(position({ hand: [{ suit: "hearts", rank: 1 }], decks: 2 }));
        expect(unseen.reduce((sum, [, n]) => sum + n, 0)).toBe(108);
    });
});

describe("position validation", () => {
    it("wants an even player count", () => {
        expect(analyse(position({ numPlayers: 5, hand: [H(5)] })).problems.join(" ")).toMatch(/even/i);
    });

    it("complains when the trick is already full", () => {
        const full = analyse(position({ hand: [H(5)], trick: [[H(3)], [H(4)], [H(6)], [H(7)]] }));
        expect(full.problems.join(" ")).toMatch(/nobody is left/i);
        expect(full.candidates).toEqual([]);
    });

    it("complains about an empty hand", () => {
        expect(analyse(position({ hand: [] })).problems.join(" ")).toMatch(/holding/i);
    });

    it("complains about an empty play in the trick", () => {
        expect(analyse(position({ hand: [H(5)], trick: [[]] })).problems.join(" ")).toMatch(/at least one card/i);
    });

    it("complains when the lead is bigger than the hand", () => {
        const advice = analyse(position({ hand: [H(5)], trick: [[H(9), H(9)]] }));
        expect(advice.problems.join(" ")).toMatch(/only holding/i);
    });

    it("counts copies across hand, seen and trick together", () => {
        const advice = analyse(position({ hand: [H(5)], seen: [H(5)], trick: [[H(5)]] }));
        expect(advice.problems.join(" ")).toMatch(/5 of hearts appears 3 times/);
    });

    it("names the jokers in the copies message", () => {
        const advice = analyse(position({ hand: [{ suit: "jokers", rank: 2 }, { suit: "jokers", rank: 2 }, { suit: "jokers", rank: 2 }] }));
        expect(advice.problems.join(" ")).toMatch(/Big joker/);
    });

    it("reports a hand with no legal reply instead of throwing", () => {
        // a lone card that cannot make the required two-card answer
        const advice = analyse(position({ hand: [H(5)], trick: [[H(9), H(9)]] }));
        expect(advice.candidates).toEqual([]);
        expect(advice.problems.length).toBeGreaterThan(0);
    });
});

describe("facts", () => {
    it("reports the phase from the number of cards left", () => {
        const early = analyse(position({ hand: Array.from({ length: 13 }, (_, i) => H(i + 2)) }));
        const late = analyse(position({ hand: Array.from({ length: 12 }, (_, i) => H(i + 2)) }));
        expect(early.facts.phase).toBe("early");
        expect(late.facts.phase).toBe("late");
    });

    it("counts the points already in the pot", () => {
        const advice = analyse(position({ hand: [H(3), H(4)], trick: [[H(5)], [H(10)], [H(13)]] }));
        expect(advice.facts.potPoints).toBe(25);
        expect(advice.facts.leading).toBe(false);
    });

    it("says the player is leading when the trick is empty", () => {
        const advice = analyse(position({ hand: [H(3)] }));
        expect(advice.facts).toMatchObject({ leading: true, winningPosition: null, winningSide: null });
    });

    it("identifies the trick winner including ruffs and later plays", () => {
        const trick: Move[] = [[H(9)], [H(14)], [S(3)], [S(2)]];
        expect(winningPosition(trick, TRUMP)).toBe(3);
        expect(winningPosition([[H(9)], [C(14)]], TRUMP)).toBe(0);
        expect(winningPosition([[H(9), H(9)], [H(14), H(3)]], TRUMP)).toBe(0); // wrong shape cannot win
    });
});

describe("candidate properties", () => {
    function randomPosition(rng: RNG): Position {
        const all: Card[] = [];
        for (const suit of ["spades", "hearts", "diamonds", "clubs"] as const) {
            for (let r = 2; r <= 14; r++) {all.push({ suit, rank: r as Card["rank"] });}
        }
        all.push({ suit: "jokers", rank: 1 }, { suit: "jokers", rank: 2 });
        const pool = rng.shuffle([...all, ...all]);

        const size = rng.int(1, 12);
        const hand = pool.splice(0, size);
        const leadLen = rng.int(1, Math.min(2, size));
        const seatsBefore = rng.int(0, 3);
        const trick: Move[] = [];
        if (seatsBefore > 0) {
            const lead = pool.splice(0, leadLen);
            const sameSuit = lead.every((c) => c.suit === lead[0].suit && c.rank === lead[0].rank);
            const first = sameSuit ? lead : [lead[0]];
            trick.push(first);
            for (let i = 1; i < seatsBefore; i++) {trick.push(pool.splice(0, first.length));}
        }
        return position({ hand, trick, trump: { suit: rng.pick(["spades", "hearts", "clubs", null] as const), rank: rng.int(2, 14) as Card["rank"] } });
    }

    it("never throws, and every candidate is a legal, correctly sized play with sane numbers", () => {
        const rng = new RNG(20240607);
        let analysed = 0;
        for (let i = 0; i < 150; i++) {
            const pos = randomPosition(rng);
            const advice = analyse(pos);
            if (advice.problems.length) {continue;}
            analysed++;

            const ihand = SJComp.handToInfo(toHand(pos.hand), pos.trump);
            const lead = pos.trick.length ? pos.trick[0] : null;
            for (const cand of advice.candidates) {
                if (lead) {
                    expect(cand.move).toHaveLength(lead.length);
                    expect(SJComp.isPlayValid(playInfo(cand.move, pos.trump), playInfo(lead, pos.trump), ihand, pos.trump)).toBe(true);
                }
                expect(Number.isFinite(cand.score)).toBe(true);
                if (cand.winProbability !== null) {
                    expect(cand.winProbability).toBeGreaterThanOrEqual(0);
                    expect(cand.winProbability).toBeLessThanOrEqual(1);
                }
                expect(cand.pointsAdded).toBe(cand.move.reduce((n, c) => n + (c.rank === 5 ? 5 : c.rank === 10 || c.rank === 13 ? 10 : 0), 0));
            }
            expect(advice.candidates).toHaveLength(advice.facts.legalMoveCount);
        }
        expect(analysed).toBeGreaterThan(50);
    });

    it("is deterministic", () => {
        const pos = position({ hand: [H(5), H(6), H(6), C(14), S(3)], trick: [[H(12)]] });
        expect(analyse(pos)).toEqual(analyse(pos));
    });

    it("does not modify the position it is given", () => {
        const pos = position({ hand: [H(9), H(3), H(6)], trick: [[H(12)]] });
        const snapshot = JSON.parse(JSON.stringify(pos)) as Position;
        analyse(pos);
        expect(pos).toEqual(snapshot);
    });

    it("the winning side is 'partner' or 'opponent' once someone has played", () => {
        const advice = analyse(position({ hand: [H(3)], trick: [[H(9)], [H(10)]] }));
        expect(["partner", "opponent"]).toContain(advice.facts.winningSide);
    });

    it("says the trick closes in the player's favour with probability 1", () => {
        // I am the last seat; my partner (seat 1... positions 1 and 3 are partners) has the ace
        const advice = analyse(position({ hand: [H(3), H(4)], trick: [[H(9)], [H(14)], [H(5)]] }));
        for (const cand of advice.candidates) {expect(cand.winProbability).toBe(1);}
    });

    it("says it closes against the player with probability 0 when an opponent wins and cannot be beaten", () => {
        const advice = analyse(position({ hand: [H(3), H(4)], trick: [[H(14)], [H(5)], [H(6)]] }));
        expect(advice.facts.winningSide).toBe("opponent");
        for (const cand of advice.candidates) {expect(cand.winProbability).toBe(0);}
    });
});
