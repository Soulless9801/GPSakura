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

// TODO: buff testcase generation

export interface TestCase {
    ihand: IHand;
    ilead: IPlay;
    iplay: IPlay;
    trump: Trump;
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

const SUITS = ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as Rank[];

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

function randomLeadTrick(rng: RNG, suit: Suit | null): Play {

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

function randomLead(rng: RNG, trump: Trump): Play {

    const trick : Play = randomLeadTrick(rng, null);

    const trickCount : number = rng.int(1, 3);
    if (trickCount === 1 || trick.cards.length === 1) return trick;
    
    const suit : Suit = trick.suit || "jokers"; // just in case, should never be null here

    const play: Play = { cards: [], suit: trick.suit };

    for (const card of trick.cards){
        play.cards.push(card);
        let nxt : Card | null = card;
        for (let i = 1; i < trickCount; i++) {
            const nxtdata : number[] | null = SJComp.getNextCardData(nxt, trump);
            if (!nxtdata) break;
            nxt = getCardFromData(nxtdata, suit, trump);
            if (!nxt) break; // just in case
            play.cards.push(nxt);
        }
    }

    SJComp.sortCards(play.cards, trump);

    return play;
}

export function genTestCase(): TestCase {

    const deck : Deck = SJCore.initializeDeck(2);
    const hand : Hand = SJCore.initializeHand();

    const handSize : number = 8; // extra cards

    for (let i = 0; i < handSize; i++) {
        const card = SJCore.drawCard(deck);
        if (card) SJCore.addCardToHand(card, hand);
    }

    const rng : RNG = new RNG(Date.now());

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

    const lead : Play = randomLead(rng, trump);

    const ilead = SJComp.playToInfo(lead, trump);

    const leadstruct : { len: number; count: number; list: Card[] } | null = SJComp.getPlayStruct(lead, ilead.ihand, trump);

    if (leadstruct === null) return genTestCase(); // retry if leadstruct is null

    const play : Play = { cards: [], suit: SJComp.isMainLine(lead.cards[0], trump) ? null : lead.suit };
    
    for (let i = 0; i < leadstruct.len; i++){

        let trick : Play = randomLeadTrick(rng, lead.suit || null);

        let val : boolean = trick.cards.length <= leadstruct.count;

        while (!val) {
            trick = randomLeadTrick(rng, lead.suit || null);
            val = trick.cards.length <= leadstruct.count;
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

    const iplay = SJComp.playToInfo(play, trump);
    const ihand = SJComp.handToInfo(hand, trump);

    return {
        ihand: ihand,
        ilead: ilead,
        iplay: iplay,
        trump: trump
    }
}