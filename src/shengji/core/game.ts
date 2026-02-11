import * as ShengJiCore from '/src/shengji/core/entities';

export type SerializedGame = {
    deck: ShengJiCore.Deck
    round: number

    players: string[]
    hands: Map<string, ShengJiCore.Hand> // index corresponds to players
    atk: number // index of attacking team (0 or 1)

    draw: boolean // currently drawing cards
    declare: number // curr declare amount
    zhuang: number // index of start player

    trump: ShengJiCore.Trump
    alt : ShengJiCore.Rank; // trump rank of attacking team
    dipai: ShengJiCore.Card[] // cards on the table

    turn: number

    score: number
    points: number

    chu: number // index of player who started the current trick
    big: number // index of player who currently has the biggest play in the current trick

    lead: ShengJiCore.Play
    count: number // number left for eahc player

    over: boolean
}

function find(arr: string[], target: string): number {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === target) return i;
    }
    return -1;
}

export class Game {
    private state: SerializedGame;

    constructor(state: SerializedGame) {
        this.state = state;
    }


    static deserialize(state: SerializedGame): Game {
        return new Game(state);
    }

    serialize(): SerializedGame {
        return this.state;
    }

    // this.state logic methods

    initializeGame(players: string[]) {
        if (players.length < 4 && players.length % 2 == 1) return null;
    
        this.state = {
            deck: ShengJiCore.initializeDeck(players.length / 2),
            round: 1,

            players: players,
            hands: new Map(players.map(p => [p, ShengJiCore.initializeHand()])),
            atk: 0,

            draw: true, 
            declare: 0, 
            zhuang: 0,

            trump: { suit: null, rank: 2 },
            alt : 2,
            dipai: [],

            turn: 0,

            score: 0,
            points: 0,

            chu: 0,
            big: 0, 

            lead: { cards: [], suit: null },
            count: 0,

            over: false,
        }
        
        return this;
    }

    finishDraw() {
        this.state.dipai = this.state.deck.cards;
        this.state.deck.cards = [];
        this.state.draw = false;
        this.state.turn = this.state.zhuang;
        this.state.chu = this.state.zhuang;
        this.state.big = this.state.zhuang;
        this.state.atk = 1 - (this.state.zhuang % 2);
        this.state.lead = { cards: [], suit: null };
        this.state.declare = 0; // reset for next round
    }

    drawCard(player: string) : boolean {

        if (this.state.over || !this.state.draw) return false; // not drawing phase

        if (this.state.players[this.state.turn] !== player) return false; // wait your turn lil bro
        
        const card = ShengJiCore.drawCard(this.state.deck);

        if (!card) return false; // deck is empty, should never happen

        ShengJiCore.addCardToHand(card, this.state.hands.get(player)!);

        if (this.state.turn === 0) this.state.count++;

        this.state.turn = (this.state.turn + 1) % this.state.players.length;

        if (this.state.turn === 0) {
            if (this.state.deck.cards.length <= 8) {
                this.finishDraw();
            }
        }

        return true;
    }

    callTrump(player: string, trump: ShengJiCore.Trump) : boolean {

        if (this.state.over || !this.state.draw || !trump.suit) return false;

        const idx : number = find(this.state.players, player);

        if (idx === -1) return false; // should never happen

        const hand : ShengJiCore.Hand = this.state.hands.get(player)!;

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
        
        if (this.state.trump.rank !== trump.rank || !this.state.trump.suit) return false; // only call same rank

        const cnt: number = ShengJiCore.getCardCount(hand, { suit: trump.suit, rank: trump.rank });

        if (cnt > this.state.declare){
            this.state.trump.suit = trump.suit; 
            this.state.declare = cnt;
            if (this.state.round === 1) this.state.zhuang = idx;
            return true;
        } 

        return false;
    }

    tryPlay(player: string, play: ShengJiCore.Play) : boolean {

        if (this.state.over || this.state.draw) return false; // this.state is already over

        if (this.state.players[this.state.turn] !== player) return false; // wait your turn lil bro

        if (this.state.lead.cards.length == 0) this.state.lead = play; // first play of the trick sets the lead

        const hand : ShengJiCore.Hand = this.state.hands.get(player)!;

        if (!ShengJiCore.isPlayValid(play, this.state.lead, hand, this.state.trump)) return false;

        if (ShengJiCore.isPlayBigger(play, this.state.lead, this.state.trump)) {
            this.state.lead = play;
            this.state.big = this.state.turn;
        }

        for (const card of play.cards) {
            ShengJiCore.removeCardFromHand(card, hand);
            this.state.points += ShengJiCore.pointValue(card);
        }

        this.state.turn = (this.state.turn + 1) % this.state.players.length;

        if (this.state.turn == this.state.chu) this.endTrick();

        return true;
    }

    private endTrick() : void {

        const team: number = this.state.big % 2;
        
        if (team === this.state.atk) this.state.score += this.state.points; // attacking team wins the trick, add points to score

        this.state.points = 0;

        this.state.count -= this.state.lead.cards.length;

        if (this.state.count === 0) this.endRound(team === this.state.atk ? this.state.lead.cards.length * 2 : 0);

        this.state.chu = this.state.big; // winner of the trick starts the next trick
        this.state.turn = this.state.chu;
        this.state.lead = { cards: [], suit: null };
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
        const dipai: number = this.state.dipai.reduce((sum, card) => sum + ShengJiCore.pointValue(card), 0);

        this.state.score += dipai * dmult;

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

        this.state.deck = ShengJiCore.initializeDeck(this.state.players.length / 2); // reset deck

        this.state.draw = true;

        this.state.zhuang %= this.state.players.length; // new zhuang
    }

    private endGame() : void {
        this.state.over = true;
    }


}
