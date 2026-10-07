import { describe, expect, it } from "vitest";

import {
    cardToString,
    cardsToString,
    handToCards,
    handToString,
    playToString,
    pointValue,
    trumpToCard,
    trumpToString,
    validateCard,
} from "./convert";
import { Hand } from "./entities";
import type { Card, Rank, Suit, Trump } from "./entities";

const card = (suit: Suit, rank: number): Card => ({ suit, rank: rank as Rank });

describe("cardToString", () => {
    it("uses suit glyphs and face letters", () => {
        expect(cardToString(card("spades", 14))).toBe("A♠");
        expect(cardToString(card("hearts", 13))).toBe("K♥");
        expect(cardToString(card("diamonds", 12))).toBe("Q♦");
        expect(cardToString(card("clubs", 11))).toBe("J♣");
        expect(cardToString(card("clubs", 10))).toBe("10♣");
        expect(cardToString(card("hearts", 2))).toBe("2♥");
    });

    it("names the jokers", () => {
        expect(cardToString(card("jokers", 1))).toBe("SJ");
        expect(cardToString(card("jokers", 2))).toBe("BJ");
    });
});

describe("cardsToString / playToString", () => {
    it("formats a bracketed, comma-separated list", () => {
        const cards = [card("spades", 14), card("jokers", 2)];
        expect(cardsToString(cards)).toBe("[A♠, BJ]");
        expect(playToString({ cards, suit: null })).toBe("[A♠, BJ]");
    });

    it("formats an empty list", () => {
        expect(cardsToString([])).toBe("[]");
        expect(playToString({ cards: [], suit: null })).toBe("[]");
    });
});

describe("trumpToString / trumpToCard", () => {
    it("shows the trump card when there is a suit", () => {
        expect(trumpToString({ suit: "hearts", rank: 7 })).toBe("7♥");
    });

    it("shows No Trump with the rank when there is no suit", () => {
        expect(trumpToString({ suit: null, rank: 9 })).toBe("No Trump (9)");
    });

    it("trumpToCard maps no-trump to the jokers suit", () => {
        expect(trumpToCard({ suit: null, rank: 5 })).toEqual({ suit: "jokers", rank: 5 });
        expect(trumpToCard({ suit: "clubs", rank: 5 })).toEqual({ suit: "clubs", rank: 5 });
    });
});

describe("validateCard / pointValue (duplicated from entities)", () => {
    it("agree with the entity versions", async () => {
        const entities = await import("./entities");
        for (const suit of ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[]) {
            for (let rank = 0; rank <= 15; rank++) {
                const c = card(suit, rank);
                expect(validateCard(c)).toBe(entities.validateCard(c));
                expect(pointValue(c)).toBe(entities.pointValue(c));
            }
        }
    });
});

describe("handToCards / handToString", () => {
    function build(...cards: Card[]): Hand {
        const hand = new Hand();
        for (const c of cards) {hand.addCard(c);}
        return hand;
    }

    it("expands counts into repeated cards", () => {
        const hand = build(card("hearts", 5), card("hearts", 5), card("clubs", 3));
        expect(handToCards(hand, null)).toHaveLength(3);
    });

    it("returns cards weakest-first (ascending), grouped by suit when there is no trump", () => {
        const hand = build(card("spades", 9), card("hearts", 9), card("diamonds", 9), card("clubs", 9));
        expect(handToCards(hand, null).map((c) => c.suit)).toEqual(["diamonds", "clubs", "hearts", "spades"]);
    });

    it("orders by trump when a trump is given", () => {
        const trump: Trump = { suit: "spades", rank: 2 };
        const hand = build(card("spades", 14), card("jokers", 2), card("hearts", 2), card("hearts", 14));
        expect(handToCards(hand, trump)).toEqual([
            card("hearts", 14),
            card("spades", 14),
            card("hearts", 2),
            card("jokers", 2),
        ]);
    });

    it("renders as a string in the same order", () => {
        const hand = build(card("hearts", 14), card("hearts", 3));
        expect(handToString(hand, null)).toBe("[3♥, A♥]");
    });

    it("is empty for an empty hand", () => {
        expect(handToCards(new Hand(), null)).toEqual([]);
        expect(handToString(new Hand(), null)).toBe("[]");
    });
});
