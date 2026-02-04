export type Suit = "spades" | "hearts" | "diamonds" | "clubs" | "jokers";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Trump {
    suit: Suit;
    rank: Rank;
}

export interface Card {
    suit: Suit;
    rank: Rank;
}

function sortCards(cards: Card[], trump: Trump): Card[] {
    return cards.sort((a, b) => {
        return isCardBigger(a, b, trump) ? -1 : 1;
    });
}

export function validateCard(card: Card): boolean {
    if (card.suit !== "jokers") return card.rank >= 2 && card.rank <= 14;
    return card.rank >= 1 && card.rank <= 2; // 1 = small joker, 2 = big joker
}

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

function isCardAdjacent(card_a: Card, card_b: Card, trump: Trump): boolean { // if card_a = card_b + 1

    if (isJoker(card_b)) {
        if (!isJoker(card_a)) return false;
        return card_a.rank === card_b.rank + 1;
    }

    const big_trump_b : boolean = isBigTrump(card_b, trump);
    const small_joker_a : boolean = isJoker(card_a) && card_a.rank === 1;

    if (big_trump_b) return small_joker_a;

    if (small_joker_a) return false;

    const small_trump_b : boolean = isSmallTrump(card_b, trump);
    const big_trump_a : boolean = isBigTrump(card_a, trump);
    
    if (small_trump_b) return big_trump_a;

    if (big_trump_a) return false;

    const small_trump_a : boolean = isSmallTrump(card_a, trump);

    const suit: Suit = card_b.suit;

    let expected_rank : number = card_b.rank + 1;
    if (expected_rank === trump.rank) expected_rank += 1;
    if (expected_rank > 14) {
        if (suit === trump.suit) return small_trump_a;

        return false;
    }
    
    if (small_trump_a) return false;

    return card_a.suit === suit && card_a.rank === expected_rank as Rank;
}

function isCardBigger(card_a: Card, card_b: Card, trump: Trump): boolean {

    const joker_b : boolean = isJoker(card_b);
    const joker_a : boolean = isJoker(card_a);

    if (joker_a && joker_b) return card_a.rank > card_b.rank;

    if (joker_b) return false;

    if (joker_a) return true;

    const big_trump_b : boolean = isBigTrump(card_b, trump);

    if (big_trump_b) return false;

    const big_trump_a : boolean = isBigTrump(card_a, trump);

    if (big_trump_a) return true;

    const small_trump_b : boolean = isSmallTrump(card_b, trump);

    if (small_trump_b) return false;

    const small_trump_a : boolean = isSmallTrump(card_a, trump);

    if (small_trump_a) return true;

    const trump_suit_a : boolean = isTrumpSuit(card_a, trump);
    const trump_suit_b : boolean = isTrumpSuit(card_b, trump);

    if (trump_suit_a && !trump_suit_b) return true;

    if (!trump_suit_a && trump_suit_b) return false;

    if (card_a.suit !== card_b.suit) return false;
    
    return card_a.rank > card_b.rank;
}

