import { describe, expect, it } from "vitest";

import RNG from "/src/entities/rng";
import { legalMoves, moveKey, playInfo, toHand } from "/src/shengji/advisor/moves";

import * as SJComp from "./comparison";
import type { Card, Rank, Suit, Trump } from "./entities";

const card = (suit: Suit, rank: number): Card => ({ suit, rank: rank as Rank });
const H = (rank: number): Card => card("hearts", rank);
const C = (rank: number): Card => card("clubs", rank);
const S = (rank: number): Card => card("spades", rank);

const TRUMP: Trump = { suit: "spades", rank: 2 };

function legal(hand: Card[], lead: Card[], play: Card[], trump: Trump = TRUMP): boolean {
    return SJComp.isPlayValid(playInfo(play, trump), playInfo(lead, trump), SJComp.handToInfo(toHand(hand), trump), trump);
}

const key = (c: Card): string => `${c.suit}:${String(c.rank)}`;

function counts(cards: Card[]): Map<string, number> {
    const out = new Map<string, number>();
    for (const c of cards) {out.set(key(c), (out.get(key(c)) ?? 0) + 1);}
    return out;
}

/** every distinct way to pick `size` cards from the hand (as sorted multisets) */
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

/**
 * An independent statement of the rules for answering a single or a pair, written from the
 * rulebook rather than from the engine's algorithm:
 *
 *  1. play exactly as many cards as were led, all from the hand;
 *  2. follow the line: if you hold at least that many cards in the led line, play only those;
 *     if you hold fewer, play all of them and fill with anything;
 *  3. (pair lead) if you hold a true pair in the line, play a pair. House rule: a triple is not
 *     a true pair, so you are never forced to break one up. A pair or a quad is.
 */
function oracle(hand: Card[], lead: Card[], play: Card[], trump: Trump): boolean {
    if (play.length !== lead.length) {return false;}

    const held = counts(hand);
    for (const [k, n] of counts(play)) {
        if ((held.get(k) ?? 0) < n) {return false;}
    }

    const inLine = (c: Card): boolean => SJComp.checkInline(c, lead[0], trump);
    const suitCards = hand.filter(inLine);
    const playedSuit = play.filter(inLine);

    if (suitCards.length >= lead.length) {
        if (playedSuit.length !== play.length) {return false;}
    } else {
        // all of the short suit must be played
        const playedCounts = counts(play);
        for (const [k, n] of counts(suitCards)) {
            if ((playedCounts.get(k) ?? 0) < n) {return false;}
        }
    }

    if (lead.length === 2 && suitCards.length >= 2) {
        const hasTruePair = [...counts(suitCards).values()].some((n) => n % 2 === 0);
        if (hasTruePair && !(play[0].suit === play[1].suit && play[0].rank === play[1].rank)) {return false;}
    }

    return true;
}

function randomTrump(rng: RNG): Trump {
    return { suit: rng.pick(["spades", "hearts", "clubs", "diamonds", null] as const), rank: rng.int(2, 14) as Rank };
}

/** a small pool so that pairs, triples and quads actually occur */
function randomHand(rng: RNG, size: number, maxCopies: number): Card[] {
    const pool: Card[] = [H(3), H(4), H(5), H(9), H(10), C(3), C(7), S(3), S(9), S(2), H(2), card("jokers", 1)];
    const hand: Card[] = [];
    const used = new Map<string, number>();
    while (hand.length < size) {
        const c = rng.pick(pool);
        if ((used.get(key(c)) ?? 0) >= maxCopies) {continue;}
        used.set(key(c), (used.get(key(c)) ?? 0) + 1);
        hand.push(c);
    }
    return hand;
}

describe("following a single or a pair (compared with an independent oracle)", () => {
    it("agrees with the written rules for every possible play", () => {
        const rng = new RNG(424242);
        let pairs = 0;
        let triples = 0;
        let checked = 0;

        for (let i = 0; i < 600; i++) {
            const trump = randomTrump(rng);
            const hand = randomHand(rng, rng.int(3, 8), 4);
            const leadSuitCard = rng.pick([H(12), H(14), C(12), S(14), card("jokers", 2)]);
            const leadPair = rng.chance(0.6);
            const lead = leadPair ? [leadSuitCard, leadSuitCard] : [leadSuitCard];
            if (lead.length > hand.length) {continue;}

            const handCounts = [...counts(hand.filter((c) => SJComp.checkInline(c, lead[0], trump))).values()];
            if (leadPair && handCounts.some((n) => n === 2 || n === 4)) {pairs++;}
            if (leadPair && handCounts.some((n) => n === 3)) {triples++;}

            for (const play of subsets(hand, lead.length)) {
                checked++;
                expect(legal(hand, lead, play, trump), `trump ${JSON.stringify(trump)} hand ${moveKey(hand)} lead ${moveKey(lead)} play ${moveKey(play)}`).toBe(
                    oracle(hand, lead, play, trump),
                );
            }
        }

        // make sure the interesting situations were actually generated
        expect(checked).toBeGreaterThan(2000);
        expect(pairs).toBeGreaterThan(20);
        expect(triples).toBeGreaterThan(10);
    });
});

