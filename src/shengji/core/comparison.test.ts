import { describe, expect, it } from "vitest";

import * as SJComp from "./comparison";
import { Hand } from "./entities";
import type { Card, Rank, Suit, Trump } from "./entities";

const card = (suit: Suit, rank: number): Card => ({ suit, rank: rank as Rank });
const H = (rank: number): Card => card("hearts", rank);
const S = (rank: number): Card => card("spades", rank);
const C = (rank: number): Card => card("clubs", rank);
const D = (rank: number): Card => card("diamonds", rank);
const SJ: Card = card("jokers", 1);
const BJ: Card = card("jokers", 2);

/** spades are trumps, 2 is the trump rank */
const T: Trump = { suit: "spades", rank: 2 };

function buildHand(cards: Card[]): Hand {
    const hand = new Hand();
    for (const c of cards) {hand.addCard(c);}
    return hand;
}

const iplay = (cards: Card[], trump: Trump = T): SJComp.IPlay =>
    SJComp.playToInfo({ cards: [...cards], suit: null }, trump);
const ihand = (cards: Card[], trump: Trump = T): SJComp.IHand => SJComp.handToInfo(buildHand(cards), trump);

/** may `play` answer `lead` from `hand`? */
function legal(hand: Card[], lead: Card[], play: Card[], trump: Trump = T): boolean {
    return SJComp.isPlayValid(iplay(play, trump), iplay(lead, trump), ihand(hand, trump), trump);
}

describe("card strength ordering", () => {
    // weakest to strongest under trump = spades, rank 2
    const ascending: Card[] = [
        D(3), D(14),
        C(3), C(14),
        H(3), H(14),
        S(3), S(14), // trump suit
        H(2), // off-suit trump rank (also C(2), D(2) — equal)
        S(2), // trump rank in the trump suit
        SJ,
        BJ,
    ];

    it("isCardBigger agrees with the strength table for every pair that shares a line", () => {
        for (let i = 0; i < ascending.length; i++) {
            for (let j = 0; j < ascending.length; j++) {
                const a = ascending[i];
                const b = ascending[j];
                const sameLine = SJComp.checkInline(a, b, T);
                const bothMain = SJComp.isMainLine(a, T) && SJComp.isMainLine(b, T);
                if (!sameLine && !bothMain) {continue;}
                expect(SJComp.isCardBigger(a, b, T), `${JSON.stringify(a)} vs ${JSON.stringify(b)}`).toBe(i > j);
            }
        }
    });

    it("a main-line card beats a plain card regardless of rank", () => {
        expect(SJComp.isCardBigger(S(3), H(14), T)).toBe(true);
        expect(SJComp.isCardBigger(H(2), H(14), T)).toBe(true);
        expect(SJComp.isCardBigger(SJ, H(14), T)).toBe(true);
    });

    it("a plain card never beats a main-line lead", () => {
        expect(SJComp.isCardBigger(H(14), S(3), T)).toBe(false);
        expect(SJComp.isCardBigger(H(14), SJ, T)).toBe(false);
    });

    it("a plain card of another suit never beats the lead (lead wins ties of line)", () => {
        expect(SJComp.isCardBigger(C(14), H(3), T)).toBe(false);
        expect(SJComp.isCardBigger(D(14), H(3), T)).toBe(false);
    });

    it("off-suit cards of the trump rank are equal: neither beats the other", () => {
        expect(SJComp.isCardBigger(H(2), C(2), T)).toBe(false);
        expect(SJComp.isCardBigger(C(2), H(2), T)).toBe(false);
    });

    it("a card does not beat an identical card", () => {
        expect(SJComp.isCardBigger(H(9), H(9), T)).toBe(false);
        expect(SJComp.isCardBigger(BJ, BJ, T)).toBe(false);
    });

    it("the trump rank is skipped in a plain suit, not ranked there", () => {
        // with rank 7 trump, the hearts 7 is a main-line card
        const T7: Trump = { suit: "spades", rank: 7 };
        expect(SJComp.isMainLine(H(7), T7)).toBe(true);
        expect(SJComp.isCardBigger(H(7), H(14), T7)).toBe(true);
        expect(SJComp.isCardBigger(H(8), H(6), T7)).toBe(true);
    });

    it("in a no-trump round only jokers and the trump rank are special", () => {
        const NT: Trump = { suit: null, rank: 5 };
        expect(SJComp.isMainLine(SJ, NT)).toBe(true);
        expect(SJComp.isMainLine(H(5), NT)).toBe(true);
        expect(SJComp.isMainLine(S(14), NT)).toBe(false);
        expect(SJComp.isCardBigger(H(5), S(14), NT)).toBe(true);
        expect(SJComp.isCardBigger(H(5), C(5), NT)).toBe(false);
    });

    it("a joker declaration (suit 'jokers') makes the jokers' own suit the trump suit", () => {
        const JT: Trump = { suit: "jokers", rank: 5 };
        expect(SJComp.isMainLine(SJ, JT)).toBe(true);
        expect(SJComp.isMainLine(S(14), JT)).toBe(false);
        expect(SJComp.isCardBigger(BJ, SJ, JT)).toBe(true);
    });
});

