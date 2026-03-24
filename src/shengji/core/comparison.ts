import * as SJCore from "/src/shengji/core/entities";


// TYPES

type Suit = SJCore.Suit;
type Rank = SJCore.Rank;
type Trump = SJCore.Trump;
type Card = SJCore.Card;
type Hand = SJCore.Hand;
type Play = SJCore.Play;


// ORDERING

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


// INFORMATION

export type IHand = {
    hand: Hand;
    struct: { cards: Card[], count: number[] };
}

export type IPlay = {
    play: Play;
    ihand: IHand;
    struct: { cards: Card[][], count: number[] };
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

export function getPlayStruct(ihand: IHand, trump: Trump): { cards: Card[][], count: number[] } { // assume play cards sorted increasing

    const ret_cards : Card[][] = [];
    const ret_count : number[] = [];

    let count : number = 0;
    const lst : Card[] = [];

    const hand_struct = ihand.struct;

    for (let i = 0; i < hand_struct.cards.length; i++) {
        const card : Card = hand_struct.cards[i];
        const cnt : number = hand_struct.count[i];
        if (cnt === 0) continue;
        // console.log("Card:", card, "Last:", lst.length > 0 ? lst[lst.length - 1] : null, "Count:", cnt, "Last count:", count);
        if ((cnt === count) && (lst.length > 0 && isCardNext(card, lst[lst.length - 1], trump))) lst.push(card);
        else {
            if (lst.length > 0) {
                ret_cards.push([...lst]);
                ret_count.push(count);
            }
            count = cnt;
            lst.length = 0; // clear array
            lst.push(card);
        }
    }

    if (lst.length > 0) {
        ret_cards.push([...lst]);
        ret_count.push(count);
    }

    return { cards: ret_cards, count: ret_count };
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
        struct: getPlayStruct(ihand, trump)
    }
}

