import * as SJCore from "/src/shengji/core/entities";

type Suit = SJCore.Suit;
type Rank = SJCore.Rank;
type Trump = SJCore.Trump;
type Card = SJCore.Card;
type Hand = SJCore.Hand;
type Play = SJCore.Play;

export type IHand = {
    hand: Hand;
    struct: { cards: Card[], count: number[] };
}

export type IPlay = {
    play: Play;
    ihand: IHand;
    struct: { len: number; count: number; list: Card[] } | null;
}

export function handToInfo(hand: Hand, trump: Trump): IHand {
    return {
        hand: hand,
        struct: getHandStruct(hand, trump)
    }
}

export function playToInfo(play: Play, trump: Trump): IPlay {
    sortCards(play.cards, trump);
    const ihand = handToInfo(playToHand(play), trump);
    return {
        play: play,
        ihand: ihand,
        struct: getPlayStruct(play, ihand, trump)
    }
}

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

export function isMainLine(card: Card, trump: Trump): boolean {
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

// helper function to check if cards are all same suit
function isAllSameSuit(cards: Card[]): boolean {
    if (cards.length === 0) return true;
    const suit : Suit = cards[0].suit;
    for (const card of cards) {
        if (card.suit !== suit) return false;
    }
    return true;
}

// helper function to check if cards are all main line cards
function isAllMainLine(cards: Card[], trump: Trump): boolean {
    for (const card of cards) {
        if (!isMainLine(card, trump)) return false;
    }
    return true;
}

function playToHand(play: Play): Hand {
    const hand: Hand = SJCore.initializeHand();
    for (const card of play.cards) {
        SJCore.addCardToHand(card, hand);
    }
    return hand;
}


// get list of sorted cards in hand and their counts
function getHandStruct(hand: Hand, trump: Trump): { cards: Card[], count: number[] } {
    const cards: Card[] = [];
    const count: number[] = [];
    for (let rank = 1; rank <= 14; rank++) {
        for (const suit of ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[]) {
            const card: Card = { suit, rank: rank as Rank };
            const cardCount: number = SJCore.getCardCount(hand, card);
            if (cardCount > 0) {
                cards.push(card);
            }
        }
    }
    sortCards(cards, trump);
    for (const card of cards) {
        count.push(SJCore.getCardCount(hand, card));
    }
    return { cards, count };
}

function checkInline(card: Card, lead: Card, trump: Trump): boolean {
    if (!SJCore.validateCard(card)) return false;
    const card_main : boolean = isMainLine(card, trump);
    const lead_main : boolean = isMainLine(lead, trump);
    if ((!lead_main && card_main) || (lead_main && !card_main)) return false; // opposite
    if (!(lead_main && card_main) && !(card.suit === lead.suit)) return false; // not the same suit
    return true;
}

// get card count for cards that can be played in tricks responding the lead card
function getTrickCountUnused(hand: Hand, lead: Card, trump: Trump): { tricks: Card[][], suit_count: number } {
    const tricks : Card[][] = [];
    let suit_count : number = 0;
    for (let rank = 1; rank <= 14; rank++){
        for (const suit of ["spades", "hearts", "diamonds", "clubs", "jokers"] as Suit[]) {
            const card : Card = { suit: suit, rank: rank as Rank }
            if (checkInline(card, lead, trump)) {
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

function getTrickCount(ihand: IHand, lead: Card, trump: Trump): { tricks: Card[][], suit_count: number } {

    const hand_struct = ihand.struct;

    const tricks : Card[][] = [];
    let suit_count : number = 0;

    for (let i = 0; i < hand_struct.cards.length; i++) {
        const card : Card = hand_struct.cards[i];
        const count : number = hand_struct.count[i];
        if (checkInline(card, lead, trump)) {
            while (tricks.length <= count) tricks.push([]);
            tricks[count].push(card);
            suit_count += count;
        }
    }

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
export function getPlayStructUnused(play: Play, trump: Trump): { len: number; count: number; list: Card[] } | null {

    const hand : Hand = playToHand(play);

    let max_count : number = 0;
    for (const card of play.cards) max_count = Math.max(max_count, SJCore.getCardCount(hand, card));

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

export function getPlayStruct(play: Play, ihand: IHand, trump: Trump): { len: number; count: number; list: Card[] } | null {

    let max_count : number = 0;
    for (const card of play.cards) max_count = Math.max(max_count, SJCore.getCardCount(ihand.hand, card));

    const hand_struct = ihand.struct;

    let max_num : number = 0;
    const max_list : Card[] = [];

    for (let i = 0; i < hand_struct.cards.length; i++) {
        const card : Card = hand_struct.cards[i];
        const count : number = hand_struct.count[i];
        if (count === max_count) {
            max_num++;
            max_list.push(card);
            continue;
        }
        if (count > 0) return null; // must be a shuai
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

    const play_hand : Hand = playToHand(play);

    for (const card of play.cards) if (SJCore.getCardCount(play_hand, card) > SJCore.getCardCount(hand, card)) return null;

    return play_hand;
}

function isSubset(play: Play, play_hand: Hand, hand: Hand): boolean {

    for (const card of play.cards) if (SJCore.getCardCount(play_hand, card) > SJCore.getCardCount(hand, card)) return false;

    return true;
}


// check if play_a conforms to play_b format
function isPlayFormattedUnused(play_a: Play, play_b: Play, trump: Trump){

    const hand_a = playToHand(play_a);
    const hand_b = playToHand(play_b);

    const struct_a = getHandStruct(hand_a, trump);
    const struct_b = getHandStruct(hand_b, trump);

    for (let i = 0; i < struct_b.count.length; i++) if (struct_b.count[i] != struct_a.count[i]) return false;

    return true;
}

function isPlayFormatted(iplay_a: IPlay, iplay_b: IPlay, trump: Trump): boolean {

    const struct_a = iplay_a.ihand.struct;
    const struct_b = iplay_b.ihand.struct;

    for (let i = 0; i < struct_b.count.length; i++) if (struct_b.count[i] != struct_a.count[i]) return false;

    const play_a_max: number[] = findMaxConsecutive(struct_a.cards, trump);
    const play_b_max: number[] = findMaxConsecutive(struct_b.cards, trump);

    if (play_b_max.length !== play_a_max.length) return false;
    for (let i = 0; i < play_b_max.length; i++) if (play_b_max[i] != play_a_max[i]) return false;

    return true;
}

export function isPlayValid(iplay: IPlay, ilead: IPlay, ihand: IHand, trump: Trump): boolean {

    // check if play is subset of hand
    if (!isSubset(iplay.play, iplay.ihand.hand, ihand.hand)) return false;

    // get lead play struct
    const lead_struct = ilead.struct;
    const play_struct = iplay.struct;

    if (!lead_struct) return play_struct !== null; // if no lead, any valid play is fine
    if (iplay.play.cards.length !== ilead.play.cards.length) return false; // must be same amount of cards

    const len : number = lead_struct.len;
    const count : number = lead_struct.count;

    const hand_tricks : { tricks: Card[][], suit_count: number } = getTrickCount(ihand, ilead.play.cards[0], trump);
    const play_tricks : { tricks: Card[][], suit_count: number } = getTrickCount(iplay.ihand, ilead.play.cards[0], trump);

    if (play_tricks.suit_count < Math.min(hand_tricks.suit_count, iplay.play.cards.length)) return false; // must play all of same suit if have

    let rem_tricks : number = len;

    for (let tix = count; tix >= 2; tix--) {

        const hand_trick : Card[] = hand_tricks.tricks[tix] || [];
        const play_trick : Card[] = play_tricks.tricks[tix] || [];

        const pos_max : number[] = findMaxConsecutive(hand_trick, trump);
        const play_max : number[] = findMaxConsecutive(play_trick, trump);

        for (let i = 0; i < pos_max.length; i++){

            if (rem_tricks === 0 ) break; // no more tricks to match

            if (play_max.length <= i) return false; // must have enough tricks to match

            const pos : number = Math.min(rem_tricks, pos_max[i]);
            if (play_max[i] < pos) return false; // if you have something better you must play it

            rem_tricks -= pos;
        }
        
        if (rem_tricks === 0) break;

        for (const card_a of hand_trick) {
            let pres : boolean = false;
            for (const card_b of play_trick){
                pres = pres || isCardEqual(card_a, card_b);
            }
            if (!pres) return false; // if remaining tricks, must play all of current trick type
        }
    }

    return true;
}

// check if play is valid given current hand and lead play (assume lead is a valid play)
export function isPlayValidUnused(play: Play, lead: Play, hand: Hand, trump: Trump): boolean {
    
    // console.log("Validating play:", playToString(play), "Lead:", playToString(lead), "Hand:", handToString(hand, trump));

    // check if play is subset of hand
    const play_hand : Hand | null = isPlaySubset(play, hand);

    if (!play_hand) return false;

    // get lead play struct
    const lead_struct : { len: number; count: number; list: Card[] } | null = getPlayStructUnused(lead, trump);

    // console.log(lead_struct);

    if (!lead_struct){
        const play_struct : { len: number; count: number; list: Card[] } | null = getPlayStructUnused(play, trump);
        if (!play_struct) return false; // must be a valid play format
        return true; // if no lead, any valid play is fine
    } else if (play.cards.length !== lead.cards.length) return false; // must be same amount of cards

    const len : number = lead_struct.len;
    const count : number = lead_struct.count;

    const hand_tricks : { tricks: Card[][], suit_count: number } = getTrickCountUnused(hand, lead.cards[0], trump);
    const play_tricks : { tricks: Card[][], suit_count: number } = getTrickCountUnused(play_hand, lead.cards[0], trump);

    if (play_tricks.suit_count < Math.min(hand_tricks.suit_count, play.cards.length)) return false; // must play all of same suit if have

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
                pres = pres || isCardEqual(card_a, card_b);
            }
            if (!pres) return false;
        }
    }

    return true;
}

export function isPlayBigger(iplay_a: IPlay, iplay_b: IPlay, trump: Trump): boolean { // assumes same kind of play, both plays are valid

    if (iplay_b.play.cards.length === 0) return true; // if no cards played, any play is bigger

    // console.log("Play A:", playToString(iplay_a.play));
    // console.log("Play B:", playToString(iplay_b.play));
    const formatted_play : boolean = isPlayFormatted(iplay_a, iplay_b, trump);

    if (!formatted_play) return false;

    for (let i = iplay_b.play.cards.length - 1; i >= 0; i--) if (!isCardBigger(iplay_a.play.cards[i], iplay_b.play.cards[i], trump)) return false;
    
    return true;
}

//check if play_a "kills" play_b
export function isPlayBiggerUnused(play_a: Play, play_b: Play, trump: Trump): boolean { // assumes same kind of play, both plays are valid

    if (play_b.cards.length === 0) return true; // if no cards played, any play is bigger

    sortCards(play_a.cards, trump);
    sortCards(play_b.cards, trump);

    // console.log("Play A:", playToString(play_a));
    // console.log("Play B:", playToString(play_b));
    const formatted_play : boolean = isPlayFormattedUnused(play_a, play_b, trump);

    if (!formatted_play) return false;

    for (let i = play_b.cards.length - 1; i >= 0; i--) if (!isCardBigger(play_a.cards[i], play_b.cards[i], trump)) return false;
    
    return true;
}

function isBeatable(play_hand: Hand, hand: Hand, lead: Card, trump: Trump): boolean {

    return true;

}

// TODO: optimize by caching info, also can just check if any card in hand can beat lead card instead of checking all possible plays
export function isShuaiValid(play: Play, lead: Play, idx: number, hands: Hand[], trump: Trump): boolean {

    if (!isAllMainLine && !isAllSameSuit(play.cards)) return false; // must be all main line cards or all same suit cards

    const hand : Hand = hands[idx];

    const play_hand : Hand | null = isPlaySubset(play, hand);

    if (!play_hand) return false;

    if (lead.cards.length === 0){
        for (let i = 0; i < hands.length; i++) {
            if (i === idx) continue;
            if (isBeatable(play_hand, hands[i], lead.cards[0], trump)) return false;
        }
    } 

    return false; // no gambling yet
}
