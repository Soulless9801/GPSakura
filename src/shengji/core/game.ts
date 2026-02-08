import * as ShengJiCore from '/src/shengji/core/entities';
import Ably from 'ably';

export interface Game {
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

export function initializeGame(players: string[]) : Game | null{

    if (players.length < 4 && players.length % 2 == 1) return null;
    
    const game: Game = {
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
    
    return game;
}

function finishDraw(game: Game) : void {
    game.dipai = game.deck.cards;
    game.deck.cards = [];
    game.draw = false;
    game.turn = game.zhuang;
    game.chu = game.zhuang;
    game.big = game.zhuang;
    game.atk = 1 - (game.zhuang % 2);
    game.lead = { cards: [], suit: null };
    game.declare = 0; // reset for next round
}

export function drawCard(game: Game, player: string) : boolean {

    if (game.over || !game.draw) return false; // not drawing phase

    if (game.players[game.turn] !== player) return false; // wait your turn lil bro
    
    const card = ShengJiCore.drawCard(game.deck);

    if (!card) return false; // deck is empty, should never happen

    ShengJiCore.addCardToHand(card, game.hands.get(player)!);

    if (game.turn === 0) game.count++;

    game.turn = (game.turn + 1) % game.players.length;

    if (game.turn === 0) {
        if (game.deck.cards.length <= 8) {
            finishDraw(game);
        }
    }

    return true;
}

export function callTrump(game: Game, player: string, trump: ShengJiCore.Trump) : boolean {

    if (game.over || !game.draw || !trump.suit) return false;

    const idx : number = find(game.players, player);

    if (idx === -1) return false; // should never happen

    const hand : ShengJiCore.Hand = game.hands.get(player)!;

    if (trump.suit === "jokers"){
        const joker_s : number = ShengJiCore.getCardCount(hand, { suit: "jokers", rank: 1 });
        const joker_b : number = ShengJiCore.getCardCount(hand, { suit: "jokers", rank: 2 });

        if ((game.players.length === 4 && (joker_s + joker_b) >= 3) || 
            ((joker_s + joker_b >= 4) || Math.max(joker_s, joker_b) >= 3)) { 
            game.trump.suit = null;
            if (game.round === 1) game.zhuang = idx;
            return true;
        }

        return false;
    }
    
    if (game.trump.rank !== trump.rank || !game.trump.suit) return false; // only call same rank

    const cnt: number = ShengJiCore.getCardCount(hand, { suit: trump.suit, rank: trump.rank });

    if (cnt > game.declare){
        game.trump.suit = trump.suit; 
        game.declare = cnt;
        if (game.round === 1) game.zhuang = idx;
        return true;
    } 

    return false;
}

export function tryPlay(game: Game, player: string, play: ShengJiCore.Play) : boolean {

    if (game.over || game.draw) return false; // game is already over

    if (game.players[game.turn] !== player) return false; // wait your turn lil bro

    if (game.lead.cards.length == 0) game.lead = play; // first play of the trick sets the lead

    const hand : ShengJiCore.Hand = game.hands.get(player)!;

    if (!ShengJiCore.isPlayValid(play, game.lead, hand, game.trump)) return false;

    if (ShengJiCore.isPlayBigger(play, game.lead, game.trump)) {
        game.lead = play;
        game.big = game.turn;
    }

    for (const card of play.cards) {
        ShengJiCore.removeCardFromHand(card, hand);
        game.points += ShengJiCore.pointValue(card);
    }

    game.turn = (game.turn + 1) % game.players.length;

    if (game.turn == game.chu) endTrick(game);

    return true;
}

function endTrick(game: Game) : void {

    const team: number = game.big % 2;
    
    if (team === game.atk) game.score += game.points; // attacking team wins the trick, add points to score

    game.points = 0;

    game.count -= game.lead.cards.length;

    if (game.count === 0) endRound(game, team === game.atk ? game.lead.cards.length * 2 : 0);

    game.chu = game.big; // winner of the trick starts the next trick
    game.turn = game.chu;
    game.lead = { cards: [], suit: null };
}

function swapTeams(game: Game) : void {
    
    game.atk = 1 - game.atk;

    // swap trumps
    const temp : ShengJiCore.Rank = game.trump.rank;
    game.trump.rank = game.alt;
    game.alt = temp;
}

function endRound(game: Game, dmult: number) : void {

    // calculate dipai points
    const dipai: number = game.dipai.reduce((sum, card) => sum + ShengJiCore.pointValue(card), 0);

    game.score += dipai * dmult;

    const mult : number = game.players.length / 2;

    if (game.score >= mult * 40) { // attacker win
        swapTeams(game);
        if (game.score >= mult * 60) game.trump.rank++;
        if (game.score >= mult * 80) game.trump.rank++;
        if (game.score >= mult * 100) game.trump.rank++;
        game.zhuang++;
    } else { // defender win
        game.trump.rank++;
        if (game.score < mult * 20) game.trump.rank++;
        if (game.score === 0) game.trump.rank++;
        game.zhuang += 2;
    }

    if (game.trump.rank > 14) endGame(game);

    game.round++;

    game.score = 0;
    
    game.count = 0;

    game.deck = ShengJiCore.initializeDeck(game.players.length / 2); // reset deck

    game.draw = true;

    game.zhuang %= game.players.length; // new zhuang
}

function endGame(game: Game) : void {
    game.over = true;
}

export interface GameRoom {
    id: string;
    game: Game | null;
    players: string[];
}