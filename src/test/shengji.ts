/**
 * Helpers shared by the Shengji tests: deterministic game setup, hand-crafted positions,
 * and a full-round simulator that plays random but legal moves.
 */
import { vi } from "vitest";

import RNG from "/src/entities/rng";
import { Deck, Hand } from "/src/shengji/core/entities";
import type { Card, Rank, Suit } from "/src/shengji/core/entities";
import { Game, baseGame } from "/src/shengji/core/game";
import type { GameState } from "/src/shengji/core/game";
import { handToCards } from "/src/shengji/core/convert";
import { legalMoves } from "/src/shengji/advisor/moves";

export const card = (suit: Suit, rank: number): Card => ({ suit, rank: rank as Rank });

export function buildHand(cards: readonly Card[]): Hand {
    const hand = new Hand();
    for (const c of cards) {hand.addCard(c);}
    return hand;
}

export function playerNames(count: number): string[] {
    return Array.from({ length: count }, (_, i) => `p${String(i)}`);
}

/** Make every `Math.random` call (used by Deck.shuffle) deterministic. */
export function seedRandom(seed: number): void {
    const rng = new RNG(seed);
    vi.spyOn(Math, "random").mockImplementation(() => rng.next());
}

export interface Table {
    game: Game;
    players: string[];
    state: GameState;
}

/** A freshly initialised game with everyone seated and nothing drawn. */
export function newTable(count = 4): Table {
    const game = baseGame();
    const players = playerNames(count);
    game.initializeGame(players, players.map((p) => p.toUpperCase()));
    return { game, players, state: game.getState() };
}

/** Draw every card, then let the zhuang keep the kitty untouched. */
export function dealAndSkipKitty(table: Table): void {
    table.game.speedDraw();
    const zhuang = table.players[table.state.zhuang];
    table.game.exchangeDipai(zhuang, [], []);
}

/**
 * A game in the middle of play, built by hand: `hands` maps player name to the cards still
 * held, and `overrides` is merged into the state. Nobody is drawing and the kitty is closed.
 */
export function craft(options: {
    players?: number;
    hands: Record<string, Card[]>;
    dipai?: Card[];
    overrides?: Partial<GameState>;
}): Table {
    const base = baseGame();
    const players = playerNames(options.players ?? 4);
    base.initializeGame(players, players);
    const state = base.getState();
    Object.assign(state, { draw: false, dip: false, trump: { suit: "spades", rank: 2 } }, options.overrides);

    const hands = new Map<string, Hand>(players.map((p) => [p, buildHand(options.hands[p] ?? [])]));
    const game = new Game(state, hands, new Deck(0, 1), options.dipai ?? []);
    return { game, players, state };
}

export interface RoundLog {
    plays: number;
    rejected: number;
    trickPoints: number[];
}

/** Play random legal moves until the round counter moves on (or `limit` plays pass). */
export function playRound(table: Table, rng: RNG, limit = 400): RoundLog {
    const { game, players, state } = table;
    const startRound = state.round;
    const log: RoundLog = { plays: 0, rejected: 0, trickPoints: [] };

    while (state.round === startRound && !state.over && log.plays < limit) {
        const player = players[state.turn];
        const hand = game.getHand(player);
        if (!hand) {throw new Error(`no hand for ${player}`);}

        const cards = handToCards(hand, state.trump);
        const leading = state.turn === state.chu;
        const leadPlay = state.info.get(players[state.lead])?.play;
        const moves = legalMoves(cards, leading ? null : (leadPlay?.cards ?? null), state.trump);
        if (moves.length === 0) {
            log.rejected++;
            break;
        }

        const pointsBefore = state.points;
        if (!game.tryPlay(player, { cards: rng.pick(moves), suit: null })) {
            log.rejected++;
            break;
        }
        log.plays++;
        log.trickPoints.push(state.points - pointsBefore);
    }

    return log;
}

export function cardsHeld(table: Table): Card[] {
    return table.players.flatMap((p) => {
        const hand = table.game.getHand(p);
        return hand ? handToCards(hand, null) : [];
    });
}

export const cardKey = (c: Card): string => `${c.suit}:${String(c.rank)}`;

export function tally(cards: readonly Card[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const c of cards) {counts.set(cardKey(c), (counts.get(cardKey(c)) ?? 0) + 1);}
    return counts;
}
