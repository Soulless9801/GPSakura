import { describe, expect, it } from "vitest";

import { MAX_USERNAME_LENGTH, parseJsonField, toCard, toCards, toPlay, toTrump, toUsername } from "./guards";

describe("parseJsonField", () => {
    it("parses a JSON string", () => {
        expect(parseJsonField('{"a":1}')).toEqual({ a: 1 });
        expect(parseJsonField("[1,2]")).toEqual([1, 2]);
    });

    it.each([["not json"], ["{"], [""], ["undefined"]])("returns undefined for the bad text %j", (raw) => {
        expect(parseJsonField(raw)).toBeUndefined();
    });

    it.each([[undefined], [null], [5], [{}], [[]], [true]])("returns undefined for the non-string %j", (raw) => {
        expect(parseJsonField(raw)).toBeUndefined();
    });
});

describe("toCard", () => {
    it("accepts every legal card", () => {
        for (const suit of ["spades", "hearts", "diamonds", "clubs"]) {
            for (let rank = 2; rank <= 14; rank++) {expect(toCard({ suit, rank })).toEqual({ suit, rank });}
        }
        expect(toCard({ suit: "jokers", rank: 1 })).toEqual({ suit: "jokers", rank: 1 });
        expect(toCard({ suit: "jokers", rank: 2 })).toEqual({ suit: "jokers", rank: 2 });
    });

    it.each([
        [{ suit: "spades", rank: 1 }],
        [{ suit: "spades", rank: 15 }],
        [{ suit: "spades", rank: 0 }],
        [{ suit: "jokers", rank: 3 }],
        [{ suit: "jokers", rank: 0 }],
        [{ suit: "stars", rank: 5 }],
        [{ suit: "hearts", rank: "5" }],
        [{ suit: "hearts", rank: 5.5 }],
        [{ suit: "hearts", rank: Number.NaN }],
        [{ suit: 5, rank: 5 }],
        [{ suit: "hearts" }],
        [{ rank: 5 }],
        [null],
        [undefined],
        ["hearts"],
        [[]],
        [7],
    ])("rejects %j", (value) => {
        expect(toCard(value)).toBeNull();
    });

    it("drops extra fields, so nothing unexpected is carried into the game", () => {
        expect(toCard({ suit: "hearts", rank: 5, evil: "x", __proto__: { a: 1 } })).toEqual({ suit: "hearts", rank: 5 });
    });
});

describe("toCards", () => {
    it("accepts a list of cards, including the empty list", () => {
        expect(toCards([])).toEqual([]);
        expect(toCards([{ suit: "hearts", rank: 5 }, { suit: "jokers", rank: 2 }])).toHaveLength(2);
    });

    it("rejects a list containing one bad card", () => {
        expect(toCards([{ suit: "hearts", rank: 5 }, { suit: "hearts", rank: 99 }])).toBeNull();
    });

    it.each([[null], [undefined], ["x"], [{}], [5]])("rejects the non-array %j", (value) => {
        expect(toCards(value)).toBeNull();
    });

    it("caps the size of a list", () => {
        const many = Array.from({ length: 51 }, () => ({ suit: "hearts", rank: 5 }));
        expect(toCards(many)).toBeNull();
        expect(toCards(many.slice(0, 50))).toHaveLength(50);
    });
});

describe("toPlay", () => {
    it("takes the cards and normalises the unused suit field", () => {
        expect(toPlay({ cards: [{ suit: "hearts", rank: 5 }] })).toEqual({ cards: [{ suit: "hearts", rank: 5 }], suit: null });
        expect(toPlay({ cards: [], suit: "hearts" })).toEqual({ cards: [], suit: null });
    });

    it.each([[null], [undefined], [{}], [{ cards: null }], [{ cards: "x" }], [{ cards: [{ suit: "x", rank: 1 }] }], [[]], ["play"]])(
        "rejects %j",
        (value) => {
            expect(toPlay(value)).toBeNull();
        },
    );
});

describe("toTrump", () => {
    it("accepts a suit declaration and a joker declaration", () => {
        expect(toTrump({ suit: "hearts", rank: 2 })).toEqual({ suit: "hearts", rank: 2 });
        expect(toTrump({ suit: "jokers", rank: 2 })).toEqual({ suit: "jokers", rank: 2 });
    });

    it.each([[{ suit: null, rank: 2 }], [{ suit: "hearts" }], [{ suit: "hearts", rank: 20 }], [{ suit: "hearts", rank: "2" }], [null], [[]], ["x"]])(
        "rejects %j",
        (value) => {
            expect(toTrump(value)).toBeNull();
        },
    );
});

describe("toUsername", () => {
    it("trims", () => {
        expect(toUsername("  Zed  ")).toBe("Zed");
    });

    it("caps the length", () => {
        expect(toUsername("x".repeat(100))).toBe("x".repeat(MAX_USERNAME_LENGTH));
    });

    it.each([[undefined], [null], [""], ["   "], [5], [{}], [["a"]]])("returns null for %j", (value) => {
        expect(toUsername(value)).toBeNull();
    });

    it("keeps ordinary unicode names", () => {
        expect(toUsername("玩家 🎴")).toBe("玩家 🎴");
    });
});