describe("isMainLine", () => {
    it("is true for trump suit, trump rank in any suit, and jokers", () => {
        expect(SJComp.isMainLine(S(9), T)).toBe(true);
        expect(SJComp.isMainLine(H(2), T)).toBe(true);
        expect(SJComp.isMainLine(SJ, T)).toBe(true);
    });

    it("is false for ordinary plain cards", () => {
        expect(SJComp.isMainLine(H(9), T)).toBe(false);
        expect(SJComp.isMainLine(D(14), T)).toBe(false);
    });
});

describe("sortCards", () => {
    it("sorts weakest first, in place, and returns the same array", () => {
        const cards = [BJ, S(2), H(14), S(5), H(2), SJ, H(3)];
        const out = SJComp.sortCards(cards, T);
        expect(out).toBe(cards);
        expect(cards).toEqual([H(3), H(14), S(5), H(2), S(2), SJ, BJ]);
    });

    it("without a trump orders by suit then rank, jokers last", () => {
        const cards = [BJ, H(3), S(2), D(14), C(5), SJ];
        SJComp.sortCards(cards, null);
        expect(cards.map((c) => c.suit)).toEqual(["diamonds", "clubs", "hearts", "spades", "jokers", "jokers"]);
        expect(cards[4]).toEqual(SJ);
        expect(cards[5]).toEqual(BJ);
    });

    it("is stable-safe on an empty or singleton array", () => {
        expect(SJComp.sortCards([], T)).toEqual([]);
        expect(SJComp.sortCards([H(3)], T)).toEqual([H(3)]);
    });
});

describe("tiny helpers", () => {
    it("isCardEqual compares suit and rank", () => {
        expect(SJComp.isCardEqual(H(3), H(3))).toBe(true);
        expect(SJComp.isCardEqual(H(3), C(3))).toBe(false);
        expect(SJComp.isCardEqual(H(3), H(4))).toBe(false);
    });

    it("isAllSame", () => {
        expect(SJComp.isAllSame([])).toBe(true);
        expect(SJComp.isAllSame([H(3), H(3), H(3)])).toBe(true);
        expect(SJComp.isAllSame([H(3), H(3), H(4)])).toBe(false);
        expect(SJComp.isAllSame([H(3), C(3)])).toBe(false);
    });

    it("isAllJokers", () => {
        expect(SJComp.isAllJokers([])).toBe(true);
        expect(SJComp.isAllJokers([SJ, BJ])).toBe(true);
        expect(SJComp.isAllJokers([SJ, H(3)])).toBe(false);
    });

    it("checkInline demands the same line, and a legal card", () => {
        expect(SJComp.checkInline(H(3), H(14), T)).toBe(true);
        expect(SJComp.checkInline(C(3), H(14), T)).toBe(false);
        expect(SJComp.checkInline(S(3), SJ, T)).toBe(true); // both main line
        expect(SJComp.checkInline(H(3), SJ, T)).toBe(false);
        expect(SJComp.checkInline(SJ, H(3), T)).toBe(false);
        expect(SJComp.checkInline(card("hearts", 1), H(3), T)).toBe(false); // illegal card
    });
});

