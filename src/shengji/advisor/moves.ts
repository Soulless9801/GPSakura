/**
 * Legal-move generation for the advisor.
 *
 * `core/comparison.ts` is a *validator* — it answers "is this play legal?" but never
 * enumerates the plays. This file does the enumeration and then hands every candidate
 * back to `isPlayValid`, so legality is still decided by the engine and nothing here
 * can invent a move the real game would reject.
 *
 * Ported from `Learner_V1/ai_bot/engine.py` (`_generate_leads`, `_generate_follows`)
 * so the browser advisor and the offline bot consider the same move set.
 */

import * as SJCore from "/src/shengji/core/entities";
import * as SJComp from "/src/shengji/core/comparison";

import { Hand } from "/src/shengji/core/entities";

import type { Card, Move, Rank, Suit, Trump } from "./types";

/**
 * Enumeration order, matching `CARD_IDS` in `Learner_V1/ai_bot/cards.py`.
 *
 * This is not cosmetic. Cards of *equal* strength — the three off-suit trump-rank cards,
 * say — compare as neither bigger nor smaller, so `sortCards` leaves them in the order it
 * received them. `strengthOrder` therefore inherits this order, and a different one shifts
 * those cards by an index and moves every `move_cost` score with it.
 */
export const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];

export function cardKey(card: Card): string {
    return `${card.suit}:${card.rank}`;
}

/** Order-independent identity for a play, so two orderings of the same cards dedupe. */
export function moveKey(move: Move): string {
    return move.map(cardKey).sort().join("|");
}

/** The 54 distinct cards in a Shengji pack. */
export function allCards(): Card[] {
    const out: Card[] = [];
    for (const suit of SUITS) {
        for (let rank = 2; rank <= 14; rank++) {out.push({ suit, rank: rank as Rank });}
    }
    out.push({ suit: "jokers", rank: 1 });
    out.push({ suit: "jokers", rank: 2 });
    return out;
}

export function toHand(cards: Card[]): Hand {
    const hand: Hand = new Hand();
    for (const card of cards) {hand.addCard(card);}
    return hand;
}

export function pointValue(card: Card): number {
    return SJCore.pointValue(card);
}

export function totalPoints(cards: Card[]): number {
    return cards.reduce((sum, card) => sum + pointValue(card), 0);
}

/** [card, copies held] per distinct card, ordered by (suit, rank) as the Python port is. */
export function distinctCounts(cards: Card[]): Array<[Card, number]> {
    const counts: Map<string, [Card, number]> = new Map<string, [Card, number]>();
    for (const card of cards) {
        const entry = counts.get(cardKey(card));
        if (entry) {entry[1] += 1;}
        else {counts.set(cardKey(card), [{ suit: card.suit, rank: card.rank }, 1]);}
    }
    return [...counts.values()].sort((a, b) => {
        if (a[0].suit !== b[0].suit) {return a[0].suit < b[0].suit ? -1 : 1;}
        return a[0].rank - b[0].rank;
    });
}

/** `playToInfo` sorts the array it is given, so always hand it a copy. */
export function playInfo(cards: Card[], trump: Trump): SJComp.IPlay {
    return SJComp.playToInfo({ cards: [...cards], suit: null }, trump);
}

/**
 * Rank every distinct card by real strength under this trump, weakest = 0.
 *
 * `sortCards` is trump-aware; a raw `.rank` comparison is not, and would call the big
 * joker (rank 2) the second-weakest card in the deck.
 */
export function strengthOrder(trump: Trump): Map<string, number> {
    const cards: Card[] = allCards();
    SJComp.sortCards(cards, trump); // ascending
    const order: Map<string, number> = new Map<string, number>();
    cards.forEach((card, index) => order.set(cardKey(card), index));
    return order;
}

function dedupe(moves: Move[]): Move[] {
    const seen: Set<string> = new Set<string>();
    const out: Move[] = [];
    for (const move of moves) {
        const key: string = moveKey(move);
        if (seen.has(key)) {continue;}
        seen.add(key);
        out.push(move);
    }
    return out;
}

/** Every well-formed lead: n consecutive cards, each played m times. */
function generateLeads(hand: Card[], trump: Trump): Move[] {
    const dist: Array<[Card, number]> = distinctCounts(hand);
    const held: Map<string, number> = new Map(dist.map(([card, n]) => [cardKey(card), n]));

    const cards: Card[] = dist.map(([card]) => card);
    SJComp.sortCards(cards, trump);

    const moves: Move[] = cards.map((card) => [card]);

    const maxMult: number = dist.reduce((best, [, n]) => Math.max(best, n), 0);
    for (let m = 2; m <= maxMult; m++) {
        const eligible: Card[] = cards.filter((card) => (held.get(cardKey(card)) || 0) >= m);

        // split into maximal consecutive chains, so a tractor is a slice of one chain
        const chains: Card[][] = [];
        for (const card of eligible) {
            const last: Card[] | undefined = chains[chains.length - 1];
            if (last && SJComp.isCardNext(card, last[last.length - 1], trump)) {last.push(card);}
            else {chains.push([card]);}
        }

        for (const chain of chains) {
            for (let start = 0; start < chain.length; start++) {
                for (let end = start; end < chain.length; end++) {
                    const move: Move = [];
                    for (const card of chain.slice(start, end + 1)) {
                        for (let copy = 0; copy < m; copy++) {move.push(card);}
                    }
                    moves.push(move);
                }
            }
        }
    }

    return dedupe(moves);
}

