import { feDropShadow } from "motion/react-client";

export type Suit = "spades" | "hearts" | "diamonds" | "clubs" | "jokers";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Trump {
    suit: Suit | null;
    rank: Rank;
}

export function trumpToString(trump: Trump): string {
    if (!trump.suit) return `No Trump (${trump.rank})`;
    const card : Card = { suit: trump.suit, rank: trump.rank };
    return cardToString(card);
}

export interface Card {
    suit: Suit;
    rank: Rank;
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

// checker functions

function isJoker(card: Card): boolean {
    return card.suit === "jokers";
}

function isBigTrump(card: Card, trump: Trump): boolean {
    return card.suit === trump.suit && card.rank === trump.rank;
}

function isSmallTrump(card: Card, trump: Trump): boolean {
    return !isBigTrump(card, trump) && card.rank === trump.rank;
}

function isTrumpSuit(card: Card, trump: Trump): boolean {
    return card.suit === trump.suit;
}

function isMainLine(card: Card, trump: Trump): boolean {
    return isJoker(card) || isBigTrump(card, trump) || isSmallTrump(card, trump) || isTrumpSuit(card, trump);
}

// array representing relative value
function getCardData(card: Card, trump: Trump): number[]{
    return [
        isJoker(card) ? 1 : 0,
        isSmallTrump(card, trump) ? 1 : 0,
        isTrumpSuit(card, trump) ? 1 : 0,
        card.rank
    ];
}

// card data for next card
export function getNextCardData(card: Card, trump: Trump): number[] | null {

    if (isJoker(card) && card.rank === 2) return null; // biggest card

    if (isBigTrump(card, trump)) return [1, 0, 0, 1];

    const val : number[] = getCardData(card, trump);

    if (isSmallTrump(card, trump)) val[2] = 1; // big trump
    else {
        val[3] += 1;
        if (val[3] === trump.rank) val[3] += 1;
        if (val[3] > 14) {
            val[3] = trump.rank;
            if (isTrumpSuit(card, trump)) {
                val[1] = 1;
                val[2] = 0;
            } else return null;
        }
    }

    return val;
}

// check if card_a = card_b + 1
function isCardAdjacent(card_a: Card, card_b: Card, trump: Trump): boolean {

    if (!isMainLine(card_a, trump) && card_a.suit !== card_b.suit) return false;
    
    const val_a : number[] = getCardData(card_a, trump);
    const val_b : number[] | null = getNextCardData(card_b, trump);

    if (!val_b) return false;

    for (let i = 0; i < 4; i++) {
        if (val_a[i] > val_b[i]) return false;
        if (val_a[i] < val_b[i]) return false;
    }

    return true;
}

// check if card_a > card_b, assuming card_b was played first (trumps in the case of equality)
function isCardBigger(card_a: Card, card_b: Card, trump: Trump): boolean {
    const val_a : number[] = getCardData(card_a, trump);
    const val_b : number[] = getCardData(card_b, trump);

    for (let i = 0; i < 4; i++) {
        if (val_a[i] > val_b[i]) return true;
        if (val_a[i] < val_b[i]) return false;
    }

    return false;
}

// sort cards from greatest to least relative value
export function sortCards(cards: Card[], trump: Trump): Card[] {
    return cards.sort((a, b) => {
        return isCardBigger(a, b, trump) ? -1 : 1;
    });
}

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

export function initializeDeck(decks: number): Deck {
    const deck: Deck = { cards: [] };
    for (let d = 0; d < decks; d++){
        for (const suit of ["spades", "hearts", "diamonds", "clubs"] as Suit[]) {
            for (let rank = 1; rank <= 14; rank++){
                const card : Card = { suit: suit, rank: rank as Rank };
                if (!validateCard(card)) continue;
                deck.cards.push(card);
            }
        }
    }
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

// get card count for cards that can be played in tricks responding the lead card
function getTrickCount(hand: Hand, lead: Card, trump: Trump): { tricks: Card[][], suit_count: number } {
    const tricks : Card[][] = [];
    let suit_count : number = 0;
    const is_main_line : boolean = isMainLine(lead, trump);
    for (let rank = 1; rank <= 14; rank++){
        for (const suit of ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[]) {
            const card : Card = { suit: suit, rank: rank as Rank }
            if (!validateCard(card)) continue;
            const main : boolean = isMainLine(card, trump);
            if (!is_main_line && main) continue;
            if (is_main_line && !main) continue;
            if ((is_main_line && main) || (card.suit === lead.suit)) {
                const count : number = getCardCount(hand, card);
                if (count === 0) continue;
                while (tricks.length <= count) tricks.push([]);
                tricks[count].push(card);
                suit_count += count;
            }   
        }
    }
    // console.log("Tricks:", tricks);
    return { tricks: tricks, suit_count: suit_count };
}

export function initializeHand(): Hand {
    const hand : Hand = { cards : new Map<Suit, Map<Rank, number>>() };
    for (const suit of ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[]) {
        hand.cards.set(suit, new Map<Rank, number>());
    }
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

// Ordering for display
const suit_order: Map<Suit, number> = new Map<Suit, number>([
    ["spades", 3],
    ["hearts", 2],
    ["clubs", 1],
    ["diamonds", 0],
    ["jokers", 4]
]);

export function handToString(hand: Hand, trump: Trump): string {
    let cards : Card[] = [];
    for (const suit of ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[]) {
        for (let rank = 1; rank <= 14; rank++){
            const card : Card = { suit : suit, rank : rank as Rank };
            const num : number = getCardCount(hand, card);
            for (let i = 0; i < num; i++) cards.push(card);
        }
    }

    cards.sort((b, a) => {
        if (!isMainLine(a, trump) && !isMainLine(b, trump)) {
            if (a.suit !== b.suit) return suit_order.get(b.suit)! - suit_order.get(a.suit)!;
            else return b.rank - a.rank;
        }
        return isCardBigger(a, b, trump) ? -1 : 1;
    })
    return "[" + cards.map(cardToString).join(', ') + "]";
}

export interface Play {
    cards: Card[];
    suit: Suit | null;
}

// determine type of play
function getPlayKind(play: Play): string { // TODO: fix for 4+ decks
    const cardcount : number = play.cards.length;
    if (cardcount === 1) return "single";
    if (cardcount === 2) return "pair";
    if (cardcount === 3) return "triple";
    return "tractor";
}

// returns structure of a play (how many consecutive, single/duple/triple)
export function getPlayStruct(play: Play, trump: Trump): { len: number; count: number; list: Card[] } | null {
    const hand : Hand = initializeHand();
    let max_count : number = 0;
    for (const card of play.cards) {
        addCardToHand(card, hand);
        max_count = Math.max(max_count, getCardCount(hand, card));
    }
    let max_num : number = 0;
    const max_list : Card[] = [];
    for (let rank = 1; rank <= 14; rank++) {
        for (const suit of ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[]) {
            const card : Card = { suit: suit, rank: rank as Rank };
            const count : number = getCardCount(hand, card);
            if (count === max_count) {
                max_num++;
                max_list.push(card);
                continue;
            }
            if (count > 0) return null;
        }
    }
    sortCards(max_list, trump);
    return { len: max_num, count: max_count, list: max_list };
}

// check if cards are consectuive
function isConsecutiveCards(cards: Card[], trump: Trump): boolean {
    if (cards.length === 0) return true;
    
    sortCards(cards, trump);

    for (let i = 0; i < cards.length - 1; i++) {
        if (!isCardAdjacent(cards[i], cards[i + 1], trump)) return false;
    }
    return true;
}

// return sorted list of lengths of consecutive card segments
function findMaxConsecutive(cards: Card[], trump: Trump): number[] {
    if (!cards) return [];
    
    sortCards(cards, trump);
    // console.log("Finding max consecutive in:", cardsToString(cards));

    let len : number = 1;

    const seq : number[] = [];
    for (let i = 0; i < cards.length - 1; i++) {
        if (isCardAdjacent(cards[i], cards[i + 1], trump)) len++;
        else {
            seq.push(len);
            len = 1;
        }
    }

    seq.sort((a, b) => {
        return a > b ? 1 : -1;
    });

    return seq;
}

// check if play_a conforms to play_b format
function isPlayFormatted(play_a: Play, play_b: Play, trump: Trump){

    const struct_a = getPlayStruct(play_a, trump);
    const struct_b = getPlayStruct(play_b, trump);
    
    if (!struct_a || !struct_b) return false;

    return struct_a.len === struct_b.len && struct_a.count === struct_b.count && isConsecutiveCards(struct_a.list, trump);
}

// check if play is valid given current hand and lead play (assume lead is a valid play)
export function isPlayValid(play: Play, lead: Play, hand: Hand, trump: Trump): boolean {
    
    // check if play is subset of hand
    const play_hand : Hand = initializeHand();

    for (const card of play.cards){
        addCardToHand(card, play_hand);
        if (getCardCount(play_hand, card) > getCardCount(hand, card)) return false;
    }

    // get lead play struct
    const struct : { len: number; count: number; list: Card[] } | null = getPlayStruct(lead, trump);
    const len : number = struct ? struct.len : 0;
    const count : number = struct ? struct.count : 0;

    const hand_tricks : { tricks: Card[][], suit_count: number } = getTrickCount(hand, lead.cards[0], trump);
    const play_tricks : { tricks: Card[][], suit_count: number } = getTrickCount(play_hand, lead.cards[0], trump);

    // check for suit 
    if (play_tricks.suit_count < Math.min(hand_tricks.suit_count, play.cards.length)) return false;

    let rem_tricks : number = len;

    for (let tix = count; tix >= 2; tix--) {

        const hand_trick : Card[] = hand_tricks.tricks[tix] || [];
        const play_trick : Card[] = play_tricks.tricks[tix] || [];

        const pos_max : number[] = findMaxConsecutive(hand_trick, trump);
        const play_max : number[] = findMaxConsecutive(play_trick, trump);

        for (let i = 0; i < pos_max.length; i++){
            if (rem_tricks === 0 ) break;
            if (play_max.length <= i) return false; 
            const pos : number = Math.min(rem_tricks, pos_max[i])
            if (play_max[i] < pos) return false; 
            rem_tricks -= pos;
        }
        
        if (rem_tricks === 0) break;

        for (const card_a of hand_trick) {
            let pres : boolean = false;
            for (const card_b of play_trick){
                pres = pres || (card_a.rank === card_b.rank && card_a.suit === card_b.suit)
            }
            if (!pres) return false;
        }
    }

    return true;
}

//check if play_a "kills" play_b
export function isPlayBigger(play_a: Play, play_b: Play, trump: Trump): boolean { // assumes same kind of play, play_b is a valid play

    sortCards(play_a.cards, trump);
    sortCards(play_b.cards, trump);

    // console.log("Play A:", playToString(play_a));
    // console.log("Play B:", playToString(play_b));
    
    const formatted_play : boolean = isPlayFormatted(play_a, play_b, trump);

    if (!formatted_play || play_a.suit !== play_b.suit) return false;

    for (let i = 0; i < play_b.cards.length; i++) if (!isCardBigger(play_a.cards[i], play_b.cards[i], trump)) return false;
    
    return true;
}

export function playToString(play: Play): string {

    const card_strings : string[] = play.cards.map(cardToString);

    return `${getPlayKind(play)}(${card_strings.join(", ")})`;
}
