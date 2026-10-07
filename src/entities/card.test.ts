import { describe, expect, it, vi } from "vitest";

import {
    Deck,
    PLAY_SUITS,
    RANKS,
    cardName,
    isRed,
    rankLabel,
    validateCard,
} from "./card";
import type { Card, Rank, Suit } from "./card";

const card = (suit: Suit, rank: number): Card => ({ suit, rank: rank as Rank });

function drainAll(deck: Deck): Card[] {
    const out: Card[] = [];
    for (let c = deck.draw(); c; c = deck.draw()) {out.push(c);}
    return out;
}

const key = (c: Card): string => `${c.suit}:${String(c.rank)}`;

describe("validateCard", () => {
    it("accepts 2..14 in the four suits", () => {
        for (const suit of PLAY_SUITS) {
            for (const rank of RANKS) {expect(validateCard(card(suit, rank))).toBe(true);}
        }
    });

    it("rejects rank 1 and out-of-range ranks in a suit", () => {
        expect(validateCard(card("spades", 1))).toBe(false);
        expect(validateCard(card("hearts", 15))).toBe(false);
        expect(validateCard(card("clubs", 0))).toBe(false);
    });

    it("accepts only ranks 1 and 2 for jokers", () => {
        expect(validateCard(card("jokers", 1))).toBe(true);
        expect(validateCard(card("jokers", 2))).toBe(true);
        expect(validateCard(card("jokers", 3))).toBe(false);
    });
});

describe("card presentation helpers", () => {
    it("isRed covers hearts, diamonds and the big joker", () => {
        expect(isRed(card("hearts", 5))).toBe(true);
        expect(isRed(card("diamonds", 5))).toBe(true);
        expect(isRed(card("spades", 5))).toBe(false);
        expect(isRed(card("clubs", 5))).toBe(false);
        expect(isRed(card("jokers", 2))).toBe(true);
        expect(isRed(card("jokers", 1))).toBe(false);
    });

    it("rankLabel names faces, aces and jokers", () => {
        expect(rankLabel(card("spades", 11))).toBe("J");
        expect(rankLabel(card("spades", 12))).toBe("Q");
        expect(rankLabel(card("spades", 13))).toBe("K");
        expect(rankLabel(card("spades", 14))).toBe("A");
        expect(rankLabel(card("spades", 7))).toBe("7");
        expect(rankLabel(card("jokers", 1))).toBe("小");
        expect(rankLabel(card("jokers", 2))).toBe("大");
    });

    it("cardName reads naturally", () => {
        expect(cardName(card("hearts", 14))).toBe("A of hearts");
        expect(cardName(card("clubs", 10))).toBe("10 of clubs");
        expect(cardName(card("jokers", 1))).toBe("small joker");
        expect(cardName(card("jokers", 2))).toBe("big joker");
    });
});

describe("Deck", () => {
    it("holds 54 cards per deck: 52 plain plus two jokers", () => {
        for (const decks of [1, 2, 3, 4]) {
            const cards = drainAll(new Deck(decks, 1));
            expect(cards).toHaveLength(54 * decks);
            expect(cards.filter((c) => c.suit === "jokers")).toHaveLength(2 * decks);
        }
    });

    it("holds exactly `decks` copies of every valid card", () => {
        const counts = new Map<string, number>();
        for (const c of drainAll(new Deck(3, 5))) {counts.set(key(c), (counts.get(key(c)) ?? 0) + 1);}
        expect(counts.size).toBe(54);
        for (const n of counts.values()) {expect(n).toBe(3);}
        for (const c of drainAll(new Deck(1, 5))) {expect(validateCard(c)).toBe(true);}
    });

    it("an empty deck of zero decks draws null", () => {
        expect(new Deck(0, 1).draw()).toBeNull();
    });

    it("draw() returns null once exhausted and stays null", () => {
        const deck = new Deck(1, 1);
        drainAll(deck);
        expect(deck.draw()).toBeNull();
        expect(deck.draw()).toBeNull();
    });

    it("a seeded deck is reproducible", () => {
        expect(drainAll(new Deck(2, 42))).toEqual(drainAll(new Deck(2, 42)));
    });

    it("different seeds give different orders", () => {
        expect(drainAll(new Deck(2, 1))).not.toEqual(drainAll(new Deck(2, 2)));
    });

    it("an unseeded deck uses Math.random and is a permutation of the seeded one", () => {
        const random = vi.spyOn(Math, "random");
        const unseeded = drainAll(new Deck(1));
        expect(random).toHaveBeenCalled();
        expect(unseeded.map(key).sort()).toEqual(drainAll(new Deck(1, 3)).map(key).sort());
    });

    it("shuffle() reorders in place without losing cards", () => {
        const deck = new Deck(1, 9);
        const before = drainAll(new Deck(1, 9));
        deck.shuffle();
        const after = drainAll(deck);
        expect(after.map(key).sort()).toEqual(before.map(key).sort());
        expect(after).not.toEqual(before);
    });

    it("unload() hands over every remaining card and empties the deck", () => {
        const deck = new Deck(1, 1);
        deck.draw();
        deck.draw();
        const rest = deck.unload();
        expect(rest).toHaveLength(52);
        expect(deck.draw()).toBeNull();
        expect(deck.unload()).toEqual([]);
    });

    it("deserialize() restores the draw order and copies the array", () => {
        const original = new Deck(1, 77);
        const data = { cards: original.unload() };
        const snapshot = [...data.cards];

        const restored = Deck.deserialize(data);
        data.cards.length = 0; // mutating the source must not hurt the copy

        expect(drainAll(restored)).toEqual([...snapshot].reverse());
    });

    it("survives a JSON round trip (how the server persists games)", () => {
        const deck = new Deck(2, 5);
        const copy = Deck.deserialize(JSON.parse(JSON.stringify(deck)) as { cards: Card[] });
        expect(drainAll(copy)).toEqual(drainAll(new Deck(2, 5)));
    });
});
