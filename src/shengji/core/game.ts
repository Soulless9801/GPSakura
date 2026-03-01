import * as ShengJiCore from '/src/shengji/core/entities';

export type GameState = {
    // deck: ShengJiCore.Deck
    round: number // current round number, starting from 1

    players: string[]
    users: string[]
    // hands: Map<string, ShengJiCore.Hand> // index corresponds to players
    atk: number // index of attacking team (0 or 1)

    draw: boolean // currently drawing cards
    declare: number // curr declare amount
    zhuang: number // index of start player

    trump: ShengJiCore.Trump
    alt : ShengJiCore.Rank; // trump rank of attacking team
    // dipai: ShengJiCore.Card[] // cards on the table

    turn: number

    score: number
    points: number

    chu: number // index of player who started the current trick

    lead: number // index of player with biggest play
    plays: ShengJiCore.Play[]
    count: number // number left for eahc player

    over: boolean
    dip: boolean // diapi exchanged or not
}

function nullPlay(): ShengJiCore.Play {
    return { cards: [], suit: null};
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
    private hands: Map<string, ShengJiCore.Hand>;
    private deck: ShengJiCore.Deck;
    private dipai: ShengJiCore.Card[];

    private static cpp = 25; // cards per player
    private static minPlayers = 2; 
    private static maxPlayers = 8;

    constructor(state: GameState, hands: Map<string, ShengJiCore.Hand>, deck: ShengJiCore.Deck, dipai: ShengJiCore.Card[]) {
        this.state = state;
        this.hands = hands;
        this.deck = deck;
        this.dipai = dipai;
    }

    static find(arr: string[] | null, target: string | null): number {
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
            Game.deserialize(hands) as Map<string, ShengJiCore.Hand>,
            Game.deserialize(deck) as ShengJiCore.Deck,
            Game.deserialize(dipai) as ShengJiCore.Card[]
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
        if (players.length < Game.minPlayers || players.length % 2 == 1 || players.length > Game.maxPlayers) return null;
    
        this.state = {
            // deck: ShengJiCore.initializeDeck(players.length / 2),
            round: 1,

            players: players,
            users: users,
            // hands: new Map(players.map(p => [p, ShengJiCore.initializeHand()])),
            atk: 0,

            draw: true, 
            declare: 0, 
            zhuang: 0,

            trump: { suit: null, rank: 2 },
            alt : 2,
            // dipai: [],

            turn: 0,

            score: 0,
            points: 0,

            chu: 0,

            lead: 0,
            plays: Array.from({ length: players.length }, () => (nullPlay())),
            count: 0,

            over: false,
            dip: false,
        }

        this.hands = new Map(players.map(p => [p, ShengJiCore.initializeHand()]));
        this.deck = ShengJiCore.initializeDeck(players.length / 2);
        this.dipai = [];
        
        return this;
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

        if (this.state.players[this.state.turn] !== player) return false; // wait your turn lil bro
        
        const card = ShengJiCore.drawCard(this.deck);

        if (!card) return false; // deck is empty, should never happen

        const hand = this.hands.get(player);

        if (!hand) return false; // should never happen

        ShengJiCore.addCardToHand(card, hand);

        if (this.state.turn === 0) this.state.count++;

        this.state.turn = (this.state.turn + 1) % this.state.players.length;

        if (this.state.turn === (this.state.round === 1 ? 0: this.state.zhuang)) {
            if (this.state.count === Game.cpp) {
                this.finishDraw();
            }
        }

        return true;
    }

    callTrump(player: string, trump: ShengJiCore.Trump) : boolean {

        if (this.state.over || !this.state.draw || !trump.suit) return false;

        // console.log(`Player ${player} calls trump ${ShengJiCore.trumpToString(trump)}`);

        const idx : number = Game.find(this.state.players, player);

        if (idx === -1) return false; // should never happen

        // console.log(`Player index: ${idx}`);

        const hand = this.hands.get(player);

        if (!hand) return false; // should never happen

        if (trump.suit === "jokers"){
            const joker_s : number = ShengJiCore.getCardCount(hand, { suit: "jokers", rank: 1 });
            const joker_b : number = ShengJiCore.getCardCount(hand, { suit: "jokers", rank: 2 });

            if ((this.state.players.length === 4 && (joker_s + joker_b) >= 3) || 
                ((joker_s + joker_b >= 4) || Math.max(joker_s, joker_b) >= 3)) { 
                this.state.trump.suit = null;
                if (this.state.round === 1) this.state.zhuang = idx;
                return true;
            }

            return false;
        }
        
        if (this.state.trump.rank !== trump.rank) return false; // only call same rank

        const cnt: number = ShengJiCore.getCardCount(hand, { suit: trump.suit, rank: trump.rank });

        if (cnt > this.state.declare){
            this.state.trump.suit = trump.suit; 
            this.state.declare = cnt;
            if (this.state.round === 1) this.state.zhuang = idx;
            return true;
        } 

        return false;
    }

    exchangeDipai(player: string, give: ShengJiCore.Card[], receive: ShengJiCore.Card[]) : boolean {
        
        if (this.state.over || !this.state.dip) return false;

        if (this.state.players[this.state.zhuang] !== player) return false;

        if (give.length !== receive.length) return false; // must exchange same number of cards

        const hand = this.hands.get(player);

        if (!hand) return false; // should never happen

        const play_hand : ShengJiCore.Hand | null = ShengJiCore.isPlaySubset({ cards: give } as ShengJiCore.Play, hand);

        if (!play_hand) return false;

        const dipai_hand : ShengJiCore.Hand = ShengJiCore.initializeHand();

        for (const card of this.dipai) ShengJiCore.addCardToHand(card, dipai_hand);

        const dip_hand : ShengJiCore.Hand | null = ShengJiCore.isPlaySubset({ cards: receive } as ShengJiCore.Play, dipai_hand);

        if (!dip_hand) return false;

        for (const card of give){
            ShengJiCore.removeCardFromHand(card, hand);
            ShengJiCore.addCardToHand(card, dipai_hand);
        }

        for (const card of receive){
            ShengJiCore.addCardToHand(card, hand);
            ShengJiCore.removeCardFromHand(card, dipai_hand);
        }

        this.dipai = ShengJiCore.handToCards(dipai_hand); // convert back to array

        this.state.dip = false; // time to play!

        return true;
    }

    tryPlay(player: string, play: ShengJiCore.Play) : boolean {

        if (this.state.over || this.state.draw || this.state.dip) return false; // this.state is already over

        if (this.state.players[this.state.turn] !== player) return false; // wait your turn lil bro

        const hand = this.hands.get(player);

        if (!hand) return false; // should never happen

        // console.log(hand);

        const lead : ShengJiCore.Play = this.state.plays[this.state.lead];

        if (!ShengJiCore.isPlayValid(play, lead, hand, this.state.trump)) return false;

        // console.log(`Player ${player} plays ${ShengJiCore.playToString(play)}`);

        const idx : number = Game.find(this.state.players, player);

        if (idx === -1) return false; // should never happen

        // console.log(`Player index: ${idx}`);

        if (this.state.plays[idx].cards.length > 0) this.state.plays = Array.from({ length: this.state.players.length }, () => (nullPlay())); // reset plays if player is replaying

        this.state.plays[idx] = play;

        if (ShengJiCore.isPlayBigger(play, lead, this.state.trump)) this.state.lead = idx;

        for (const card of play.cards) {
            ShengJiCore.removeCardFromHand(card, hand);
            this.state.points += ShengJiCore.pointValue(card);
        }

        this.state.turn = (this.state.turn + 1) % this.state.players.length;

        if (this.state.turn == this.state.chu) this.endTrick();

        return true;
    }

    private endTrick() : void {

        // console.log(`Trick ends. Lead: Player ${this.state.players[this.state.lead]}, Play: ${ShengJiCore.playToString(this.state.plays[this.state.lead])}, Points: ${this.state.points}`);

        const team: number = this.state.lead % 2;
        
        if (team === this.state.atk) this.state.score += this.state.points; // attacking team wins the trick, add points to score

        this.state.points = 0;

        const lead : ShengJiCore.Play = this.state.plays[this.state.lead];

        this.state.count -= lead.cards.length;

        if (this.state.count === 0) this.endRound(team === this.state.atk ? lead.cards.length * 2 : 0);

        this.state.chu = this.state.lead; // winner of the trick starts the next trick
        this.state.turn = this.state.chu;
    }

    private swapTeams() : void {
        
        this.state.atk = 1 - this.state.atk;

        // swap trumps
        const temp : ShengJiCore.Rank = this.state.trump.rank;
        this.state.trump.rank = this.state.alt;
        this.state.alt = temp;
    }

    private endRound(dmult: number) : void {

        // calculate dipai points
        const dipai: number = this.dipai.reduce((sum, card) => sum + ShengJiCore.pointValue(card), 0);

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

        this.deck = ShengJiCore.initializeDeck(this.state.players.length / 2); // reset deck

        for (const player of this.state.players) this.hands.set(player, ShengJiCore.initializeHand()); // reset hands

        this.dipai = [];

        this.state.draw = true;

        this.state.zhuang %= this.state.players.length; // new zhuang

        this.state.turn = this.state.zhuang;
    }

    endGame() : void {
        this.state.over = true;
    }

    getState() : GameState {
        return this.state;
    }

    getHand(player: string) : ShengJiCore.Hand | null {
        const hand = this.hands.get(player);
        return hand ? hand : null;
    }

    getDeck() : ShengJiCore.Deck {
        return this.deck;
    }
    
    getDipai(player: string) : ShengJiCore.Card[] | null {

        if (this.state.players[this.state.zhuang] !== player) return null; // not allowed to view cards
        return this.dipai;
    }
}
