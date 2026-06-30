import * as CardModule from '/src/entities/card';

export type Suit = CardModule.Suit;
export type Rank = CardModule.Rank;

export type Card = CardModule.Card;
// export type Deck = CardModule.Deck;

export class Deck extends CardModule.Deck {

    private seed: number;

    constructor(decks: number, seed: number) {
        super(decks, seed);
        this.seed = seed;
    }

    getSeed(): number {
        return this.seed;
    }

    static deserialize(data: { cards: Card[], seed: number }): Deck {
        const deck = super.deserialize({ cards: data.cards }) as Deck;
        deck.seed = data.seed;
        return deck;
    }
}

export class Hand {
    
    private cards: Card[];

    private card_count: number;
    private hand_value: number;

    private ace_count: number;

    constructor() {
        this.cards = [];
        this.card_count = 0;
        this.hand_value = 0;
        this.ace_count = 0;
    }

    addCard(card: Card): void {
        this.cards.push(card);
        this.card_count++;
        this.hand_value += pointValue(card);
        if (card.rank === 14) this.ace_count++;
    }

    getCards(): Card[] {
        return this.cards;
    }

    getCardCount(): number {
        return this.card_count;
    }

    getHandValue(): number {
        let value = this.hand_value;
        let aces = this.ace_count;
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        return value;
    }

    static deserialize(data: { cards: Card[], card_count: number, hand_value: number, ace_count: number }): Hand {
        const hand = new Hand();
        hand.cards = data.cards;
        hand.card_count = data.card_count;
        hand.hand_value = data.hand_value;
        hand.ace_count = data.ace_count;
        return hand;
    }
}

export function validateCard(card: Card): boolean {
    return CardModule.validateCard(card) && card.suit !== "jokers"; // no jokers in blackjack
}

export function pointValue(card: Card): number {
    if (card.rank > 1 && card.rank < 11) return card.rank;
    if (card.rank > 10 && card.rank < 14) return 10;
    if (card.rank === 14) return 11;
    return 0;
}


// export class UnorderedHand extends CardModule.Hand {

//     private card_count: number;
//     private hand_value: number;

//     private ace_count: number;
    
//     constructor() {
//         super();
//         this.card_count = 0;
//         this.hand_value = 0;
//         this.ace_count = 0;
//     }

//     addCard(card: Card): void {
//         super.addCard(card);
//         this.card_count++;
//         this.hand_value += pointValue(card);
//         if (card.rank === 14) this.ace_count++;
//     }

//     removeCard(card: Card): void {
//         super.removeCard(card);
//         this.card_count--;
//         this.hand_value -= pointValue(card);
//         if (card.rank === 14) this.ace_count--;
//     }

//     getCardCount(): number {
//         return this.card_count;
//     }

//     getHandValue(): number {
//         let value = this.hand_value;
//         let aces = this.ace_count;
//         while (value > 21 && aces > 0) {
//             value -= 10;
//             aces--;
//         }
//         return value;
//     }

//     static deserialize(data: { cards: Map<Suit, Map<Rank, number>>,  card_count: number, hand_value: number, ace_count: number }): Hand {
//         const hand = super.deserialize({ cards: data.cards }) as Hand;
//         hand.card_count = data.card_count;
//         hand.hand_value = data.hand_value;
//         hand.ace_count = data.ace_count;
//         return hand;
//     }
// }

// export function handValue(hand: CardModule.Hand): number {
//     let value = 0;
//     for (let rank = 1; rank <= 13; rank++){
//         for (const suit of ["spades", "hearts", "diamonds", "clubs"] as Suit[]) {
//             const card : Card = { suit: suit, rank: rank as Rank };
//             if (!validateCard(card)) continue;
//             value += pointValue(card) * hand.countCard(card); // should be guaranteed valid
//         }
//     }
//     let aceCount = 0;
//     for (const suit of ["spades", "hearts", "diamonds", "clubs"] as Suit[]) {
//         const card : Card = { suit: suit, rank: 1 as Rank };
//         aceCount += hand.countCard(card); // should be guaranteed valid
//     }
//     value += aceCount * 11;
//     while (value > 21 && aceCount > 0) {
//         value -= 10;
//         aceCount--;
//     }
//     return value;
// }