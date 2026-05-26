import * as CardModule from '/src/entities/card';

export type Suit = CardModule.Suit;
export type Rank = CardModule.Rank;

export type Card = CardModule.Card;
export type Hand = CardModule.Hand;

export { validateCard, getCardCount, initializeHand, addCardToHand, removeCardFromHand, Deck } from '/src/entities/card';

export interface Trump {
    suit: Suit | null;
    rank: Rank;
}

export function pointValue(card: Card): number {
    if (card.rank === 5) return 5;
    if (card.rank === 10 || card.rank === 13) return 10;
    return 0;
}

export interface Play {
    cards: Card[];
    suit: Suit | null; // optional suit for non-single, non-lead plays
}
