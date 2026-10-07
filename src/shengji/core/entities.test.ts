import { describe, expect, it } from "vitest";

import { Deck, Hand, pointValue, validateCard } from "./entities";
import type { Card, Rank, Suit } from "./entities";

const card = (suit: Suit, rank: number): Card => ({ suit, rank: rank as Rank });

describe("pointValue", () => {
    it("scores 5 as five, 10 and K as ten, everything else as zero", () => {
        expect(pointValue(card("hearts", 5))).toBe(5);
        expect(pointValue(card("hearts", 10))).toBe(10);
        expect(pointValue(card("hearts", 13))).toBe(10);
        for (const rank of [2, 3, 4, 6, 7, 8, 9, 11, 12, 14]) {
            expect(pointValue(card("spades", rank))).toBe(0);
        }
    });

    it("the whole 54-card deck is worth 100 points", () => {
        let total = 0;
        const deck = new Deck(1, 1);
        for (let c = deck.draw(); c; c = deck.draw()) {total += pointValue(c);}
        expect(total).toBe(100);
    });

    // Rank 5 of the "jokers" suit does not exist, but rank 1/2 jokers must never score.
    it("never scores a joker", () => {
        expect(pointValue(card("jokers", 1))).toBe(0);
        expect(pointValue(card("jokers", 2))).toBe(0);
    });
});

describe("re-exports", () => {
    it("validateCard is the shared card validator", () => {
        expect(validateCard(card("jokers", 2))).toBe(true);
        expect(validateCard(card("spades", 1))).toBe(false);
    });
});

describe("Hand", () => {
    it("starts empty", () => {
        const hand = new Hand();
        expect(hand.countCard(card("spades", 14))).toBe(0);
        expect(hand.countCard(card("jokers", 1))).toBe(0);
    });

    it("counts duplicates independently per suit and rank", () => {
        const hand = new Hand();
        hand.addCard(card("spades", 7));
        hand.addCard(card("spades", 7));
        hand.addCard(card("hearts", 7));
        expect(hand.countCard(card("spades", 7))).toBe(2);
        expect(hand.countCard(card("hearts", 7))).toBe(1);
        expect(hand.countCard(card("clubs", 7))).toBe(0);
    });

    it("removeCard decrements, and never goes below zero", () => {
        const hand = new Hand();
        hand.addCard(card("clubs", 3));
        hand.removeCard(card("clubs", 3));
        expect(hand.countCard(card("clubs", 3))).toBe(0);
        hand.removeCard(card("clubs", 3));
        expect(hand.countCard(card("clubs", 3))).toBe(0);
    });

    it("ignores cards with an unknown suit", () => {
        const hand = new Hand();
        hand.addCard({ suit: "stars" as Suit, rank: 3 });
        hand.removeCard({ suit: "stars" as Suit, rank: 3 });
        expect(hand.countCard({ suit: "stars" as Suit, rank: 3 })).toBe(0);
    });

    it("holds jokers as a separate suit", () => {
        const hand = new Hand();
        hand.addCard(card("jokers", 1));
        hand.addCard(card("jokers", 2));
        hand.addCard(card("jokers", 2));
        expect(hand.countCard(card("jokers", 1))).toBe(1);
        expect(hand.countCard(card("jokers", 2))).toBe(2);
    });

    it("survives the server's serialize / deserialize round trip", async () => {
        const { serialize, deserialize } = await import("/src/utils/serial");

        const hand = new Hand();
        hand.addCard(card("spades", 7));
        hand.addCard(card("spades", 7));
        hand.addCard(card("jokers", 2));

        const copy = Hand.deserialize(deserialize(serialize(hand)));
        expect(copy.countCard(card("spades", 7))).toBe(2);
        expect(copy.countCard(card("jokers", 2))).toBe(1);
        expect(copy.countCard(card("hearts", 7))).toBe(0);
    });

    // Hand.deserialize copies only the outer Map, so the per-suit maps stay shared with the
    // object it was restored from and editing one hand edits the other.
    it.fails("KNOWN BUG: deserialize() does not alias the per-suit maps of its source", () => {
        const source = new Hand();
        source.addCard(card("spades", 7));
        const copy = Hand.deserialize(source as unknown as { cards: Map<Suit, Map<Rank, number>> });
        copy.addCard(card("spades", 7));
        expect(source.countCard(card("spades", 7))).toBe(1);
    });
});