function isCardEqual(card_a: Card, card_b: Card): boolean {

    const same_suit : boolean = card_a.suit === card_b.suit;
    const same_rank : boolean = card_a.rank === card_b.rank;

    return same_suit && same_rank;
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

function cardsToString(cards: Card[]): string {
    const card_strings : string[] = cards.map(cardToString);
    return "[" + card_strings.join(', ') + "]";
}

export interface Hand {
    cards: Map<Suit, Map<Rank, number>>;
}

function getCardCount(hand: Hand, card: Card): number {
    const count : number | undefined = hand.cards.get(card.suit)?.get(card.rank);
    return count || 0;
}

function getTrickCount(hand: Hand, lead_suit: Suit, trump: Trump): { tricks: Card[][], suit_count: number } {
    const tricks : Card[][] = [];
    let suit_count : number = 0;
    const is_trump_suit : boolean = lead_suit === trump.suit;
    for (let rank = 1; rank <= 14; rank++){
        for (const suit of ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[]) {
            const card : Card = { suit: suit, rank: rank as Rank }
            if (!is_trump_suit && isMainLine(card, trump)) continue;
            if (is_trump_suit && !isMainLine(card, trump)) continue;
            if (!validateCard(card)) continue;
            const count : number = getCardCount(hand, card);
            while (tricks.length <= count) tricks.push([]);
            tricks[count].push(card);
            suit_count += count;
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
    const prev : number = hand.cards.get(card.suit)?.get(card.rank) || 0;
    hand.cards.get(card.suit)?.set(card.rank, prev + 1);
}

export function handToString(hand: Hand): string {
    let card_strings : string[] = [];
    for (const suit of ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[]) {
        for (let rank = 1; rank <= 14; rank++){
            const card : Card = { suit : suit, rank : rank as Rank };
            const card_string = cardToString(card);
            const num : number = getCardCount(hand, card);
            for (let i = 0; i < num; i++) card_strings.push(card_string);
        }
    }
    return "[" + card_strings.join(', ') + "]";
}

export interface Play {
    kind: "single" | "pair" | "triple" | "tractor";
    cards: Card[];
    suit: Suit;
}

function getPlayStruct(play: Play, trump: Trump): { len: number; count: number; list: Card[] } | null {
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
    // biggest cards first
    sortCards(max_list, trump);
    // console.log("Play Struct - Len:", max_num, "Count:", max_count, "List:", cardsToString(max_list));
    return { len: max_num, count: max_count, list: max_list };
}

function isConsecutiveCards(cards: Card[], trump: Trump): boolean {
    if (cards.length === 0) return true;
    
    sortCards(cards, trump);

    // console.log("Checking consecutive for:", cardsToString(cards));

    for (let i = 0; i < cards.length - 1; i++) {
        if (!isCardAdjacent(cards[i], cards[i + 1], trump)) return false;
    }
    return true;
}

function isPlayFormatted(play_a: Play, play_b: Play, trump: Trump){

    const struct_a = getPlayStruct(play_a, trump);
    const struct_b = getPlayStruct(play_b, trump);
    
    if (!struct_a || !struct_b) return false;

    return struct_a.len === struct_b.len && struct_a.count === struct_b.count && isConsecutiveCards(struct_a.list, trump);
}

export function isPlayValid(play: Play, lead: Play, hand: Hand, trump: Trump): boolean {
    
    // check if play is subset of hand
    const play_hand : Hand = initializeHand();

    for (const card of play.cards){
        addCardToHand(card, play_hand);
        if (getCardCount(play_hand, card) > getCardCount(hand, card)) return false;
    }

    const struct : { len: number; count: number; list: Card[] } | null = getPlayStruct(lead, trump);
    const len : number = struct ? struct.len : 0;
    const count : number = struct ? struct.count : 0;

    const suit : Suit = lead.suit;

    const hand_tricks : { tricks: Card[][], suit_count: number } = getTrickCount(hand, suit, trump);
    const play_tricks : { tricks: Card[][], suit_count: number } = getTrickCount(play_hand, suit, trump);

    if (play_tricks.suit_count < Math.min(hand_tricks.suit_count, play.cards.length)) return false;

    let rem_tricks : number = len;

    for (let tix = count; tix >= 2; tix--) {

        const hand_trick : Card[] = hand_tricks.tricks[tix];
        const play_trick : Card[] = play_tricks.tricks[tix];

        const pos_max : number[] = findMaxConsecutive(hand_trick, trump);
        const play_max : number[] = findMaxConsecutive(play_trick, trump);

        for (let i = 0; i < pos_max.length; i++){
            if (rem_tricks === 0 || pos_max[i] > rem_tricks) break;
            if (play_max.length <= i) return false; 
            if (play_max[i] < pos_max[i]) return false; 
            rem_tricks -= pos_max[i];
        }
        
        if (rem_tricks === 0) break;
    }

    return true;
}


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

    return `${play.kind}(${card_strings.join(", ")})`;
}

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