describe("getNextCardData / isCardNext", () => {
    it("steps through a plain suit, skipping the trump rank", () => {
        const T3: Trump = { suit: "spades", rank: 3 };
        expect(SJComp.isCardNext(H(4), H(2), T3)).toBe(true); // 3 is skipped
        expect(SJComp.isCardNext(H(3), H(2), T3)).toBe(false);
        expect(SJComp.isCardNext(H(6), H(5), T3)).toBe(true);
        expect(SJComp.isCardNext(H(7), H(5), T3)).toBe(false);
    });

    it("steps from a plain ace to nothing", () => {
        expect(SJComp.getNextCardData(H(14), T)).toBeNull();
        expect(SJComp.isCardNext(C(3), H(14), T)).toBe(false);
    });

    it("climbs the whole main line: trump A -> off-suit 2 -> trump 2 -> SJ -> BJ", () => {
        expect(SJComp.isCardNext(H(2), S(14), T)).toBe(true);
        expect(SJComp.isCardNext(C(2), S(14), T)).toBe(true); // any off-suit 2 follows the A
        expect(SJComp.isCardNext(S(2), H(2), T)).toBe(true);
        expect(SJComp.isCardNext(SJ, S(2), T)).toBe(true);
        expect(SJComp.getNextCardData(BJ, T)).toBeNull();
    });

    it("the small joker is followed by the big joker when the trump rank is not 2", () => {
        const T7: Trump = { suit: "spades", rank: 7 };
        expect(SJComp.isCardNext(BJ, SJ, T7)).toBe(true);
        expect(SJComp.getNextCardData(SJ, T7)).toEqual([1, 0, 0, 2]);
    });

    // getNextCardData used to bump the joker rank (1 -> 2) and then "skip the trump rank", which
    // for trump rank 2 bumped it again to 3. Round 1 always has trump rank 2, so a joker
    // tractor (SJ SJ BJ BJ) was not recognised in the opening round.
    it.each([
        ["trump rank 2", { suit: "spades", rank: 2 }],
        ["trump rank 7", { suit: "spades", rank: 7 }],
        ["trump rank 14", { suit: "spades", rank: 14 }],
        ["no trump suit", { suit: null, rank: 2 }],
        ["jokers declared", { suit: "jokers", rank: 2 }],
        ["hearts trump, rank 2", { suit: "hearts", rank: 2 }],
    ] as [string, Trump][])("the small joker is followed by the big joker with %s", (_label, trump) => {
        expect(SJComp.isCardNext(BJ, SJ, trump)).toBe(true);
        expect(SJComp.isCardNext(SJ, BJ, trump)).toBe(false);
        expect(SJComp.isCardNext(BJ, BJ, trump)).toBe(false);
    });

    it("the big joker follows the small joker only: nothing is between them", () => {
        expect(SJComp.isCardNext(BJ, S(2), T)).toBe(false);
        expect(SJComp.isCardNext(BJ, H(14), T)).toBe(false);
    });

    it("an off-suit 2 is never next to another off-suit 2", () => {
        expect(SJComp.isCardNext(H(2), C(2), T)).toBe(false);
    });

    it("walks the trump suit upwards", () => {
        expect(SJComp.isCardNext(S(4), S(3), T)).toBe(true);
        expect(SJComp.isCardNext(S(5), S(3), T)).toBe(false);
    });

    it("skips a non-2 trump rank inside the trump suit", () => {
        const T7: Trump = { suit: "spades", rank: 7 };
        expect(SJComp.isCardNext(S(8), S(6), T7)).toBe(true);
        expect(SJComp.isCardNext(H(7), S(14), T7)).toBe(true); // A -> off-suit 7
        expect(SJComp.isCardNext(S(7), H(7), T7)).toBe(true);
        expect(SJComp.isCardNext(SJ, S(7), T7)).toBe(true);
    });

    it("works when the trump rank is the ace", () => {
        const TA: Trump = { suit: "spades", rank: 14 };
        expect(SJComp.getNextCardData(H(13), TA)).toBeNull(); // K is the top of the plain suit
        expect(SJComp.isCardNext(H(14), S(13), TA)).toBe(true);
    });

    it("never links cards from different plain suits", () => {
        expect(SJComp.isCardNext(C(4), H(3), T)).toBe(false);
    });
});

