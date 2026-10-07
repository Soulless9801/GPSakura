import { describe, expect, it } from "vitest";

import * as SJComp from "/src/shengji/core/comparison";

import {
    SUITS,
    allCards,
    cardKey,
    distinctCounts,
    legalMoves,
    moveKey,
    playInfo,
    pointValue,
    strengthOrder,
    toHand,
    totalPoints,
} from "./moves";
import type { Card, Move, Rank, Suit, Trump } from "./types";

const card = (suit: Suit, rank: number): Card => ({ suit, rank: rank as Rank });
const H = (rank: number): Card => card("hearts", rank);
const S = (rank: number): Card => card("spades", rank);
const C = (rank: number): Card => card("clubs", rank);
const D = (rank: number): Card => card("diamonds", rank);
const SJ = card("jokers", 1);
const BJ = card("jokers", 2);

const TRUMP: Trump = { suit: "spades", rank: 2 };

const keys = (moves: Move[]): Set<string> => new Set(moves.map(moveKey));

describe("keys", () => {
    it("cardKey is suit:rank", () => {
        expect(cardKey(H(10))).toBe("hearts:10");
        expect(cardKey(BJ)).toBe("jokers:2");
    });

    it("moveKey ignores order but not content", () => {
        expect(moveKey([H(3), H(5)])).toBe(moveKey([H(5), H(3)]));
        expect(moveKey([H(3), H(3)])).not.toBe(moveKey([H(3)]));
        expect(moveKey([H(3), C(3)])).not.toBe(moveKey([H(3), H(3)]));
    });
});

describe("allCards", () => {
    it("is the 54 distinct cards of one pack", () => {
        const cards = allCards();
        expect(cards).toHaveLength(54);
        expect(new Set(cards.map(cardKey)).size).toBe(54);
        expect(cards.filter((c) => c.suit === "jokers")).toHaveLength(2);
        expect(cards.some((c) => c.rank === 1 && c.suit !== "jokers")).toBe(false);
    });

    it("lists suits in the documented enumeration order", () => {
        expect(SUITS).toEqual(["spades", "hearts", "diamonds", "clubs"]);
        expect(allCards()[0]).toEqual(S(2));
    });
});

describe("points", () => {
    it("pointValue and totalPoints agree with the game rules", () => {
        expect(pointValue(H(5))).toBe(5);
        expect(totalPoints([H(5), H(10), S(13), C(3)])).toBe(25);
        expect(totalPoints([])).toBe(0);
    });

    it("one pack carries 100 points", () => {
        expect(totalPoints(allCards())).toBe(100);
    });
});

describe("toHand / distinctCounts", () => {
    it("toHand counts copies", () => {
        const hand = toHand([H(3), H(3), S(4)]);
        expect(hand.countCard(H(3))).toBe(2);
        expect(hand.countCard(S(4))).toBe(1);
    });

    it("distinctCounts groups by card and sorts by suit then rank", () => {
        const out = distinctCounts([S(4), H(9), H(3), H(9), C(2)]);
        expect(out.map(([c, n]) => `${cardKey(c)}x${String(n)}`)).toEqual([
            "clubs:2x1",
            "hearts:3x1",
            "hearts:9x2",
            "spades:4x1",
        ]);
    });

    it("distinctCounts copies the cards it returns", () => {
        const input = [H(3)];
        const [[first]] = distinctCounts(input);
        expect(first).not.toBe(input[0]);
        expect(first).toEqual(input[0]);
    });
});

describe("playInfo", () => {
    it("does not reorder the caller's array", () => {
        const cards = [H(9), H(3)];
        playInfo(cards, TRUMP);
        expect(cards).toEqual([H(9), H(3)]);
    });

    it("returns the sorted play", () => {
        expect(playInfo([H(9), H(3)], TRUMP).play.cards).toEqual([H(3), H(9)]);
    });
});

describe("strengthOrder", () => {
    it("ranks every card, weakest 0 and the big joker 53", () => {
        const order = strengthOrder(TRUMP);
        expect(order.size).toBe(54);
        expect(new Set(order.values()).size).toBe(54);
        expect(order.get(cardKey(BJ))).toBe(53);
        expect(order.get(cardKey(SJ))).toBe(52);
        expect(order.get(cardKey(S(2)))).toBe(51);
    });

    it("puts every trump above every plain card", () => {
        const order = strengthOrder(TRUMP);
        const plain = Math.max(...allCards().filter((c) => !SJComp.isMainLine(c, TRUMP)).map((c) => order.get(cardKey(c)) ?? -1));
        const main = Math.min(...allCards().filter((c) => SJComp.isMainLine(c, TRUMP)).map((c) => order.get(cardKey(c)) ?? 99));
        expect(plain).toBeLessThan(main);
    });

    it("follows the trump rank: the big joker still wins when the rank changes", () => {
        const order = strengthOrder({ suit: "hearts", rank: 9 });
        expect(order.get(cardKey(BJ))).toBe(53);
        expect(order.get(cardKey(H(9)))).toBe(51);
        expect(order.get(cardKey(H(14)))).toBeGreaterThan(order.get(cardKey(S(14))) ?? 99);
    });
});