// TODO: maybe move to sjconv?
function playToHand(play: Play): Hand {
    const hand: Hand = SJCore.initializeHand();
    for (const card of play.cards) {
        SJCore.addCardToHand(card, hand);
    }
    return hand;
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


// CHECKERS

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


// CARD FUNCTIONS
export function isCardEqual(card_a: Card, card_b: Card): boolean {
    return card_a.suit === card_b.suit && card_a.rank === card_b.rank;
}

// check if card_a = card_b + 1
function isCardNext(card_a: Card, card_b: Card, trump: Trump): boolean {

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

// check if card and lead have same suit/mainline status
function checkInline(card: Card, lead: Card, trump: Trump): boolean {
    if (!SJCore.validateCard(card)) return false;
    const card_main : boolean = isMainLine(card, trump);
    const lead_main : boolean = isMainLine(lead, trump);
    if ((!lead_main && card_main) || (lead_main && !card_main)) return false; // opposite
    if (!(lead_main && card_main) && !(card.suit === lead.suit)) return false; // not the same suit
    return true;
}

// check if card_a > card_b, assuming card_b was played first (trumps in the case of equality)
function isCardBigger(card_a: Card, card_b: Card, trump: Trump): boolean {

    if (!checkInline(card_a, card_b, trump)) return isMainLine(card_a, trump); // check same suit / mainline status

    const val_a : number[] = getCardData(card_a, trump);
    const val_b : number[] = getCardData(card_b, trump);

    for (let i = 0; i < 4; i++) {
        if (val_a[i] > val_b[i]) return true;
        if (val_a[i] < val_b[i]) return false;
    }

    return false;
}

// VALIDATION

// get card count for cards that can be played in tricks responding the lead card
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

// return counts of lengths of consecutive cards
function findMaxConsecutiveUnused(cards: Card[], trump: Trump): number[] {

    if (!cards) return [];
    
    sortCards(cards, trump);
    // console.log("Finding max consecutive in:", cards);

    let len : number = 1;

    const seq : number[] = [];
    for (let i = 0; i < cards.length - 1; i++) {
        if (isCardNext(cards[i + 1], cards[i], trump)) len++;
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


function findMaxConsecutive(cards: Card[], trump: Trump): number[] {
    
    sortCards(cards, trump);
    // console.log("Finding max consecutive in:", cards);

    let len : number = 1;

    const seq : number[] = [];
    for (let i = 0; i < cards.length - 1; i++) {
        if (isCardNext(cards[i + 1], cards[i], trump)) len++;
        else {
            while (seq.length <= len) seq.push(0);
            seq[len]++;
            len = 1;
        }
    }

    while (seq.length <= len) seq.push(0);
    seq[len]++;

    return seq;
}

// is play a subset of given hand
export function isSubset(iplay: IPlay, ihand: IHand): boolean {

    const play : Play = iplay.play;
    const play_hand : Hand = iplay.ihand.hand;

    const hand : Hand = ihand.hand;

    for (const card of play.cards) {
        if (SJCore.getCardCount(play_hand, card) > SJCore.getCardCount(hand, card)) return false;
    }

    return true;
}

// check if is valid PLAY struct
function isPlayStructValid(struct: { cards: Card[][], count: number[] }): boolean {

    if (struct.cards.length !== 1) return false;

    const cards : Card[] = struct.cards[0];
    const count : number = struct.count[0];

    if (cards.length === 0 || count === 0) return false;
    if (count === 1 && cards.length > 1) return false; // if single, must be only 1 card

    return true;
}

// check if "covering" of lead with hand is satisfied by play
function isTrickValid(lead: number[], play: Card[], hand: Card[], trump: Trump): boolean {
    
    const play_max : number[] = findMaxConsecutive(play, trump);
    const hand_max : number[] = findMaxConsecutive(hand, trump);


    let play_idx : number = play_max.length - 1;
    let hand_idx : number = hand_max.length - 1;

    // TODO: determine ordering or reverse
    for (let i = 0; i < lead.length; i++){
        console.log("Play Max:", play_max);
        console.log("Hand Max:", hand_max);
        while (lead[i] > 0){
            if (lead[i] === 0) break;
            while (hand_idx > 0 && hand_max[hand_idx] === 0) hand_idx--;
            if (hand_idx <= 0) {
                const play_map : Map<Card, boolean> = new Map<Card, boolean>();
                for (const card of play) play_map.set(card, true);
                for (const card of hand) if (!play_map.get(card)) return false; // if you have a card in the play, must be able to play it
                return true;
            }
            while (play_idx > 0 && play_max[play_idx] === 0) play_idx--;
            if (play_idx <= 0) return false; // still more tricks to play
            const num : number = Math.min(lead[i], hand_idx);
            if (play_idx < num) return false;
            lead[i] -= num;
            play_max[play_idx]--; play_max[play_idx - num]++;
            hand_max[hand_idx]--; hand_max[hand_idx - num]++;
        }
    }

    return true;
}

// check if play is possible given hand
function isPlayPossible(lead: number[][], iplay: IPlay, ilead: IPlay, ihand: IHand, trump: Trump): boolean {

    console.log("Lead Decomposition:", lead);

    const pos : number[] = [];

    const hand_tricks = getTrickCount(ihand, ilead.play.cards[0], trump);
    const play_tricks = getTrickCount(iplay.ihand, ilead.play.cards[0], trump);

    console.log("Hand Tricks:", hand_tricks);
    console.log("Play Tricks:", play_tricks);

    if (play_tricks.suit_count < Math.min(hand_tricks.suit_count, iplay.play.cards.length)) return false;

    for (let i = lead.length - 1; i >= 0; i--) {
        for (const card of lead[i]) pos.push(card);
        pos.sort((a, b) => { // sort greatest to least
            return b - a;
        });
        // pop of zeroes (optional)
        while (pos.length > 0 && pos[pos.length - 1] === 0) pos.pop();
        if (pos.length === 0) continue;
        console.log("Possible Lead:", pos);
        if (!isTrickValid(pos, play_tricks.tricks[i] || [], hand_tricks.tricks[i] || [], trump)) return false;
    }

    return true;
}

// check if play is valid given current hand and lead play (assume lead is a valid play)
export function isPlayValid(iplay: IPlay, ilead: IPlay, ihand: IHand, trump: Trump): boolean {

    if (!isSubset(iplay, ihand)) return false;

    // get lead play struct
    const lead_struct = ilead.struct;
    const play_struct = iplay.struct;

    if (!isPlayStructValid(lead_struct)) return isPlayStructValid(play_struct); // must be valid play struct
    if (iplay.play.cards.length !== ilead.play.cards.length) return false; // must be same amount of cards

    const n : number = lead_struct.cards[0].length;
    const m : number = lead_struct.count[0];

    const lead : number[][] = [];
    while (lead.length <= m) lead.push([]);
    lead[m].push(n);

    return isPlayPossible(lead, iplay, ilead, ihand, trump);
}

export function isPlayValidUnused(iplay: IPlay, ilead: IPlay, ihand: IHand, trump: Trump): boolean {

    // check if play is subset of hand
    if (!isSubset(iplay, ihand)) return false;

    // get lead play struct
    const lead_struct = ilead.struct;
    const play_struct = iplay.struct;

    if (!isPlayStructValid(lead_struct)) return isPlayStructValid(play_struct); // must be valid play struct
    if (iplay.play.cards.length !== ilead.play.cards.length) return false; // must be same amount of cards

    const n : number = lead_struct.cards[0].length;
    const m : number = lead_struct.count[0];

    const hand_tricks : { tricks: Card[][], suit_count: number } = getTrickCount(ihand, ilead.play.cards[0], trump);
    const play_tricks : { tricks: Card[][], suit_count: number } = getTrickCount(iplay.ihand, ilead.play.cards[0], trump);

    if (play_tricks.suit_count < Math.min(hand_tricks.suit_count, iplay.play.cards.length)) return false; // must play all of same suit if have

    let rem_tricks : number = n;

    for (let tix = m; tix >= 2; tix--) {

        const hand_trick : Card[] = hand_tricks.tricks[tix] || [];
        const play_trick : Card[] = play_tricks.tricks[tix] || [];

        const pos_max : number[] = findMaxConsecutiveUnused(hand_trick, trump);
        const play_max : number[] = findMaxConsecutiveUnused(play_trick, trump);

        for (let i = 0; i < pos_max.length; i++){

            if (rem_tricks === 0 ) break; // no more tricks to match

            if (play_max.length <= i) return false; // must have enough tricks to match

            const pos : number = Math.min(rem_tricks, pos_max[i]);
            if (play_max[i] < pos) return false; // if you have something better you must play it

            rem_tricks -= pos;
        }
        
        if (rem_tricks === 0) break;

        // TODO: optimize
        for (const card_a of hand_trick) {
            let pres : boolean = false;
            for (const card_b of play_trick) pres = pres || isCardEqual(card_a, card_b);
            if (!pres) return false; // if remaining tricks, must play all of current trick type
        }
    }

    return true;
}


// COMPARISON

// check if play_a and play_b have the same format
function isFormatted(iplay_a: IPlay, iplay_b: IPlay, trump: Trump): boolean {
    
    const struct_a = iplay_a.struct;
    const struct_b = iplay_b.struct;

    const struct_a_simp : number[][] = [];
    const struct_b_simp : number[][] = [];

    for (let i = 0; i < struct_a.count.length; i++) struct_a_simp.push([struct_a.cards[i].length, struct_a.count[i]]);
    for (let i = 0; i < struct_b.count.length; i++) struct_b_simp.push([struct_b.cards[i].length, struct_b.count[i]]);

    struct_a_simp.sort((a, b) => {
        if (a[0] === b[0]) return a[1] - b[1];
        return a[0] - b[0];
    });
    struct_b_simp.sort((a, b) => {
        if (a[0] === b[0]) return a[1] - b[1];
        return a[0] - b[0];
    });

    for (let i = 0; i < struct_b_simp.length; i++) {
        if (struct_b_simp[i][0] !== struct_a_simp[i][0]) return false;
        if (struct_b_simp[i][1] !== struct_a_simp[i][1]) return false;
    }

    return true;
}

//check if play_a "kills" play_b
export function isPlayBigger(iplay_a: IPlay, iplay_b: IPlay, trump: Trump): boolean { // assumes same kind of play, both plays are valid

    if (iplay_b.play.cards.length === 0) return true; // if no cards played, any play is bigger

    // console.log("Play A:", playToString(iplay_a.play));
    // console.log("Play B:", playToString(iplay_b.play));
    if (!isFormatted(iplay_a, iplay_b, trump)) return false;

    for (let i = iplay_b.play.cards.length - 1; i >= 0; i--) if (!isCardBigger(iplay_a.play.cards[i], iplay_b.play.cards[i], trump)) return false;
    
    return true;
}


// GAMBLING

// check if shuai can be beaten by some part of hand
function isBeatable(iplay: IPlay, ihand: IHand, trump: Trump): boolean {

    for (let i = 0; i < iplay.struct.cards.length; i++){
        const cards : Card[] = iplay.struct.cards[i];
        const count : number = iplay.struct.count[i];

        const n : number = cards.length;
        const m : number = count;

        const lead : Card = cards[n - 1];

        let cnt : number = 0;
        let lst : Card | null = null;

        for (let i = ihand.struct.cards.length - 1; i >= 0; i--) {
            const card : Card = ihand.struct.cards[i];
            const count : number = ihand.struct.count[i];
            if (!checkInline(card, lead, trump)){
                cnt = 0;
                lst = null;
            }
            else if (count != m || (lst && !isCardNext(lst, card, trump))) {
                if (!isCardBigger(card, lead, trump)) break;
                cnt = 1;
                lst = card;
            } else {
                cnt++;
                lst = card;
                if (cnt >= n) return true;
            }
        }
    }

    return false;
}

function isBeatableUnused(iplay: IPlay, ihand: IHand, trump: Trump): boolean {

    const lead : Card = iplay.play.cards[iplay.play.cards.length - 1];

    const n : number = iplay.struct.cards[0].length;
    const m : number = iplay.struct.count[0];

    let cnt : number = 0;
    let lst : Card | null = null;

    for (let i = ihand.struct.cards.length - 1; i >= 0; i--) {
        const card : Card = ihand.struct.cards[i];
        const count : number = ihand.struct.count[i];
        if (!checkInline(card, lead, trump)){
            cnt = 0;
            lst = null;
        }
        else if (count != m || (lst && !isCardNext(lst, card, trump))) {
            if (!isCardBigger(card, lead, trump)) return false;
            cnt = 1;
            lst = card;
        } else {
            cnt++;
            lst = card;
            if (cnt >= n) return true;
        }
    }

    return false;
}

// check if shuai is valid given lead or absence
export function isShuaiValid(iplay: IPlay, ilead: IPlay, ihand: IHand, hands: Hand[], trump: Trump): boolean {

    if (!isAllMainLine(iplay.play.cards, trump) && !isAllSameSuit(iplay.play.cards)) return false; // must be all main line cards or all same suit cards

    if (!isSubset(iplay, ihand)) return false; // must be subset of hand

    if (ilead.play.cards.length === 0){ // initial shuai

        for (let i = 0; i < hands.length; i++) {
            const iihand = handToInfo(hands[i], trump);
            if (isBeatable(iplay, iihand, trump)) return false;
        }

        return true;

    } else {
        // TODO: check if non-lead shuai is valid

        const lead_struct = ilead.struct;

        const lead : number[][] = [];

        for (let i = 0; i < lead_struct.cards.length; i++){
            const cards : Card[] = lead_struct.cards[i];
            const count : number = lead_struct.count[i];
            while (lead.length <= count) lead.push([]);
            lead[count].push(cards.length);
        }

        return isPlayPossible(lead, iplay, ilead, ihand, trump)
    }
}
