import * as SJCore from '/src/shengji/core/entities';
import * as SJComp from '/src/shengji/core/comparison';
import * as SJConv from '/src/shengji/core/convert';

type Suit = SJCore.Suit;
type Rank = SJCore.Rank;
type Trump = SJCore.Trump;
type Card = SJCore.Card;
type Deck = SJCore.Deck;
type Hand = SJCore.Hand;
type Play = SJCore.Play;

type IPlay = SJComp.IPlay;
type IHand = SJComp.IHand;

type PlayerInfo = {
    index: number;
    username: string;
    play: Play | null;
}

export type GameState = {
    // deck: Deck
    round: number // current round number, starting from 1

    players: string[]
    info: Map<string, PlayerInfo> // player name to info mapping
    // hands: Map<string, Hand> // index corresponds to players
    atk: number // index of attacking team (0 or 1)

    draw: boolean // currently drawing cards
    declare: number // curr declare amount
    whodec: number // index of player who declared trump
    zhuang: number // index of start player

    trump: Trump
    alt : Rank // trump rank of attacking team
    // dipai: Card[] // cards on the table

    turn: number

    score: number
    points: number

    chu: number // index of player who started the current trick

    lead: number // index of player with biggest play
    count: number // number left for eahc player

    over: boolean
    dip: boolean // diapi exchanging or not
}

type GameStateUnused = {
    // deck: Deck
    round: number // current round number, starting from 1

    players: string[]
    users: string[]
    // hands: Map<string, Hand> // index corresponds to players
    atk: number // index of attacking team (0 or 1)

    draw: boolean // currently drawing cards
    declare: number // curr declare amount
    whodec: number // index of player who declared trump
    zhuang: number // index of start player

    trump: Trump
    alt : Rank; // trump rank of attacking team
    // dipai: Card[] // cards on the table

    turn: number

    score: number
    points: number

    chu: number // index of player who started the current trick

    lead: number // index of player with biggest play
    plays: Play[]
    count: number // number left for eahc player

    over: boolean
    dip: boolean // diapi exchanging or not
}

function nullPlay(): Play {
    return { cards: [], suit: null };
}

function replacer(key: string, value: any) {
    if (value instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(value.entries()), // or with spread: value: [...value]
        };
    } else {
        return value;
    }
}
        
function reviver(key: string, value: any) {
    if (value && value.dataType === 'Map') {
        return new Map(value.value);
    } else {
        return value;
    }
}

export class Game {

    private state: GameState;
    private hands: Map<string, Hand>;
    private deck: Deck;
    private dipai: Card[];

    private static cpp = 25; // cards per player
    private static minPlayers = 2; 
    private static maxPlayers = 8;

    constructor(state: GameState, hands: Map<string, Hand>, deck: Deck, dipai: Card[]) {
        this.state = state;
        this.hands = hands;
        this.deck = deck;
        this.dipai = dipai;
    }