describe("leading moves", () => {
    it("is empty for an empty hand", () => {
        expect(legalMoves([], null, TRUMP)).toEqual([]);
        expect(legalMoves([], [H(3)], TRUMP)).toEqual([]);
    });

    it("treats an empty lead array as leading", () => {
        expect(legalMoves([H(3)], [], TRUMP)).toEqual([[H(3)]]);
    });

    it("one distinct single per card", () => {
        expect(legalMoves([H(3), C(4), S(5)], null, TRUMP)).toHaveLength(3);
    });

    it("contains no duplicates", () => {
        const moves = legalMoves([H(3), H(3), H(4), H(4), H(5), H(5)], null, TRUMP);
        expect(moves).toHaveLength(keys(moves).size);
    });

    it("offers a tractor of every length that fits", () => {
        const found = keys(legalMoves([H(3), H(3), H(4), H(4), H(5), H(5)], null, TRUMP));
        expect(found.has(moveKey([H(3), H(3), H(4), H(4)]))).toBe(true);
        expect(found.has(moveKey([H(4), H(4), H(5), H(5)]))).toBe(true);
        expect(found.has(moveKey([H(3), H(3), H(4), H(4), H(5), H(5)]))).toBe(true);
        expect(found.has(moveKey([H(3), H(3), H(5), H(5)]))).toBe(false); // not consecutive
    });

    it("offers triples and triple-tractors as well as pairs", () => {
        const hand = [H(6), H(6), H(6), H(7), H(7), H(7)];
        const found = keys(legalMoves(hand, null, TRUMP));
        expect(found.has(moveKey([H(6), H(6), H(6)]))).toBe(true);
        expect(found.has(moveKey([H(6), H(6), H(6), H(7), H(7), H(7)]))).toBe(true);
        expect(found.has(moveKey([H(6), H(6)]))).toBe(true);
    });

    it("bridges the skipped trump rank inside a suit", () => {
        const T3: Trump = { suit: "spades", rank: 3 };
        const found = keys(legalMoves([H(2), H(2), H(4), H(4)], null, T3));
        expect(found.has(moveKey([H(2), H(2), H(4), H(4)]))).toBe(true);
    });

    it("every lead it produces is a single group the engine accepts", () => {
        const hand = [H(3), H(3), H(4), H(4), S(14), S(14), H(2), H(2), SJ, SJ, BJ, C(9)];
        const ihand = SJComp.handToInfo(toHand(hand), TRUMP);
        const empty = playInfo([], TRUMP);
        for (const move of legalMoves(hand, null, TRUMP)) {
            expect(SJComp.isPlayValid(playInfo(move, TRUMP), empty, ihand, TRUMP), moveKey(move)).toBe(true);
        }
    });
});

describe("following moves", () => {
    it("follows a pair with a pair of the suit, or loose cards when none is held", () => {
        const found = keys(legalMoves([H(3), H(3), H(9), C(4)], [H(12), H(12)], TRUMP));
        expect(found.has(moveKey([H(3), H(3)]))).toBe(true);
    });

    it("when short in the suit, dumps all of it and fills from elsewhere", () => {
        const moves = legalMoves([H(3), C(4), C(5), S(6)], [H(12), H(12)], TRUMP);
        expect(moves.length).toBeGreaterThan(0);
        for (const move of moves) {expect(move.some((c) => cardKey(c) === "hearts:3")).toBe(true);}
    });

    it("rebuilds the full set when the trimmed candidate list holds no legal play", () => {
        // maxCandidates = 1 trims to a single arbitrary candidate; the fallback must still find plays
        const hand = [H(3), H(4), H(5), H(6), C(7), C(8)];
        expect(legalMoves(hand, [H(12), H(12)], TRUMP, 1).length).toBeGreaterThan(0);
    });

    it("caps the follow list by maxCandidates before validation", () => {
        const hand = [C(3), C(4), C(5), C(6), C(7), C(8), C(9), C(10), C(11), C(12), C(13), C(14)];
        const capped = legalMoves(hand, [H(12), H(12), H(13), H(13)], TRUMP, 5);
        expect(capped.length).toBeLessThanOrEqual(5);
        expect(capped.length).toBeGreaterThan(0);
    });

    it("prefers cheap cards when trimming (point cards come last)", () => {
        const hand = [H(5), H(6), H(7), H(10)];
        const [first] = legalMoves(hand, [H(12)], TRUMP, 1);
        expect(first[0].rank).toBe(6); // the cheapest: no points, lowest rank
    });

    it("every follow it generates is accepted by the engine", () => {
        const hands: Card[][] = [
            [H(3), H(3), H(9), C(4), S(14), S(14)],
            [S(3), S(4), S(5), H(2), BJ, C(9)],
            [C(3), C(5), D(7), D(7), H(14), H(14)],
        ];
        const leads: Move[] = [[H(12)], [H(12), H(12)], [S(9)], [H(8), H(8), H(9), H(9)]];
        for (const hand of hands) {
            const ihand = SJComp.handToInfo(toHand(hand), TRUMP);
            for (const lead of leads) {
                if (lead.length > hand.length) {continue;}
                const ilead = playInfo(lead, TRUMP);
                for (const move of legalMoves(hand, lead, TRUMP)) {
                    expect(SJComp.isPlayValid(playInfo(move, TRUMP), ilead, ihand, TRUMP), moveKey(move)).toBe(true);
                }
            }
        }
    });

    it("answers a lead with exactly as many cards as were led", () => {
        const moves = legalMoves([H(3), H(4), C(5), C(6), S(7)], [H(12), H(12)], TRUMP);
        for (const move of moves) {expect(move).toHaveLength(2);}
    });
});
