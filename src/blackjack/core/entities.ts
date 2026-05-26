import * as CardModule from '/src/entities/card';

export type Suit = CardModule.Suit;
export type Rank = CardModule.Rank;

export type Card = CardModule.Card;
export type Deck = CardModule.Deck;
export type Hand = CardModule.Hand;

export { addCardToHand } from '/src/entities/card';

export function validateCard(card: Card): boolean {
    return CardModule.validateCard(card) && card.suit !== "jokers"; // no jokers in blackjack
}

export function handValue(hand: Hand): number {
    let value = 0;
    for (let rank = 1; rank <= 13; rank++){
        for (const suit of ["spades", "hearts", "diamonds", "clubs"] as Suit[]) {
            const card : Card = { suit: suit, rank: rank as Rank };
            if (!validateCard(card)) continue;
            value += pointValue(card) * CardModule.getCardCount(hand, card);
        }
    }
    let aceCount = 0;
    for (const suit of ["spades", "hearts", "diamonds", "clubs"] as Suit[]) {
        const card : Card = { suit: suit, rank: 1 as Rank };
        aceCount += CardModule.getCardCount(hand, card); // should be guaranteed valid
    }
    value += aceCount * 11;
    while (value > 21 && aceCount > 0) {
        value -= 10;
        aceCount--;
    }
    return value;
}

export function pointValue(card: Card): number {
    if (card.rank > 1 && card.rank < 11) return card.rank;
    if (card.rank > 10 && card.rank < 14) return 10;
    if (card.rank === 14) return 1;
    return 0;
}