    private static find(arr: string[] | null, target: string | null): number {
        if (!arr || !target) return -1;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] === target) return i;
        }
        return -1;
    }

    static serialize(obj: object): string {
        return JSON.stringify(obj, replacer);
    }

    static deserialize(string: string): unknown {
        return JSON.parse(string, reviver);
    }

    static deserializeGame(game: string): Game {
        const { state, hands, deck, dipai } = JSON.parse(game);
        return new Game(
            Game.deserialize(state) as GameState,
            Game.deserialize(hands) as Map<string, Hand>,
            Game.deserialize(deck) as Deck,
            Game.deserialize(dipai) as Card[]
        );
    }

    serializeGame(): string {
        return JSON.stringify({
            state: Game.serialize(this.state),
            hands: Game.serialize(this.hands),
            deck: Game.serialize(this.deck),
            dipai: Game.serialize(this.dipai)
        });
    }

    // this.state logic methods

    initializeGame(players: string[], users: string[]) {
        if (players.length < Game.minPlayers || players.length % 2 === 1 || players.length > Game.maxPlayers) return null;
    
        this.state = {
            // deck: SJCore.initializeDeck(players.length / 2),
            round: 1,

            players: players,
            info: new Map(players.map((p, i) => [p, { index: i, username: users[i], play: null }])),
            // hands: new Map(players.map(p => [p, SJCore.initializeHand()])),
            atk: 0,

            draw: true, 
            declare: 0, 
            whodec: 0,
            zhuang: 0,

            trump: { suit: null, rank: 2 },
            alt : 2,
            // dipai: [],

            turn: 0,

            score: 0,
            points: 0,

            chu: 0,

            lead: 0,
            count: 0,

            over: false,
            dip: false,
        }

        this.hands = new Map(players.map(p => [p, SJCore.initializeHand()]));
        this.deck = SJCore.initializeDeck(players.length / 2);
        this.dipai = [];
        
        return this;
    }

    changeUsername(player: string, user: string) {
        const playerInfo = this.state.info.get(player);
        if (!playerInfo) return false;
        playerInfo.username = user;
        return true;
    }

    finishDraw() {
        this.state.dip = true; // dipai exchange time
        this.dipai = this.deck.cards;
        this.deck.cards = [];
        this.state.draw = false;
        this.state.turn = this.state.zhuang;
        this.state.chu = this.state.zhuang;
        this.state.atk = 1 - (this.state.zhuang % 2);
        this.state.lead = this.state.zhuang;
        this.state.declare = 0; // reset for next round
    }

    speedDraw() {
        if (this.state.over || !this.state.draw) return false;

        while (this.state.draw) {
            const player = this.state.players[this.state.turn];
            this.drawCard(player);
        }

        return true;
    }

    drawCard(player: string) : boolean {

        if (this.state.over || !this.state.draw) return false; // not drawing phase
        const playerInfo = this.state.info.get(player);
        if (!playerInfo || playerInfo.index !== this.state.turn) return false; // wait your turn lil bro

        const card = SJCore.drawCard(this.deck);
        if (!card) return false; // deck is empty, should never happen

        const hand = this.hands.get(player);
        if (!hand) return false; // should never happen

        SJCore.addCardToHand(card, hand);

        if (this.state.turn === 0) this.state.count++;

        this.state.turn = (this.state.turn + 1) % this.state.players.length;

        if (this.state.turn === (this.state.round === 1 ? 0: this.state.zhuang)) {
            if (this.state.count === Game.cpp) {
                this.finishDraw();
            }
        }

        return true;
    }

    private setTrump(idx: number, num: number, suit: Suit) : boolean {
        this.state.trump.suit = suit;
        this.state.whodec = idx;
        this.state.declare = num;
        if (this.state.round === 1) this.state.zhuang = idx; // 当庄
        return true;
    }

    callTrump(player: string, trump: Trump) : boolean {

        if (this.state.over || (!this.state.draw && !this.state.dip) || !trump.suit) return false;

        const playerInfo = this.state.info.get(player);
        if (!playerInfo) return false;

        // console.log(`Player ${player} calls trump ${SJCore.trumpToString(trump)}`);

        // console.log(`Player index: ${idx}`);

        const hand = this.hands.get(player);
        if (!hand) return false; // should never happen

        if (trump.suit === "jokers"){ // joker declaration
            const joker_s : number = SJCore.getCardCount(hand, { suit: "jokers", rank: 1 });
            const joker_b : number = SJCore.getCardCount(hand, { suit: "jokers", rank: 2 });

            if ((Math.max(joker_s, joker_b) === this.state.players.length / 2) || 
                (joker_s >= this.state.players.length / 4 && joker_b >= this.state.players.length / 4)) {
                return this.setTrump(playerInfo.index, this.state.players.length / 2, "jokers");
            }

            return false;
        }
        
        if (this.state.trump.rank !== trump.rank) return false; // only call same rank

        const cnt: number = SJCore.getCardCount(hand, { suit: trump.suit, rank: trump.rank });
        if (cnt > this.state.declare) return this.setTrump(playerInfo.index, cnt, trump.suit); // regular declaration

        return false;
    }

    exchangeDipai(player: string, give: Card[], receive: Card[]) : boolean {
        
        if (this.state.over || !this.state.dip) return false;
        const playerInfo = this.state.info.get(player);
        if (!playerInfo || playerInfo.index !== this.state.turn) return false;

        if (give.length !== receive.length) return false; // must exchange same number of cards

        // console.log(give, receive); 

        const hand = this.hands.get(player);
        if (!hand) return false; // should never happen

        const igive = SJComp.playToInfo({ cards: give, suit: null }, this.state.trump);
        const ihand = SJComp.handToInfo(hand, this.state.trump);

        const ireceive = SJComp.playToInfo({ cards: receive, suit: null }, this.state.trump);
        const idipai = SJComp.playToInfo({ cards: this.dipai, suit: null }, this.state.trump);

        if (!SJComp.isSubset(igive, ihand)) return false; // must give cards in hand
        if (!SJComp.isSubset(ireceive, idipai.ihand)) return false; // must receive cards in dipai

        for (const card of give){
            SJCore.removeCardFromHand(card, hand);
            SJCore.addCardToHand(card, idipai.ihand.hand);
        }

        for (const card of receive){
            SJCore.addCardToHand(card, hand);
            SJCore.removeCardFromHand(card, idipai.ihand.hand);
        }

        this.dipai = SJConv.handToCards(idipai.ihand.hand, null); // convert back to array

        this.state.dip = false; // time to play!

        return true;
    }

    tryPlay(player: string, play: Play) : boolean {

        if (this.state.over || this.state.draw || this.state.dip) return false; // this.state is already over
        const playerInfo = this.state.info.get(player);
        if (!playerInfo || playerInfo.index !== this.state.turn) return false;

        const hand = this.hands.get(player);
        if (!hand) return false; // should never happen

        // console.log(hand);

        if (playerInfo.play && playerInfo.play.cards.length > 0) {
            for (const player of this.state.players){
                const pInfo = this.state.info.get(player);
                if (pInfo) pInfo.play = null;
            }
        }

        const lead : Play = this.state.info.get(this.state.players[this.state.lead])?.play || nullPlay();

        // console.log("Validating Play");

        const iplay : IPlay = SJComp.playToInfo(play, this.state.trump);
        const ilead : IPlay = SJComp.playToInfo(lead, this.state.trump);
        const ihand : IHand = SJComp.handToInfo(hand, this.state.trump);

        if (!SJComp.isPlayValid(iplay, ilead, ihand, this.state.trump)) return false;

        // console.log(`Player ${player} plays ${SJCore.playToString(play)}`);

        playerInfo.play = play;

        if (SJComp.isPlayBigger(iplay, ilead, this.state.trump)) this.state.lead = playerInfo.index;

        for (const card of play.cards) {
            SJCore.removeCardFromHand(card, hand);
            this.state.points += SJCore.pointValue(card);
        }

        this.state.turn = (this.state.turn + 1) % this.state.players.length;

        if (this.state.turn === this.state.chu) this.endTrick();

        return true;
    }

    tryShuai(player: string, play: Play) : boolean {
        
        if (this.state.over || this.state.draw || this.state.dip) return false; // this.state is already over
        const playerInfo = this.state.info.get(player);
        if (!playerInfo || playerInfo.index !== this.state.turn) return false;

        // console.log(hand);

        const hand = this.hands.get(player);
        if (!hand) return false; // should never happen

        if (playerInfo.play && playerInfo.play.cards.length > 0) {
            for (const player of this.state.players){
                const pInfo = this.state.info.get(player);
                if (pInfo) pInfo.play = null;
            }
        }

        const lead : Play = this.state.info.get(this.state.players[this.state.lead])?.play || nullPlay();

        const hands : Hand[] = [];
        
        for (const [key, value] of this.hands){
            if (key === player) continue;
            hands.push(value);
        }

        // console.log("Validating Play");

        const iplay : IPlay = SJComp.playToInfo(play, this.state.trump);
        const ilead : IPlay = SJComp.playToInfo(lead, this.state.trump);
        const ihand : IHand = SJComp.handToInfo(hand, this.state.trump);

        if (!SJComp.isShuaiValid(iplay, ilead, ihand, hands, this.state.trump)) return false;

        playerInfo.play = play;

        if (SJComp.isPlayBigger(iplay, ilead, this.state.trump)) this.state.lead = playerInfo.index;

        for (const card of play.cards) {
            SJCore.removeCardFromHand(card, hand);
            this.state.points += SJCore.pointValue(card);
        }

        this.state.turn = (this.state.turn + 1) % this.state.players.length;

        if (this.state.turn === this.state.chu) this.endTrick();

        return true;
    }

    private endTrick() : void {

        // console.log(`Trick ends. Lead: Player ${this.state.players[this.state.lead]}, Play: ${SJCore.playToString(this.state.plays[this.state.lead])}, Points: ${this.state.points}`);

        const team: number = this.state.lead % 2;
        
        if (team === this.state.atk) this.state.score += this.state.points; // attacking team wins the trick, add points to score

        this.state.points = 0;

        const lead : Play = this.state.info.get(this.state.players[this.state.lead])?.play || nullPlay();

        this.state.count -= lead.cards.length;

        if (this.state.count === 0) this.endRound(team === this.state.atk ? lead.cards.length * 2 : 0);

        this.state.chu = this.state.lead; // winner of the trick starts the next trick
        this.state.turn = this.state.chu;
    }

    private swapTeams() : void {
        
        this.state.atk = 1 - this.state.atk;

        // swap trumps
        const temp : Rank = this.state.trump.rank;
        this.state.trump.rank = this.state.alt;
        this.state.alt = temp;
    }

    private endRound(dmult: number) : void {

        // calculate dipai points
        const dipai: number = this.dipai.reduce((sum, card) => sum + SJCore.pointValue(card), 0);

        this.state.score += dipai * dmult;

        // console.log(`Round ends. Score: ${this.state.score}`);

        const mult : number = this.state.players.length / 2;

        if (this.state.score >= mult * 40) { // attacker win
            this.swapTeams();
            if (this.state.score >= mult * 60) this.state.trump.rank++;
            if (this.state.score >= mult * 80) this.state.trump.rank++;
            if (this.state.score >= mult * 100) this.state.trump.rank++;
            this.state.zhuang++;
        } else { // defender win
            this.state.trump.rank++;
            if (this.state.score < mult * 20) this.state.trump.rank++;
            if (this.state.score === 0) this.state.trump.rank++;
            this.state.zhuang += 2;
        }

        if (this.state.trump.rank > 14) this.endGame();

        this.state.round++;

        this.state.score = 0;
        
        this.state.count = 0;

        this.deck = SJCore.initializeDeck(this.state.players.length / 2); // reset deck

        for (const player of this.state.players) this.hands.set(player, SJCore.initializeHand()); // reset hands

        this.dipai = [];

        this.state.draw = true;

        this.state.zhuang %= this.state.players.length; // new zhuang

        this.state.turn = this.state.zhuang;

        this.state.whodec = this.state.zhuang;
    }

    endGame() : void {
        this.state.over = true;
    }

    getState() : GameState {
        return this.state;
    }

    getHand(player: string) : Hand | null {
        const hand = this.hands.get(player);
        return hand ? hand : null;
    }

    getDeck() : Deck {
        return this.deck;
    }
    
    getDipai(player: string) : Card[] | null {

        if (this.state.players[this.state.zhuang] !== player) return null; // not allowed to view cards
        return this.dipai;
    }
}
