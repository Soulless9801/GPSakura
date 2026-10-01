import type * as SJCore from "/src/shengji/core/entities";

export type Card = SJCore.Card;
export type Suit = SJCore.Suit;
export type Rank = SJCore.Rank;
export type Trump = SJCore.Trump;

/** A play: one or more cards put down together. */
export type Move = Card[];

/**
 * Everything the advisor needs to know, phrased the way a player at the table would
 * describe it — no seat numbers, no absolute turn order.
 *
 * `trick` holds what has already been put down this trick, in the order it was played,
 * starting with whoever led. You are always the next to act, so your position in the
 * trick is `trick.length` and you are leading when `trick` is empty.
 *
 * Seats alternate teams, so two positions are on the same team exactly when their
 * indices have the same parity. That is all the partnership information needed.
 */
export interface Position {
    numPlayers: number;
    /** decks in play: 2 at 4 players, 3 at 6, 4 at 8 */
    decks: number;
    trump: Trump;
    /** the cards you are holding */
    hand: Card[];
    /** plays already made this trick, from the leader onwards */
    trick: Move[];
    /** cards played in earlier tricks this round, if you have been tracking them */
    seen: Card[];
}

/** One rule that contributed to a move's score. */
export interface RuleHit {
    id: string;
    /** how many points of score this rule added (negative = it argued against the move) */
    delta: number;
    plain: string;
}

/** A scored candidate play. */
export interface Candidate {
    move: Move;
    score: number;
    rules: RuleHit[];
    /** chance your side still holds the trick after everyone behind you has played */
    winProbability: number | null;
    /** points this play puts into the trick */
    pointsAdded: number;
    takesTrick: boolean;
}

export interface Advice {
    candidates: Candidate[];
    /** position facts worth showing back to the player */
    facts: {
        leading: boolean;
        cardsLeft: number;
        phase: "early" | "late";
        potPoints: number;
        /** index into `trick` of the play currently winning, or null when you lead */
        winningPosition: number | null;
        winningSide: "you" | "partner" | "opponent" | null;
        legalMoveCount: number;
    };
    /** anything wrong with the position as entered */
    problems: string[];
}