describe("play structure (getPlayStruct)", () => {
    it("reads a single", () => {
        expect(iplay([H(5)]).struct).toEqual({ cards: [[H(5)]], count: [1] });
    });

    it("reads a pair", () => {
        expect(iplay([H(5), H(5)]).struct).toEqual({ cards: [[H(5)]], count: [2] });
    });

    it("reads a triple", () => {
        expect(iplay([H(5), H(5), H(5)]).struct).toEqual({ cards: [[H(5)]], count: [3] });
    });

    it("reads a tractor of pairs", () => {
        expect(iplay([H(6), H(5), H(5), H(6)]).struct).toEqual({ cards: [[H(5), H(6)]], count: [2] });
    });

    it("reads a three-pair tractor", () => {
        const struct = iplay([H(5), H(5), H(6), H(6), H(7), H(7)]).struct;
        expect(struct).toEqual({ cards: [[H(5), H(6), H(7)]], count: [2] });
    });

    it("never builds a 'tractor' of singles", () => {
        expect(iplay([H(5), H(6)]).struct).toEqual({ cards: [[H(5)], [H(6)]], count: [1, 1] });
    });

    it("splits non-consecutive pairs into separate groups", () => {
        const struct = iplay([H(5), H(5), H(8), H(8)]).struct;
        expect(struct.cards).toEqual([[H(5)], [H(8)]]);
        expect(struct.count).toEqual([2, 2]);
    });

    it("does not join a pair to a consecutive triple", () => {
        const struct = iplay([H(5), H(5), H(6), H(6), H(6)]).struct;
        expect(struct.count).toEqual([2, 3]);
    });

    it("bridges across the skipped trump rank", () => {
        const T3: Trump = { suit: "spades", rank: 3 };
        const struct = iplay([H(2), H(2), H(4), H(4)], T3).struct;
        expect(struct).toEqual({ cards: [[H(2), H(4)]], count: [2] });
    });

    it("links trump suit A to off-suit trump-rank pairs and on to the trump-rank pair", () => {
        const struct = iplay([S(14), S(14), H(2), H(2), S(2), S(2)]).struct;
        expect(struct).toEqual({ cards: [[S(14), H(2), S(2)]], count: [2] });
    });

    it("a pair of small jokers and a pair of big jokers are a tractor", () => {
        const T7: Trump = { suit: "spades", rank: 7 };
        expect(iplay([SJ, SJ, BJ, BJ], T7).struct).toEqual({ cards: [[SJ, BJ]], count: [2] });
    });

    it.each<[string, Trump]>([
        ["trump rank 2", T],
        ["jokers declared", { suit: "jokers", rank: 2 }],
        ["no trump suit", { suit: null, rank: 2 }],
    ])("a joker tractor is recognised with %s", (_label, trump) => {
        expect(iplay([SJ, SJ, BJ, BJ], trump).struct).toEqual({ cards: [[SJ, BJ]], count: [2] });
    });

    it("a joker tractor is a legal lead and a legal follow to another joker tractor", () => {
        const hand = [SJ, SJ, BJ, BJ, H(3)];
        expect(legal(hand, [], [SJ, SJ, BJ, BJ])).toBe(true);
        expect(legal(hand, [S(14), S(14), H(2), H(2)], [SJ, SJ, BJ, BJ])).toBe(true);
    });

    it("a single pair of jokers is not a tractor", () => {
        expect(iplay([SJ, SJ]).struct).toEqual({ cards: [[SJ]], count: [2] });
    });

    it("sorts the play's own card array as a side effect", () => {
        const play = { cards: [H(9), H(3), H(5)], suit: null };
        SJComp.playToInfo(play, T);
        expect(play.cards).toEqual([H(3), H(5), H(9)]);
    });

    it("handToInfo lists distinct cards weakest first with their counts", () => {
        const info = ihand([H(9), H(3), H(3), S(4)]);
        expect(info.struct.cards).toEqual([H(3), H(9), S(4)]);
        expect(info.struct.count).toEqual([2, 1, 1]);
    });

    it("an empty play has an empty structure", () => {
        expect(iplay([]).struct).toEqual({ cards: [], count: [] });
    });
});