/** Cheap cards first, so a trimmed follow list still holds the ordinary "follow small" plays. */
function followPreference(line: Array<[Card, number]>): Map<string, number> {
    const pref: Map<string, number> = new Map<string, number>();
    for (const [card] of line) {pref.set(cardKey(card), pointValue(card) * 2.0 + card.rank * 0.1);}
    return pref;
}

/** Lower is a more natural discard: cheap, off-trump, from a short suit. */
function discardPreference(off: Array<[Card, number]>, trump: Trump): Map<string, number> {
    const suitLength: Map<Suit, number> = new Map<Suit, number>();
    for (const [card, n] of off) {suitLength.set(card.suit, (suitLength.get(card.suit) || 0) + n);}

    const pref: Map<string, number> = new Map<string, number>();
    for (const [card] of off) {
        pref.set(
            cardKey(card),
            (SJComp.isMainLine(card, trump) ? 100.0 : 0.0) +
                pointValue(card) * 3.0 +
                (suitLength.get(card.suit) || 0) * 0.5 +
                card.rank * 0.1,
        );
    }
    return pref;
}

/**
 * Every size-`size` multiset drawn from (card, copies available) pairs.
 *
 * With a `budget` the search runs cheapest-first and stops once it is full, so the kept
 * moves are the sensible ones rather than an arbitrary prefix.
 */
function multisetCombinations(
    items: Array<[Card, number]>,
    size: number,
    budget: number | null,
    prefer: Map<string, number> | null,
): Move[] {
    if (size <= 0) {return [[]];}
    if (items.length === 0) {return [];}

    const ordered: Array<[Card, number]> = [...items];
    if (prefer) {
        ordered.sort((a, b) => (prefer.get(cardKey(a[0])) || 0) - (prefer.get(cardKey(b[0])) || 0));
    }

    // how many cards are left from index i onwards, to prune hopeless branches
    const suffix: number[] = new Array(ordered.length + 1).fill(0);
    for (let i = ordered.length - 1; i >= 0; i--) {suffix[i] = suffix[i + 1] + ordered[i][1];}

    const out: Move[] = [];
    const acc: Card[] = [];

    const rec = (idx: number, left: number): void => {
        if (budget !== null && out.length >= budget) {return;}
        if (left === 0) {
            out.push([...acc]);
            return;
        }
        if (idx >= ordered.length) {return;}
        if (suffix[idx] < left) {return;}

        const [card, avail] = ordered[idx];
        for (let take = Math.min(avail, left); take >= 0; take--) {
            for (let i = 0; i < take; i++) {acc.push(card);}
            rec(idx + 1, left - take);
            for (let i = 0; i < take; i++) {acc.pop();}
            if (budget !== null && out.length >= budget) {return;}
        }
    };

    rec(0, size);
    return out;
}

/** Every legal answer to `lead`, validated by the engine's own `isPlayValid`. */
function generateFollows(hand: Card[], lead: Move, trump: Trump, maxCandidates: number): Move[] {
    const need: number = lead.length;
    const leadCard: Card = lead[0];

    const line: Array<[Card, number]> = [];
    const off: Array<[Card, number]> = [];
    for (const entry of distinctCounts(hand)) {
        if (SJComp.checkInline(entry[0], leadCard, trump)) {line.push(entry);}
        else {off.push(entry);}
    }
    const lineTotal: number = line.reduce((sum, [, n]) => sum + n, 0);

    const ihand: SJComp.IHand = SJComp.handToInfo(toHand(hand), trump);
    const ilead: SJComp.IPlay = playInfo(lead, trump);

    const build = (budget: number | null): Move[] => {
        let cands: Move[];
        if (lineTotal >= need) {
            // you can follow the line in full, so every card comes from it
            cands = multisetCombinations(line, need, budget, followPreference(line));
        } else {
            // dump everything you hold in the line, then fill from anything else
            const forced: Card[] = [];
            for (const [card, n] of line) {for (let i = 0; i < n; i++) {forced.push(card);}}
            const fills: Move[] = multisetCombinations(
                off,
                need - lineTotal,
                budget,
                discardPreference(off, trump),
            );
            cands = fills.map((fill) => [...forced, ...fill]);
        }

        const seen: Set<string> = new Set<string>();
        const out: Move[] = [];
        for (const cand of cands) {
            const iplay: SJComp.IPlay = playInfo(cand, trump);
            if (!SJComp.isPlayValid(iplay, ilead, ihand, trump)) {continue;}
            const key: string = moveKey(iplay.play.cards);
            if (seen.has(key)) {continue;}
            seen.add(key);
            out.push([...iplay.play.cards]);
        }
        return out;
    };

    const legal: Move[] = build(Math.max(1, maxCandidates));
    // the trimmed candidate set happened to contain no legal play — redo it in full
    return legal.length > 0 ? legal : build(null);
}

/** All legal plays from `hand`, either leading (`trick` empty) or answering `trick[0]`. */
export function legalMoves(
    hand: Card[],
    lead: Move | null,
    trump: Trump,
    maxCandidates: number = 512,
): Move[] {
    if (hand.length === 0) {return [];}
    if (!lead || lead.length === 0) {return generateLeads(hand, trump);}
    return generateFollows(hand, lead, trump, maxCandidates);
}
