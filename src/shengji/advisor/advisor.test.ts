import { describe, expect, it } from "vitest";

import * as SJComp from "/src/shengji/core/comparison";

import { analyse, winningPosition } from "./advisor";
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
        const king = advice.candidates.find((c) => c.move[0].rank === 13)!;
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
