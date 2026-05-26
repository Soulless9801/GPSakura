import RNG from '/src/entities/rng';

export type Suit = "spades" | "hearts" | "diamonds" | "clubs" | "jokers";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
    suit: Suit;
    rank: Rank;
    // value?(): number; // optional method to get point value of card
};

// class TestCard implements Card {
//     constructor(public suit: Suit, public rank: Rank) {}
//     value(): number {
//         if (this.rank === 5) return 5;
//         if (this.rank === 10 || this.rank === 13) return 10;
//         return 0;
//     }
// }

// export type TestDeck = {
//     cards: TestCard[];
// };

// function newCard(suit: Suit, rank: Rank): TestCard {
//     return new TestCard(suit, rank);
// }

// check if card is valid
export function validateCard(card: Card): boolean {
    if (card.suit !== "jokers") return card.rank >= 2 && card.rank <= 14;
    return card.rank >= 1 && card.rank <= 2; // 1 = small joker, 2 = big joker
}

export interface Deck {
    cards: Card[];
}

// deck helper functions
export function shuffleDeck(deck: Deck): void {
    for (let i = deck.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck.cards[i], deck.cards[j]] = [deck.cards[j], deck.cards[i]];
    }
}

function newDeck(decks: number): Deck {
    const deck: Deck = { cards: [] };
    for (const suit of ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[]) {
        for (let rank = 1; rank <= 14; rank++){
            const card : Card = { suit: suit, rank: rank as Rank};
            if (!validateCard(card)) continue;
            for (let d = 0; d < decks; d++) deck.cards.push(card);
        }
    }
    return deck;
}

export function seedDeck(seed: number, decks: number): Deck {
    const deck: Deck = newDeck(decks);
    const rng = new RNG(seed); // set seed shuffle
    deck.cards = rng.shuffle(deck.cards);
    return deck;
}

export function initializeDeck(decks: number): Deck {
    const deck: Deck = newDeck(decks);
    shuffleDeck(deck);
    return deck;
}

export function drawCard(deck: Deck): Card | null {
    if (deck.cards.length === 0) return null;
    return deck.cards.pop() || null;
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