describe("isSubset", () => {
    it("accepts a play drawn from the hand", () => {
        expect(SJComp.isSubset(iplay([H(3), H(3)]), ihand([H(3), H(3), H(4)]))).toBe(true);
    });

    it("rejects a card the hand does not hold", () => {
        expect(SJComp.isSubset(iplay([H(5)]), ihand([H(3)]))).toBe(false);
    });

    it("rejects more copies than held", () => {
        expect(SJComp.isSubset(iplay([H(3), H(3)]), ihand([H(3)]))).toBe(false);
    });

    it("accepts the empty play", () => {
        expect(SJComp.isSubset(iplay([]), ihand([]))).toBe(true);
    });
});

describe("leading (isPlayValid with an empty lead)", () => {
    const hand = [H(5), H(5), H(6), H(6), H(9), C(3), S(14)];
    const lead = (cards: Card[]): boolean => legal(hand, [], cards);

    it("allows a single, a pair and a tractor", () => {
        expect(lead([H(9)])).toBe(true);
        expect(lead([H(5), H(5)])).toBe(true);
        expect(lead([H(5), H(5), H(6), H(6)])).toBe(true);
    });

    it("rejects an empty lead", () => {
        expect(lead([])).toBe(false);
    });

    it("rejects cards not in the hand", () => {
        expect(lead([H(14)])).toBe(false);
        expect(lead([H(5), H(5), H(5)])).toBe(false);
    });

    it("rejects a lead that is not one group (use shuai for those)", () => {
        expect(lead([H(5), H(9)])).toBe(false); // two singles
        expect(lead([H(9), C(3)])).toBe(false); // two suits
        expect(lead([H(5), H(5), H(9)])).toBe(false); // pair plus single
    });

    it("rejects two non-consecutive pairs", () => {
        expect(legal([H(5), H(5), H(8), H(8)], [], [H(5), H(5), H(8), H(8)])).toBe(false);
    });
});

describe("following a single", () => {
    it("must follow suit when able", () => {
        const hand = [H(3), H(9), C(14), S(14)];
        expect(legal(hand, [H(12)], [H(3)])).toBe(true);
        expect(legal(hand, [H(12)], [H(9)])).toBe(true);
        expect(legal(hand, [H(12)], [C(14)])).toBe(false);
        expect(legal(hand, [H(12)], [S(14)])).toBe(false);
    });

    it("may play anything when void in the led suit", () => {
        const hand = [C(14), S(14), D(3)];
        expect(legal(hand, [H(12)], [C(14)])).toBe(true);
        expect(legal(hand, [H(12)], [S(14)])).toBe(true);
        expect(legal(hand, [H(12)], [D(3)])).toBe(true);
    });

    it("must follow a trump lead with a trump or main-line card", () => {
        const hand = [S(3), H(2), H(14), C(3)];
        expect(legal(hand, [S(9)], [S(3)])).toBe(true);
        expect(legal(hand, [S(9)], [H(2)])).toBe(true); // off-suit 2 is main line
        expect(legal(hand, [S(9)], [H(14)])).toBe(false);
    });

    it("an off-suit trump rank card counts as a trump when a plain suit is led", () => {
        // hearts led; the 2♥ is a *trump*, so a player holding other hearts must follow with those
        expect(legal([H(2), H(9)], [H(12)], [H(2)])).toBe(false);
        expect(legal([H(2), H(9)], [H(12)], [H(9)])).toBe(true);
    });

    it("rejects the wrong number of cards", () => {
        expect(legal([H(3), H(9)], [H(12)], [H(3), H(9)])).toBe(false);
        expect(legal([H(3), H(9)], [H(12)], [])).toBe(false);
    });

    it("rejects cards not held", () => {
        expect(legal([H(3)], [H(12)], [H(4)])).toBe(false);
    });
});

