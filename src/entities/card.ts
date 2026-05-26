import RNG from '/src/entities/rng';

export type Suit = "spades" | "hearts" | "diamonds" | "clubs" | "jokers";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
    suit: Suit;
    rank: Rank;
};

// check if card is valid
export function validateCard(card: Card): boolean {
    if (card.suit !== "jokers") return card.rank >= 2 && card.rank <= 14;
    return card.rank >= 1 && card.rank <= 2; // 1 = small joker, 2 = big joker
}

export class Deck {

    private cards: Card[];

    constructor(decks: number, seed?: number) {
        this.cards = []
        for (const suit of ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[]) {
            for (let rank = 1; rank <= 14; rank++){
                const card : Card = { suit: suit, rank: rank as Rank };
                if (!validateCard(card)) continue;
                for (let d = 0; d < decks; d++) this.cards.push(card);
            }
        }
        if (seed !== undefined) {
            const rng = new RNG(seed); // set seed shuffle
            this.cards = rng.shuffle(this.cards);
        } else this.shuffle();
    }

    shuffle(): void {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw(): Card | null {
        console.log(`Deck has ${this.cards.length} cards left.`);
        if (this.cards.length === 0) return null;
        return this.cards.pop() || null;
    }

    static deserialize(data: { cards: Card[] }): Deck {
        const deck = Object.create(Deck.prototype) as Deck;
        deck.cards = [...data.cards];
        return deck;
    }

    unload(): Card[] {
        const cards = this.cards;
        this.cards = [];
        return cards;
    }
}

export interface Hand {
    cards: Map<Suit, Map<Rank, number>>;
}

export function getCardCount(hand: Hand, card: Card): number {
    const count : number | undefined = hand.cards.get(card.suit)?.get(card.rank);
    return count || 0;
}

export function initializeHand(): Hand {
    const hand : Hand = { cards : new Map<Suit, Map<Rank, number>>() };
    for (const suit of ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[]) hand.cards.set(suit, new Map<Rank, number>());
    return hand;
}

export function addCardToHand(card: Card, hand: Hand): void {
    const prev : number = getCardCount(hand, card);
    hand.cards.get(card.suit)?.set(card.rank, prev + 1);
}

export function removeCardFromHand(card: Card, hand: Hand): void {
    const prev : number = getCardCount(hand, card);
    hand.cards.get(card.suit)?.set(card.rank, Math.max(0, prev - 1));
}
