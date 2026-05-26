import * as SJCore from "/src/shengji/core/entities";
import * as SJComp from "/src/shengji/core/comparison";

import { Deck, Hand } from "/src/shengji/core/entities";

type Suit = SJCore.Suit;
type Rank = SJCore.Rank;
type Trump = SJCore.Trump;
type Card = SJCore.Card;
// type Deck = Deck;
// type Hand = Hand;
type Play = SJCore.Play;

export function trumpToString(trump: Trump): string {
    if (!trump.suit) return `No Trump (${trump.rank})`;
    const card : Card = { suit: trump.suit, rank: trump.rank };
    return cardToString(card);
}

export function trumpToCard(trump: Trump): Card | null {
    return { suit: trump.suit ? trump.suit : "jokers", rank: trump.rank };
}

// check if card is valid
export function validateCard(card: Card): boolean {
    if (card.suit !== "jokers") return card.rank >= 2 && card.rank <= 14;
    return card.rank >= 1 && card.rank <= 2; // 1 = small joker, 2 = big joker
}

export function pointValue(card: Card): number {
    if (card.rank === 5) return 5;
    if (card.rank === 10 || card.rank === 13) return 10;
    return 0;
}

// stringifiers
export function cardToString(card: Card): string {

    if (card.suit === "jokers") return (card.rank === 1 ? "SJ" : "BJ");

    const suit_symbols : Record<string, string> = {
        "spades": "♠",
        "hearts": "♥",
        "diamonds": "♦",
        "clubs": "♣"
    };

    const rank_strings : Record<number, string> = {
        11: "J",
        12: "Q",
        13: "K",
        14: "A"
    };

    return `${rank_strings[card.rank] || card.rank}${suit_symbols[card.suit]}`;
}

export function cardsToString(cards: Card[]): string {
    const card_strings : string[] = cards.map(cardToString);
    return "[" + card_strings.join(', ') + "]";
}

export function handToCards(hand: Hand, trump: Trump | null): Card[] {
    let cards : Card[] = [];
    for (const suit of ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[]) {
        for (let rank = 1; rank <= 14; rank++){
            const card : Card = { suit : suit, rank : rank as Rank };
            const num : number = hand.countCard(card);
            for (let i = 0; i < num; i++) cards.push(card);
        }
    }

    SJComp.sortCards(cards, trump);

    return cards;
}

export function handToString(hand: Hand, trump: Trump | null): string {
    
    const cards : Card[] = handToCards(hand, trump);

    return "[" + cards.map(cardToString).join(', ') + "]";
}

// returns structure of a play (how many consecutive, single/duple/triple

export function playToString(play: Play): string {

    const card_strings : string[] = play.cards.map(cardToString);

    return `[${card_strings.join(", ")}]`;
}