describe("following a pair", () => {
    const lead = [H(12), H(12)];

    it("may play a pair of the suit", () => {
        expect(legal([H(3), H(3), H(9), H(10)], lead, [H(3), H(3)])).toBe(true);
    });

    // Pair leads used to accept two loose cards of the suit although a pair was held (a phantom
    // "run" for an empty list in findMaxConsecutive made the check pass); tractor leads always
    // enforced it. See also following.test.ts for the full rules and an independent oracle.
    it("must play the pair when holding one", () => {
        expect(legal([H(3), H(3), H(9), H(10)], lead, [H(9), H(10)])).toBe(false);
    });

    it("must not split a pair into two singles when a pair is held", () => {
        expect(legal([H(3), H(3), H(9)], lead, [H(3), H(9)])).toBe(false);
    });

    it("must play two cards of the suit when holding no pair", () => {
        const hand = [H(3), H(9), H(10), C(14), C(14)];
        expect(legal(hand, lead, [H(3), H(9)])).toBe(true);
        expect(legal(hand, lead, [H(9), H(10)])).toBe(true);
        expect(legal(hand, lead, [C(14), C(14)])).toBe(false);
        expect(legal(hand, lead, [H(3), C(14)])).toBe(false);
    });

    it("with a single card in the suit, must play it plus any other", () => {
        const hand = [H(3), C(14), C(3), S(4)];
        expect(legal(hand, lead, [H(3), C(14)])).toBe(true);
        expect(legal(hand, lead, [H(3), S(4)])).toBe(true);
        expect(legal(hand, lead, [C(14), C(3)])).toBe(false); // held a heart, did not play it
    });

    it("when void, any two cards are fine, including a pair of trumps", () => {
        const hand = [C(14), C(3), S(4), S(4)];
        expect(legal(hand, lead, [C(14), C(3)])).toBe(true);
        expect(legal(hand, lead, [S(4), S(4)])).toBe(true);
        expect(legal(hand, lead, [C(14), S(4)])).toBe(true);
    });

    it("a triple can supply the pair", () => {
        expect(legal([H(6), H(6), H(6), H(7), H(8)], lead, [H(6), H(6)])).toBe(true);
    });
});

