import { describe, expect, it } from "vitest";

import { Deck, Hand } from "./entities";
import type { Card, Rank, Suit } from "./entities";

const card = (suit: Suit, rank: number): Card => ({ suit, rank: rank as Rank });

function handOf(...ranks: number[]): Hand {
    const hand = new Hand();
    for (const rank of ranks) {hand.addCard(card("spades", rank));}
    return hand;
}

describe("Hand", () => {
    it("starts empty", () => {
        const hand = new Hand();
        expect(hand.getCards()).toEqual([]);
        expect(hand.getCardCount()).toBe(0);
        expect(hand.getHandValue()).toBe(0);
    });

    it("counts number cards at face value", () => {
        expect(handOf(2, 9).getHandValue()).toBe(11);
        expect(handOf(10, 7).getHandValue()).toBe(17);
    });

    it("counts J, Q and K as ten", () => {
        expect(handOf(11).getHandValue()).toBe(10);
        expect(handOf(12).getHandValue()).toBe(10);
        expect(handOf(13).getHandValue()).toBe(10);
        expect(handOf(11, 12, 13).getHandValue()).toBe(30);
    });

    it("counts a lone ace as 11", () => {
        expect(handOf(14).getHandValue()).toBe(11);
    });

    it("demotes an ace to 1 only when it would bust", () => {
        expect(handOf(14, 10).getHandValue()).toBe(21);
        expect(handOf(14, 5, 10).getHandValue()).toBe(16);
        expect(handOf(14, 14).getHandValue()).toBe(12);
        expect(handOf(14, 14, 9).getHandValue()).toBe(21);
    });

    it("keeps an ace soft as long as it can", () => {
        expect(handOf(14, 6).getHandValue()).toBe(17);
        expect(handOf(14, 6, 5).getHandValue()).toBe(12);
    });

    it("demotes as many aces as needed", () => {
        expect(handOf(14, 14, 14, 14).getHandValue()).toBe(14);
        expect(handOf(14, 14, 14, 14, 10, 10).getHandValue()).toBe(24);
    });

    it("does not mutate the stored total when reading the value", () => {
        const hand = handOf(14, 5, 10);
        expect(hand.getHandValue()).toBe(16);
        expect(hand.getHandValue()).toBe(16);
        hand.addCard(card("hearts", 5));
        expect(hand.getHandValue()).toBe(21);
    });

    it("tracks the cards and the count", () => {
        const hand = handOf(3, 4);
        expect(hand.getCardCount()).toBe(2);
        expect(hand.getCards().map((c) => c.rank)).toEqual([3, 4]);
    });

    it("scores a stray joker rank as zero rather than throwing", () => {
        const hand = new Hand();
        hand.addCard(card("jokers", 1));
        expect(hand.getHandValue()).toBe(0);
        expect(hand.getCardCount()).toBe(1);
    });

    it("round-trips through JSON via deserialize()", () => {
        const hand = handOf(14, 5, 10);
        const data = JSON.parse(JSON.stringify(hand)) as Parameters<typeof Hand.deserialize>[0];
        const copy = Hand.deserialize(data);

        expect(copy.getHandValue()).toBe(16);
        expect(copy.getCardCount()).toBe(3);
        copy.addCard(card("clubs", 5));
        expect(copy.getHandValue()).toBe(21);
    });
});

describe("Deck", () => {
    function drainAll(deck: Deck): Card[] {
        const out: Card[] = [];
        for (let c = deck.draw(); c; c = deck.draw()) {out.push(c);}
        return out;
    }

    it("never deals a joker", () => {
        const cards = drainAll(new Deck(2, 12));
        expect(cards).toHaveLength(104);
        expect(cards.some((c) => c.suit === "jokers")).toBe(false);
    });

    it("remembers its seed", () => {
        expect(new Deck(1, 777).getSeed()).toBe(777);
    });

    it("is reproducible for a seed", () => {
        expect(drainAll(new Deck(1, 5))).toEqual(drainAll(new Deck(1, 5)));
    });

    it("returns null when empty", () => {
        const deck = new Deck(1, 5);
        drainAll(deck);
        expect(deck.draw()).toBeNull();
    });

    // `static deserialize` delegates to the base class, which used to build its object from the
    // base `Deck.prototype`: the result was typed as a blackjack Deck but could still deal
    // jokers and had no getSeed().
    it("deserialize() returns a blackjack Deck that keeps its seed", () => {
        const copy = Deck.deserialize({ cards: [card("jokers", 1), card("spades", 2)], seed: 9 });
        expect(copy).toBeInstanceOf(Deck);
        expect(copy.getSeed()).toBe(9);
    });

    it("a deserialized deck still skips jokers", () => {
        const copy = Deck.deserialize({ cards: [card("spades", 2), card("jokers", 1), card("jokers", 2)], seed: 1 });
        // cards are drawn from the end: both jokers are skipped, then the 2 comes out
        expect(copy.draw()).toEqual(card("spades", 2));
        expect(copy.draw()).toBeNull();
    });

    it("a deserialized deck deals exactly what the original would have", () => {
        const original = new Deck(1, 123);
        const data = { cards: [] as Card[], seed: 123 };
        const probe = new Deck(1, 123);
        for (let c = probe.draw(); c; c = probe.draw()) {data.cards.unshift(c);}
        const copy = Deck.deserialize(data);
        for (let i = 0; i < 52; i++) {expect(copy.draw()).toEqual(original.draw());}
    });
});
