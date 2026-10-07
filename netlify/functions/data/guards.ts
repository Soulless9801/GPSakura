// Validation for request payloads. The game rooms receive cards as JSON strings inside the
// request body; everything is checked here so malformed input is rejected as a client error
// instead of reaching the game engine (or throwing inside it).

import type { Card, Play, Rank, Suit, Trump } from '../../../src/shengji/core/entities.ts';

const SUITS: readonly string[] = ["spades", "hearts", "diamonds", "clubs", "jokers"];

// the largest hand is 25 cards and a play cannot exceed it; a little headroom keeps the bound
// independent of the table size
const MAX_CARDS = 50;

export const MAX_USERNAME_LENGTH = 32;

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

// parse a JSON string field; anything that is not a string holding valid JSON is `undefined`
export function parseJsonField(raw: unknown): unknown {
    if (typeof raw !== "string") {return undefined;}
    try {
        return JSON.parse(raw);
    } catch {
        return undefined;
    }
}

export function toCard(value: unknown): Card | null {
    if (!isObject(value)) {return null;}
    const { suit, rank } = value;
    if (typeof suit !== "string" || !SUITS.includes(suit)) {return null;}
    if (typeof rank !== "number" || !Number.isInteger(rank)) {return null;}
    if (suit === "jokers" ? rank < 1 || rank > 2 : rank < 2 || rank > 14) {return null;}
    return { suit: suit as Suit, rank: rank as Rank };
}

export function toCards(value: unknown): Card[] | null {
    if (!Array.isArray(value) || value.length > MAX_CARDS) {return null;}
    const cards: Card[] = [];
    for (const item of value) {
        const card = toCard(item);
        if (!card) {return null;}
        cards.push(card);
    }
    return cards;
}

// a play is its cards; the engine does not use the optional `suit` field, so it is dropped
export function toPlay(value: unknown): Play | null {
    if (!isObject(value)) {return null;}
    const cards = toCards(value.cards);
    return cards ? { cards, suit: null } : null;
}

// a declaration names a real suit (a joker declaration uses the "jokers" suit) and a rank
export function toTrump(value: unknown): Trump | null {
    if (!isObject(value)) {return null;}
    const { suit, rank } = value;
    if (typeof suit !== "string" || !SUITS.includes(suit)) {return null;}
    if (typeof rank !== "number" || !Number.isInteger(rank) || rank < 1 || rank > 14) {return null;}
    return { suit: suit as Suit, rank: rank as Rank };
}

// trims and caps a display name; `null` when there is nothing usable
export function toUsername(value: unknown): string | null {
    if (typeof value !== "string") {return null;}
    const name = value.trim().slice(0, MAX_USERNAME_LENGTH);
    return name.length > 0 ? name : null;
}