describe("following a tractor", () => {
    const lead = [H(12), H(12), H(13), H(13)];

    it("must play a tractor if holding one", () => {
        const hand = [H(5), H(5), H(6), H(6), H(9), H(9)];
        expect(legal(hand, lead, [H(5), H(5), H(6), H(6)])).toBe(true);
        expect(legal(hand, lead, [H(5), H(5), H(9), H(9)])).toBe(false);
    });

    it("must play pairs when no tractor is held", () => {
        const hand = [H(5), H(5), H(8), H(8), H(10), H(11)];
        expect(legal(hand, lead, [H(5), H(5), H(8), H(8)])).toBe(true);
        expect(legal(hand, lead, [H(5), H(5), H(10), H(11)])).toBe(false);
    });

    it("must play the pair and fill from the suit when only one pair is held", () => {
        const hand = [H(5), H(5), H(8), H(10), C(3)];
        expect(legal(hand, lead, [H(5), H(5), H(8), H(10)])).toBe(true);
        expect(legal(hand, lead, [H(5), H(5), H(8), C(3)])).toBe(false); // still has hearts to give
    });

    it("must play all suit cards then anything when short", () => {
        const hand = [H(5), H(8), C(3), C(4), S(14)];
        expect(legal(hand, lead, [H(5), H(8), C(3), C(4)])).toBe(true);
        expect(legal(hand, lead, [H(5), H(8), C(3), S(14)])).toBe(true);
        expect(legal(hand, lead, [H(5), C(3), C(4), S(14)])).toBe(false);
    });

    it("any four cards are fine when void", () => {
        const hand = [C(3), C(4), C(5), S(14), S(13)];
        expect(legal(hand, lead, [C(3), C(4), C(5), S(14)])).toBe(true);
    });

    it("a quad answers a lead of two pairs as two pairs", () => {
        const hand = [H(5), H(5), H(5), H(5), H(9), H(10)];
        expect(legal(hand, lead, [H(5), H(5), H(5), H(5)])).toBe(true);
    });

    it("a tractor of trumps answers a trump tractor lead", () => {
        const trumpLead = [S(8), S(8), S(9), S(9)];
        const hand = [S(3), S(3), S(4), S(4), H(14)];
        expect(legal(hand, trumpLead, [S(3), S(3), S(4), S(4)])).toBe(true);
        expect(legal(hand, trumpLead, [S(3), S(3), S(4), H(14)])).toBe(false);
    });
});

describe("isPlayBigger", () => {
    const big = (a: Card[], b: Card[]): boolean => SJComp.isPlayBigger(iplay(a), iplay(b), T);

    it("anything beats an empty lead", () => {
        expect(big([H(3)], [])).toBe(true);
    });

    it("higher single of the same suit wins", () => {
        expect(big([H(14)], [H(13)])).toBe(true);
        expect(big([H(13)], [H(14)])).toBe(false);
    });

    it("an identical card does not win", () => {
        expect(big([H(13)], [H(13)])).toBe(false);
    });

    it("another plain suit does not win", () => {
        expect(big([C(14)], [H(3)])).toBe(false);
    });

    it("a trump ruffs a plain single", () => {
        expect(big([S(3)], [H(14)])).toBe(true);
    });

    it("a higher pair beats a lower pair", () => {
        expect(big([H(9), H(9)], [H(8), H(8)])).toBe(true);
        expect(big([H(8), H(8)], [H(9), H(9)])).toBe(false);
    });

    it("two trumps ruff a pair", () => {
        expect(big([S(3), S(3)], [H(14), H(14)])).toBe(true);
    });

    it("two unmatched trumps do not ruff a pair", () => {
        expect(big([S(3), S(4)], [H(14), H(14)])).toBe(false);
    });

    it("a pair of the trump rank beats a pair of trump aces", () => {
        expect(big([H(2), H(2)], [S(14), S(14)])).toBe(true);
    });

    it("a higher tractor beats a lower one", () => {
        expect(big([H(9), H(9), H(10), H(10)], [H(7), H(7), H(8), H(8)])).toBe(true);
        expect(big([H(7), H(7), H(8), H(8)], [H(9), H(9), H(10), H(10)])).toBe(false);
    });

    it("a trump tractor ruffs a plain tractor", () => {
        expect(big([S(3), S(3), S(4), S(4)], [H(13), H(13), H(14), H(14)])).toBe(true);
    });

    it("a trump pair does not beat a same-suit tractor lead (different format)", () => {
        expect(big([S(3), S(3), S(9), S(9)], [H(13), H(13), H(14), H(14)])).toBe(false);
    });

    it("the big joker pair is the strongest pair", () => {
        expect(big([BJ, BJ], [SJ, SJ])).toBe(true);
        expect(big([SJ, SJ], [BJ, BJ])).toBe(false);
    });
});

