import * as SJCore from "/src/shengji/core/entities";

type Suit = SJCore.Suit;
type Rank = SJCore.Rank;
type Trump = SJCore.Trump;
type Card = SJCore.Card;
type Hand = SJCore.Hand;
type Play = SJCore.Play;

// checker functions
function isJoker(card: Card): boolean {
    return card.suit === "jokers";
}

function isBigTrump(card: Card, trump: Trump): boolean {
    return isTrumpSuit(card, trump) && isTrumpRank(card, trump);
}

function isSmallTrump(card: Card, trump: Trump): boolean {
    return !isTrumpSuit(card, trump) && isTrumpRank(card, trump);
}

function isTrumpSuit(card: Card, trump: Trump): boolean {
    return card.suit === trump.suit;
}

function isTrumpRank(card: Card, trump: Trump): boolean {
    return card.rank === trump.rank;
}

function isMainLine(card: Card, trump: Trump): boolean {
    return isJoker(card) || isBigTrump(card, trump) || isSmallTrump(card, trump) || isTrumpSuit(card, trump);
}

// array representing relative value
function getCardData(card: Card, trump: Trump): number[]{
    return [
        isJoker(card) ? 1 : 0,
        isTrumpRank(card, trump) ? 1 : 0,
        isTrumpSuit(card, trump) ? 1 : 0,
        card.rank
    ];
}

// get card data for card + 1, return null if card is biggest
export function getNextCardData(card: Card, trump: Trump): number[] | null {

    if (isJoker(card) && card.rank === 2) return null; // biggest card

    if (isBigTrump(card, trump)) return [1, 0, 0, 1]; // small joker

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

// Ordering for display
const suit_order: Map<Suit, number> = new Map<Suit, number>([
    ["spades", 3],
    ["hearts", 2],
    ["clubs", 1],
    ["diamonds", 0],
    ["jokers", 4]
]);

// sort cards from greatest to least relative value
export function sortCards(cards: Card[], trump: Trump | null): Card[] {
    // console.log("Sorting cards:", cardsToString(cards), "Trump:", trumpToString(trump || { suit: null, rank: 0 })); 
    return cards.sort((b, a) => {
        if (!trump || (!isMainLine(a, trump) && !isMainLine(b, trump))) {
            if (a.suit !== b.suit) return suit_order.get(b.suit)! - suit_order.get(a.suit)!;
            else return b.rank - a.rank;
        }
        return isCardBigger(a, b, trump) ? -1 : 1;
    });
}

// check if cards are exactly the same
export function isCardEqual(card_a: Card, card_b: Card): boolean {
    return card_a.suit === card_b.suit && card_a.rank === card_b.rank;
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

// helper function to check if cards all the same
export function isAllSame(cards: Card[]): boolean {
    if (cards.length === 0) return true;
    const suit : Suit = cards[0].suit;
    const rank : Rank = cards[0].rank;
    for (const card of cards) {
        if (card.suit !== suit || card.rank !== rank) return false;
    }
    return true;
}

// helper function to check if cards are all jokers
export function isAllJokers(cards: Card[]): boolean {
    for (const card of cards) {
        if (card.suit !== "jokers") return false;
    }
    return true;
}

// get card count for cards that can be played in tricks responding the lead card
function getTrickCount(hand: Hand, lead: Card, trump: Trump): { tricks: Card[][], suit_count: number } {
    const tricks : Card[][] = [];
    let suit_count : number = 0;
    const is_main_line : boolean = isMainLine(lead, trump);
    for (let rank = 1; rank <= 14; rank++){
        for (const suit of ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[]) {
            const card : Card = { suit: suit, rank: rank as Rank }
            if (!SJCore.validateCard(card)) continue;
            const main : boolean = isMainLine(card, trump);
            if (!is_main_line && main) continue;
            if (is_main_line && !main) continue;
            if ((is_main_line && main) || (card.suit === lead.suit)) {
                const count : number = SJCore.getCardCount(hand, card);
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

// check if cards are consectuive
function isConsecutiveCards(cards: Card[], trump: Trump): boolean {
    if (cards.length === 0) return true;
    
    sortCards(cards, trump);

    for (let i = 0; i < cards.length - 1; i++) {
        if (!isCardAdjacent(cards[i + 1], cards[i], trump)) return false;
    }
    return true;
}

// get structure of play n x m if valid else null
export function getPlayStruct(play: Play, trump: Trump): { len: number; count: number; list: Card[] } | null {
    const hand : Hand = SJCore.initializeHand();
    let max_count : number = 0;
    for (const card of play.cards) {
        SJCore.addCardToHand(card, hand);
        max_count = Math.max(max_count, SJCore.getCardCount(hand, card));
    }
    let max_num : number = 0;
    const max_list : Card[] = [];
    for (let rank = 1; rank <= 14; rank++) {
        for (const suit of ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[]) {
            const card : Card = { suit: suit, rank: rank as Rank };
            const count : number = SJCore.getCardCount(hand, card);
            if (count === max_count) {
                max_num++;
                max_list.push(card);
                continue;
            }
            if (count > 0) return null;
        }
    }
    if (max_num === 0 || max_count === 0) return null; // must have at least 1 card
    if (max_count === 1 && max_num > 1) return null; // if single, must be only 1 card
    if (!isConsecutiveCards(max_list, trump)) return null; // must be consecutive cards (auto sorts)
    return { len: max_num, count: max_count, list: max_list };
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

// is play a subset of given hand
export function isPlaySubset(play: Play, hand: Hand): Hand | null {
    const play_hand : Hand = SJCore.initializeHand();

    for (const card of play.cards){
        SJCore.addCardToHand(card, play_hand);
        if (SJCore.getCardCount(play_hand, card) > SJCore.getCardCount(hand, card)) return null;
    }

    return play_hand;
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
    
    // console.log("Validating play:", playToString(play), "Lead:", playToString(lead), "Hand:", handToString(hand, trump));

    // check if play is subset of hand
    const play_hand : Hand | null = isPlaySubset(play, hand);

    if (!play_hand) return false;

    // get lead play struct
    const lead_struct : { len: number; count: number; list: Card[] } | null = getPlayStruct(lead, trump);

    // console.log(lead_struct);

    if (!lead_struct){
        const play_struct : { len: number; count: number; list: Card[] } | null = getPlayStruct(play, trump);
        if (!play_struct) return false; // must be a valid play format
        return true; // if no lead, any valid play is fine
    } else if (play.cards.length !== lead.cards.length) return false; // must be same amount of cards

    const len : number = lead_struct.len;
    const count : number = lead_struct.count;

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
export function isPlayBigger(play_a: Play, play_b: Play, trump: Trump): boolean { // assumes same kind of play, both plays are valid

    if (play_b.cards.length === 0) return true; // if no cards played, any play is bigger

    sortCards(play_a.cards, trump);
    sortCards(play_b.cards, trump);

    // console.log("Play A:", playToString(play_a));
    // console.log("Play B:", playToString(play_b));
    
    const formatted_play : boolean = isPlayFormatted(play_a, play_b, trump);

    if (!formatted_play || play_a.suit !== play_b.suit) return false;

    for (let i = play_b.cards.length - 1; i >= 0; i--) if (!isCardBigger(play_a.cards[i], play_b.cards[i], trump)) return false;
    
    return true;
}
