import RNG from "./rng";

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

export const SUIT_GLYPH: Record<string, string> = {
    spades: "\u2660",
    hearts: "\u2665",
    diamonds: "\u2666",
    clubs: "\u2663",
    jokers: "王",
};

export const RANK_LABEL: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };

export const PLAY_SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function isRed(card: Card): boolean {
    if (card.suit === "jokers") return card.rank === 2;
    return card.suit === "hearts" || card.suit === "diamonds";
}

export function rankLabel(card: Card): string {
    if (card.suit === "jokers") return card.rank === 2 ? "大" : "小";
    return RANK_LABEL[card.rank] || String(card.rank);
}

export function cardName(card: Card): string {
    if (card.suit === "jokers") return card.rank === 2 ? "big joker" : "small joker";
    return `${rankLabel(card)} of ${card.suit}`;
}

export interface DeckData {
    cards: Card[];
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
            const rng = new RNG(seed);
            this.cards = rng.shuffle(this.cards);
        } else {
            this.shuffle();
        }
    }

    shuffle(): void {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw(): Card | null {
        // console.log(`Deck has ${this.cards.length} cards left.`);
        if (this.cards.length === 0) return null;
        return this.cards.pop() || null;
    }

    static deserialize(data: DeckData): Deck {
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

// export class Hand {
    
//     private cards: Map<Suit, Map<Rank, number>>;

//     constructor() {
//         this.cards = new Map<Suit, Map<Rank, number>>();
//         for (const suit of ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[]) {
//             this.cards.set(suit, new Map<Rank, number>());
//         }
//     }

//     countCard(card: Card): number {
//         return this.cards.get(card.suit)?.get(card.rank) || 0;
//     }

//     addCard(card: Card): void {
//         const suitMap = this.cards.get(card.suit);
//         if (!suitMap) return; // should never happen
//         const prev = suitMap.get(card.rank) || 0;
//         suitMap.set(card.rank, prev + 1);
//     }

//     removeCard(card: Card): void {
//         const suitMap = this.cards.get(card.suit);
//         if (!suitMap) return; // should never happen
//         const prev = suitMap.get(card.rank) || 0;
//         suitMap.set(card.rank, Math.max(0, prev - 1));
//     }

//     static deserialize(data: { cards: Map<Suit, Map<Rank, number>> }): Hand {
//         const hand = new Hand();
//         hand.cards = new Map(data.cards);
//         return hand;
//     }
// }