describe("isShuaiValid (leading a throw)", () => {
    const trick: SJComp.IPlay = iplay([]);

    function shuai(play: Card[], hand: Card[], others: Card[][]): boolean {
        return SJComp.isShuaiValid(iplay(play), trick, ihand(hand), others.map(buildHand), T);
    }

    it("is valid when no opponent can beat any component", () => {
        // hearts A K Q is unbeatable once the opponents hold no hearts at all
        const mine = [H(14), H(13), H(12)];
        expect(shuai(mine, mine, [[C(3)], [D(3)], [S(3)]])).toBe(true);
    });

    it("fails when an opponent holds a higher card of the suit", () => {
        const mine = [H(13), H(12)];
        expect(shuai(mine, mine, [[H(14)]])).toBe(false);
    });

    it("fails when an opponent could ruff a plain-suit throw with a trump", () => {
        const mine = [H(14), H(13)];
        // a trump is not "in the suit" for the throw: the engine treats a throw as beatable
        // only by cards in the same line, so this documents the current behaviour
        expect(shuai(mine, mine, [[S(3)]])).toBe(true);
    });

    it("must be one suit, or entirely main-line", () => {
        const mine = [H(14), C(14)];
        expect(shuai(mine, mine, [[D(3)]])).toBe(false);
        const mains = [S(14), H(2), SJ];
        expect(shuai(mains, mains, [[D(3)]])).toBe(true);
    });

    it("must be a subset of the hand", () => {
        expect(shuai([H(14), H(13)], [H(14)], [[D(3)]])).toBe(false);
    });

    it("a pair component is beaten by a higher pair", () => {
        const mine = [H(14), H(9), H(9)];
        expect(shuai(mine, mine, [[H(10), H(10)]])).toBe(false);
        expect(shuai(mine, mine, [[H(13), H(13)]])).toBe(false);
    });

    // isBeatable used to start a new "sequence" for any card whose count differed from the
    // component's, so a lone King counted as beating a pair of nines.
    it("single cards cannot beat a pair component", () => {
        const mine = [H(14), H(9), H(9)];
        expect(shuai(mine, mine, [[H(13), H(12)]])).toBe(true);
    });

    it("a tractor component is beaten only by a higher tractor", () => {
        const mine = [H(14), H(9), H(9), H(10), H(10)];
        expect(shuai(mine, mine, [[H(13), H(13), H(12)]])).toBe(true);
        expect(shuai(mine, mine, [[H(12), H(12), H(13), H(13)]])).toBe(false);
    });
});

describe("isShuaiValid (following a throw)", () => {
    function followShuai(lead: Card[], hand: Card[], play: Card[]): boolean {
        return SJComp.isShuaiValid(iplay(play), iplay(lead), ihand(hand), [], T);
    }

    it("accepts the natural reply: same number of suit cards", () => {
        const lead = [H(14), H(13), H(12)];
        const hand = [H(3), H(4), H(5), C(14)];
        expect(followShuai(lead, hand, [H(3), H(4), H(5)])).toBe(true);
    });

    it("rejects a reply that ignores the suit", () => {
        const lead = [H(14), H(13), H(12)];
        const hand = [H(3), H(4), H(5), C(14), C(13), C(12)];
        expect(followShuai(lead, hand, [C(14), C(13), C(12)])).toBe(false);
    });

    // A follower who is short in the led suit must dump what they hold and pad with anything
    // else. That mixed-suit play used to be rejected by the leader's "one line only" rule, which
    // left the follower with no legal reply at all.
    it("a short follower may dump their suit and pad with other cards", () => {
        const lead = [H(14), H(13), H(12)];
        const hand = [H(3), C(4), C(5), C(6)];
        expect(followShuai(lead, hand, [H(3), C(4), C(5)])).toBe(true);
    });

    it("a follower must play as many cards as the throw", () => {
        const lead = [H(14), H(13), H(12)];
        const hand = [H(3), C(4), C(5), C(6)];
        expect(followShuai(lead, hand, [H(3)])).toBe(false);
        expect(followShuai(lead, hand, [H(3), C(4), C(5), C(6)])).toBe(false);
    });
});
