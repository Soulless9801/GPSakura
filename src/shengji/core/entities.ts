import * as CardModule from '/src/entities/card';

export type Suit = CardModule.Suit;
export type Rank = CardModule.Rank;

export type Card = CardModule.Card;

export { validateCard, Deck } from '/src/entities/card';

export interface DeckData extends CardModule.DeckData {}

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

export interface HandData {
    cards: Map<Suit, Map<Rank, number>>;
}

export class Hand {
    
    private cards: Map<Suit, Map<Rank, number>>;

    constructor() {
        this.cards = new Map<Suit, Map<Rank, number>>();
        for (const suit of ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[]) {
            this.cards.set(suit, new Map<Rank, number>());
        }
    }

    countCard(card: Card): number {
        return this.cards.get(card.suit)?.get(card.rank) || 0;
    }

    addCard(card: Card): void {
        const suitMap = this.cards.get(card.suit);
        if (!suitMap) return; // should never happen
        const prev = suitMap.get(card.rank) || 0;
        suitMap.set(card.rank, prev + 1);
    }

    removeCard(card: Card): void {
        const suitMap = this.cards.get(card.suit);
        if (!suitMap) return; // should never happen
        const prev = suitMap.get(card.rank) || 0;
        suitMap.set(card.rank, Math.max(0, prev - 1));
    }

    static deserialize(data: HandData): Hand {
        const hand = new Hand();
        hand.cards = new Map(data.cards);
        return hand;
    }
}