describe("pair following rules, case by case", () => {
    const lead = [H(12), H(12)];

    it("a held pair must be played", () => {
        const hand = [H(3), H(3), H(9), H(10)];
        expect(legal(hand, lead, [H(3), H(3)])).toBe(true);
        expect(legal(hand, lead, [H(9), H(10)])).toBe(false);
        expect(legal(hand, lead, [H(3), H(9)])).toBe(false);
    });

    it("a quad is two pairs: any of its pairs answers, loose cards do not", () => {
        const hand = [H(5), H(5), H(5), H(5), H(9)];
        expect(legal(hand, lead, [H(5), H(5)])).toBe(true);
        expect(legal(hand, lead, [H(5), H(9)])).toBe(false);
    });

    // House rule (decided by the repository owner): a triple is never forced to be broken up
    // to answer a pair.
    it("a triple need not be split: the player may play two other cards of the suit", () => {
        const hand = [H(6), H(6), H(6), H(7), H(8)];
        expect(legal(hand, lead, [H(7), H(8)])).toBe(true);
    });

    it("...but may still take a pair out of the triple if they want to", () => {
        const hand = [H(6), H(6), H(6), H(7), H(8)];
        expect(legal(hand, lead, [H(6), H(6)])).toBe(true);
        expect(legal(hand, lead, [H(6), H(7)])).toBe(true);
    });

    it("...but a true pair elsewhere in the suit is still obligatory", () => {
        const hand = [H(6), H(6), H(6), H(7), H(7), H(8)];
        expect(legal(hand, lead, [H(7), H(7)])).toBe(true);
        expect(legal(hand, lead, [H(6), H(6)])).toBe(true); // a pair out of the triple is a pair
        expect(legal(hand, lead, [H(7), H(8)])).toBe(false);
        expect(legal(hand, lead, [H(6), H(8)])).toBe(false);
    });

    it("with no pair at all, any two cards of the suit will do", () => {
        const hand = [H(3), H(9), H(10), C(14)];
        expect(legal(hand, lead, [H(3), H(10)])).toBe(true);
        expect(legal(hand, lead, [H(3), C(14)])).toBe(false);
    });

    it("trumps: a held trump pair must answer a trump pair lead", () => {
        const trumpLead = [S(8), S(8)];
        const hand = [S(3), S(3), S(4), S(5), H(14)];
        expect(legal(hand, trumpLead, [S(3), S(3)])).toBe(true);
        expect(legal(hand, trumpLead, [S(4), S(5)])).toBe(false);
    });

    it("a void player may discard anything, including a split pair", () => {
        const hand = [C(3), C(3), S(4), S(4)];
        expect(legal(hand, lead, [C(3), S(4)])).toBe(true);
    });
});

describe("no hand is ever left without a legal reply", () => {
    // A hand with no legal reply would deadlock the game: nobody can act and the trick never
    // ends. Generate a random leader, take one of their legal leads, and ask a random
    // follower for their legal moves, across 2, 3 and 4 decks.
    it("for any lead structure (single, pair, triple, tractors) and any follower hand", () => {
        const rng = new RNG(99);
        const structures = new Set<string>();

        for (let i = 0; i < 400; i++) {
            const trump = randomTrump(rng);
            const copies = rng.int(2, 4);
            const leaderHand = randomHand(rng, rng.int(4, 12), copies);
            const leads = legalMoves(leaderHand, null, trump);
            if (leads.length === 0) {continue;}
            const lead = rng.pick(leads);

            const followerHand = randomHand(rng, rng.int(lead.length, 12), copies);
            const replies = legalMoves(followerHand, lead, trump);
            const info = playInfo(lead, trump).struct;
            structures.add(`${String(info.cards[0].length)}x${String(info.count[0])}`);

            expect(
                replies.length,
                `trump ${JSON.stringify(trump)}\nlead ${moveKey(lead)}\nfollower ${moveKey(followerHand)}`,
            ).toBeGreaterThan(0);
        }

        // singles, pairs, triples and at least one tractor shape were exercised
        expect(structures.size).toBeGreaterThanOrEqual(4);
    });
});
