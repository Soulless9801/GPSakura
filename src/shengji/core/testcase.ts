import { Card, sortCards, validateCard } from "./entities";
import * as ShenJiCore from "/src/shengji/core/entities";

export interface TestCase {
    hand: ShenJiCore.Hand;
    lead: ShenJiCore.Play;
    play: ShenJiCore.Play;
    trump: ShenJiCore.Trump;
}

class RNG {
    private state: number;

    constructor(seed: number) {
        this.state = seed;
    }

    next(): number {
        // xorshift32
        let x = this.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        this.state = x;
        return (x >>> 0) / 2 ** 32;
    }

    int(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    pick<T>(arr: T[]): T {
        return arr[this.int(0, arr.length - 1)];
    }

    chance(p: number): boolean {
        return this.next() < p;
    }
}

const SUITS = ["spades", "hearts", "diamonds", "clubs", "jokers"] as ShenJiCore.Suit[];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as ShenJiCore.Rank[];

function getCardFromData(data: number[], suit: ShenJiCore.Suit, trump: ShenJiCore.Trump): ShenJiCore.Card | null {
    const card : ShenJiCore.Card = { suit: suit, rank: data[3] as ShenJiCore.Rank };

    if (data[1] === 1) card.rank = trump.rank;
    if (trump.suit && data[2] === 1) card.suit = trump.suit;

    if (data[1] === 1 && data[2] === 0) { // randomly pick a small trump suit that is not the trump suit
        if (card.suit === trump.suit) {
            let val : boolean = card.suit !== trump.suit;
            while (val) {
                card.suit = RNG.prototype.pick<ShenJiCore.Suit>(SUITS);
                val = card.suit !== "jokers" && card.suit === trump.suit;
            }
        }
    }

    if (data[0] === 1) card.suit = "jokers";

    if (validateCard(card)) return card;
    return null;
}

function genCard(rng: RNG) : ShenJiCore.Card {

    const card : Card = {
        suit: rng.pick<ShenJiCore.Suit>(SUITS),
        rank: rng.pick<ShenJiCore.Rank>(RANKS)
    };

    let val : boolean = validateCard(card);

    while (!val) {
        card.suit = rng.pick<ShenJiCore.Suit>(SUITS);
        card.rank = rng.pick<ShenJiCore.Rank>(RANKS);

        val = validateCard(card);
    }

    return card
}

function randomLeadTrick(rng: RNG, suit: ShenJiCore.Suit | null): ShenJiCore.Play {

    const kindroll = rng.next();

    let card : ShenJiCore.Card = genCard(rng);

    let val : boolean = suit === null || card.suit === suit;

    while (!val) {
        card = genCard(rng);

        val = card.suit === suit;
    }   

    const play: ShenJiCore.Play = { cards: [card], suit: card.suit };

    if (kindroll > 0.4) play.cards.push(card);    
    if (kindroll > 0.7) play.cards.push(card);

    return play;
}

function randomLead(rng: RNG, trump: ShenJiCore.Trump): ShenJiCore.Play {

    const trick : ShenJiCore.Play = randomLeadTrick(rng, null);

    const trickCount : number = rng.int(1, 3);
    if (trickCount === 1 || trick.cards.length === 1) return trick;
    
    const suit : ShenJiCore.Suit = trick.suit || "jokers"; // just in case, should never be null here

    const play: ShenJiCore.Play = { cards: [], suit: trick.suit };

    for (const card of trick.cards){
        play.cards.push(card);
        let nxt : ShenJiCore.Card | null = card;
        for (let i = 1; i < trickCount; i++) {
            const nxtdata : number[] | null = ShenJiCore.getNextCardData(nxt, trump);
            if (!nxtdata) break;
            nxt = getCardFromData(nxtdata, suit, trump);
            if (!nxt) break; // just in case
            play.cards.push(nxt);
        }
    }

    sortCards(play.cards, trump);

    return play;
}

export function genTestCase(): TestCase {

    const deck : ShenJiCore.Deck = ShenJiCore.initializeDeck(2);
    const hand : ShenJiCore.Hand = ShenJiCore.initializeHand();

    const handSize : number = 8; // extra cards

    for (let i = 0; i < handSize; i++) {
        const card = ShenJiCore.drawCard(deck);
        if (card) ShenJiCore.addCardToHand(card, hand);
    }

    const rng : RNG = new RNG(Date.now());

    const trumpcard : ShenJiCore.Card = genCard(rng);

    let val : boolean = trumpcard.suit !== "jokers";

    while (!val) {
        trumpcard.suit = rng.pick<ShenJiCore.Suit>(SUITS);
        val = trumpcard.suit !== "jokers";
    }

    const trump : ShenJiCore.Trump = {
        suit: trumpcard.suit,
        rank: trumpcard.rank
    };

    const lead : ShenJiCore.Play = randomLead(rng, trump);

    const leadstruct : { len: number; count: number; list: ShenJiCore.Card[] } | null = ShenJiCore.getPlayStruct(lead, trump);

    if (leadstruct === null) return genTestCase(); // retry if leadstruct is null

    const play : ShenJiCore.Play = { cards: [], suit: lead.suit };
    
    for (let i = 0; i < leadstruct.len; i++){

        let trick : ShenJiCore.Play = randomLeadTrick(rng, lead.suit);

        let val : boolean = trick.cards.length <= leadstruct.count;

        while (!val) {
            trick = randomLeadTrick(rng, lead.suit);
            val = trick.cards.length <= leadstruct.count;
        }

        for (const card of trick.cards) {
            play.cards.push(card);
            ShenJiCore.addCardToHand(card, hand); // ensure the play cards are in hand
        }
    }

    while (play.cards.length < lead.cards.length) {
        const card = genCard(rng);
        play.cards.push(card);
        ShenJiCore.addCardToHand(card, hand); // ensure the play cards are in hand
    }

    sortCards(play.cards, trump);

    return {
        hand: hand,
        lead: lead,
        play: play,
        trump: trump
    }
}