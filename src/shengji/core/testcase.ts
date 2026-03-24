import * as SJCore from "/src/shengji/core/entities";
import * as SJComp from "/src/shengji/core/comparison"

type Suit = SJCore.Suit;
type Rank = SJCore.Rank;
type Trump = SJCore.Trump;
type Card = SJCore.Card;
type Deck = SJCore.Deck;
type Hand = SJCore.Hand;
type Play = SJCore.Play;

type IPlay = SJComp.IPlay;
type IHand = SJComp.IHand;

// OBJECT
export interface TestCase {
    ihand: IHand;
    ilead: IPlay;
    iplay: IPlay;
    trump: Trump;
}

// RNG

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

// TYPES
const SUITS = ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as Rank[];

// CARD FUNCTIONS

// get card from data, return null if invalid
function getCardFromData(data: number[], suit: Suit, trump: Trump): Card | null {
    const card : Card = { suit: suit, rank: data[3] as Rank };

    if (data[1] === 1) card.rank = trump.rank;
    if (trump.suit && data[2] === 1) card.suit = trump.suit;

    if (data[1] === 1 && data[2] === 0) { // randomly pick a small trump suit that is not the trump suit
        if (card.suit === trump.suit) {
            let val : boolean = card.suit !== trump.suit;
            while (val) {
                card.suit = RNG.prototype.pick<Suit>(SUITS);
                val = card.suit !== "jokers" && card.suit === trump.suit;
            }
        }
    }

    if (data[0] === 1) card.suit = "jokers";

    if (SJCore.validateCard(card)) return card;
    return null;
}

// get next card
function getNextCard(card: Card | null, trump: Trump): Card | null {
    if (!card) return null;
    const data : number[] | null = SJComp.getNextCardData(card, trump);
    if (!data) return null;
    return getCardFromData(data, card.suit, trump);
}

// generate random valid card
function genCard(rng: RNG) : Card {

    const card : Card = {
        suit: rng.pick<Suit>(SUITS),
        rank: rng.pick<Rank>(RANKS)
    };

    let val : boolean = SJCore.validateCard(card);

    while (!val) {
        card.suit = rng.pick<Suit>(SUITS);
        card.rank = rng.pick<Rank>(RANKS);

        val = SJCore.validateCard(card);
    }

    return card
}


// GENERATION

// generate a random valid trump
function randomTrump(rng: RNG): Trump {

    const trumpcard : Card = genCard(rng);

    let val : boolean = trumpcard.suit !== "jokers";

    while (!val) {
        trumpcard.suit = rng.pick<Suit>(SUITS);
        val = trumpcard.suit !== "jokers";
    }

    const trump : Trump = {
        suit: trumpcard.suit,
        rank: trumpcard.rank
    };

    return trump;
}

// generates a trick, any suit if suit is null, otherwise must be the specified suit
function randomTrick(rng: RNG, suit: Suit | null): Play {

    const kindroll = rng.next();

    let card : Card = genCard(rng);

    let val : boolean = suit === null || card.suit === suit;

    while (!val) {
        card = genCard(rng);
        val = card.suit === suit;
    }   

    const play: Play = { cards: [card], suit: card.suit };

    if (kindroll > 0.2) play.cards.push(card);    
    if (kindroll > 0.5) play.cards.push(card);

    return play;
}

// generate a random play
function randomLeadPlay(rng: RNG, trump: Trump): Play {

    const trick : Play = randomTrick(rng, null);

    if (trick.cards.length === 1) return trick;

    let trick_count : number = 1;
    const trick_rng = rng.next();

    if (trick_rng > 0.2) trick_count++;
    if (trick_rng > 0.5) trick_count++;

    if (trick_count === 1) return trick;

    const play: Play = { cards: [], suit: trick.suit };

    for (const card of trick.cards){
        play.cards.push(card);
        let nxt : Card | null = card;
        for (let i = 1; i < trick_count; i++) {
            nxt = getNextCard(nxt, trump); // just in case
            if (!nxt) break;
            play.cards.push(nxt);
        }
    }

    return play;
}

// generates a random play and hand to "follow" a lead
function randomFollowPlay(rng: RNG, ilead: IPlay, trump: Trump): { play: Play, hand: Hand } {

    const deck : Deck = SJCore.initializeDeck(1);
    const hand : Hand = SJCore.initializeHand();

    const extra : number = 8; // extra cards

    for (let i = 0; i < extra; i++) {
        const card = SJCore.drawCard(deck);
        const card_rng = rng.next();
        if (card) {
            SJCore.addCardToHand(card, hand);
            if (card_rng > 0.5) SJCore.addCardToHand(card, hand);
            if (card_rng > 0.8) SJCore.addCardToHand(card, hand);
        }
    }

    const lead = ilead.play;
    const lead_struct = ilead.struct;

    // console.log(lead_struct);

    const n : number = lead_struct.cards[0].length;
    const m : number = lead_struct.count[0];

    // console.log(ilead);

    const play : Play = { cards: [], suit: lead.suit };

    let nxt : Card | null = null;
    
    for (let i = 0; i < n; i++){

        const next_rng = rng.next();
        nxt = getNextCard(nxt, trump);

        let trick : Play = { cards: [], suit: play.suit };

        if (nxt && next_rng > 0.2) { // make tractor
            for (let j = 0; j < m; j++) {
                trick.cards.push(nxt);
            }
        } else {
            trick = randomTrick(rng, play.suit);

            let val : boolean = trick.cards.length <= m;

            while (!val) {
                trick = randomTrick(rng, play.suit);
                val = trick.cards.length <= m;
            }

            nxt = trick.cards[0];
        }

        for (const card of trick.cards) {
            play.cards.push(card);
            SJCore.addCardToHand(card, hand); // ensure the play cards are in hand
        }
    }

    while (play.cards.length < lead.cards.length) {
        const card = genCard(rng);
        play.cards.push(card);
        SJCore.addCardToHand(card, hand); // ensure the play cards are in hand
    }

    return { play, hand };
}

export function genTestCase(): TestCase {

    const rng : RNG = new RNG(Date.now());

    const trump : Trump = randomTrump(rng);

    // console.log("Trump:", trump);

    const lead : Play = randomLeadPlay(rng, trump);
    // console.log("Lead:", lead);
    const ilead = SJComp.playToInfo(lead, trump);

    const play_hand : { play: Play, hand: Hand } = randomFollowPlay(rng, ilead, trump);

    const iplay = SJComp.playToInfo(play_hand.play, trump);
    const ihand = SJComp.handToInfo(play_hand.hand, trump);

    return {
        ihand: ihand,
        ilead: ilead,
        iplay: iplay,
        trump: trump
    }

}
