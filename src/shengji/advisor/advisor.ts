/**
 * The advisor: given a position as a player would describe it, rank the legal plays.
 *
 * Two independent things happen here.
 *
 *   1. `legalMoves` enumerates the plays, and `core/comparison.ts` validates each one.
 *      Nothing suggested here can be an illegal move.
 *   2. The playbook scores them. That scoring is the ported strategy, and it is a
 *      *heuristic* — it is roughly as strong as the best hand-written bot in this repo,
 *      not a solver. `winProbability` is an estimate from an uncalibrated model.
 *
 * The survival-probability estimator is a port of
 * `Learner_V1/ai_bot/heuristic_pro.py::_survival_probability`.
 */

import * as SJComp from "/src/shengji/core/comparison";

import type { Advice, Candidate, Card, Move, Position, RuleHit, Trump } from "./types";
import {
    allCards,
    cardKey,
    distinctCounts,
    legalMoves,
    playInfo,
    pointValue,
    strengthOrder,
    totalPoints,
} from "./moves";
import { CONDITIONS, FEATURES, FOLLOW_RULES, LEAD_RULES, PARAMETERS } from "./playbook";
import type { Ctx, Rule } from "./playbook";

/** Cards that could still be in someone else's hand or the kitty. */
export function unseenCounts(position: Position): Array<[Card, number]> {
    const remaining: Map<string, [Card, number]> = new Map<string, [Card, number]>();
    for (const card of allCards()) remaining.set(cardKey(card), [card, position.decks]);

    const accountedFor: Card[] = [
        ...position.hand,
        ...position.seen,
        ...position.trick.flat(),
    ];
    for (const card of accountedFor) {
        const entry = remaining.get(cardKey(card));
        if (entry) entry[1] -= 1;
    }

    return [...remaining.values()].filter(([, n]) => n > 0);
}

/** Which play in the trick is winning right now. Null when the trick is empty. */
export function winningPosition(trick: Move[], trump: Trump): number | null {
    if (trick.length === 0) return null;
    let best: number = 0;
    for (let i = 1; i < trick.length; i++) {
        if (SJComp.isPlayBigger(playInfo(trick[i], trump), playInfo(trick[best], trump), trump)) {
            best = i;
        }
    }
    return best;
}

/**
 * Chance your side still holds the trick once everyone behind you has played.
 *
 * Counts the unseen cards that would beat whatever is winning, then asks how likely each
 * opponent yet to act is to be holding one. Sampling without replacement is approximated
 * geometrically, and the ruff term carries a hand-picked 0.6 factor — this is a dial,
 * not a calibrated probability.
 */
function survivalProbability(
    trick: Move[],
    winnerPos: number,
    myPosition: number,
    numPlayers: number,
    cardsLeft: number,
    unseen: Array<[Card, number]>,
    trump: Trump,
): number {
    const winning: Move = trick[winnerPos];
    if (!winning || winning.length === 0) return 0.5;

    const iwin = playInfo(winning, trump);
    const top: Card = iwin.play.cards[iwin.play.cards.length - 1]; // sorted ascending
    const width: number = iwin.struct.count.length ? Math.max(...iwin.struct.count) : 1;

    const leadCard: Card = trick[0][0];
    const ledLineIsTrump: boolean = SJComp.isMainLine(leadCard, trump);

    // Only a card in the led line can beat us by rank. A trump beats a plain lead, but
    // only from a seat that is void in that suit — counting every unseen trump as a live
    // threat makes every candidate look equally doomed.
    let beaters: number = 0;
    let pool: number = 0;
    let linePool: number = 0;
    for (const [card, n] of unseen) {
        pool += n;
        if (!SJComp.checkInline(card, leadCard, trump)) continue;
        linePool += n;
        if (n >= width && SJComp.isCardBigger(card, top, trump)) beaters += n;
    }

    const winnerIsOurs: boolean = (myPosition - winnerPos) % 2 === 0;
    if (pool <= 0) return winnerIsOurs ? 1.0 : 0.0;

    let survive: number = 1.0;
    for (let other = 0; other < numPlayers; other++) {
        if (other <= myPosition) continue; // already acted this trick
        if ((other - myPosition) % 2 === 0) continue; // partner, not a threat
        const held: number = Math.min(cardsLeft, 25);
        if (held <= 0) continue;

        let pBeat: number = 1.0 - Math.pow(Math.max(0.0, 1.0 - beaters / pool), held);
        if (!ledLineIsTrump) {
            const pVoid: number = Math.pow(Math.max(0.0, 1.0 - linePool / pool), held);
            pBeat = 1.0 - (1.0 - pBeat) * (1.0 - 0.6 * pVoid);
        }
        survive *= 1.0 - pBeat;
    }

    return winnerIsOurs ? survive : 1.0 - survive;
}

/** What happens to the trick if you play `move`. */
function afterMove(
    move: Move,
    trick: Move[],
    currentWinner: number | null,
    trump: Trump,
): { trick: Move[]; winner: number } {
    const myPosition: number = trick.length;
    const next: Move[] = [...trick, move];
    if (currentWinner === null) return { trick: next, winner: myPosition };
    const beats: boolean = SJComp.isPlayBigger(
        playInfo(move, trump),
        playInfo(trick[currentWinner], trump),
        trump,
    );
    return { trick: next, winner: beats ? myPosition : currentWinner };
}

function scoreMove(ctx: Ctx, rules: Rule[]): { score: number; hits: RuleHit[] } {
    let total: number = 0;
    const hits: RuleHit[] = [];

    for (const rule of rules) {
        if (!rule.when.every((name) => CONDITIONS[name](ctx))) continue;

        const before: number = total;
        for (const [param, feature] of Object.entries(rule.add || {})) {
            total += PARAMETERS[param] * FEATURES[feature](ctx);
        }
        if (rule.constParam !== undefined) total += PARAMETERS[rule.constParam];
        if (rule.const !== undefined) total += rule.const;

        if (total !== before) hits.push({ id: rule.id, delta: total - before, plain: rule.plain });
    }

    return { score: total, hits };
}

/** Things about the entered position that make the answer meaningless. */
function validate(position: Position): string[] {
    const problems: string[] = [];

    if (position.numPlayers % 2 !== 0) problems.push("Player count must be even.");
    if (position.trick.length >= position.numPlayers) {
        problems.push("The trick already has a play from every seat — nobody is left to act.");
    }
    if (!position.hand.length) problems.push("Add the cards you are holding.");
    if (position.trick.some((play) => play.length === 0)) {
        problems.push("Every play in the trick needs at least one card.");
    }

    const lead: Move | undefined = position.trick[0];
    if (lead) {
        for (let i = 1; i < position.trick.length; i++) {
            if (position.trick[i].length !== lead.length) {
                problems.push(
                    `Play ${i + 1} has ${position.trick[i].length} card(s) but the lead was ${lead.length}.`,
                );
                break;
            }
        }
        if (position.hand.length < lead.length) {
            problems.push(`The lead is ${lead.length} cards but you are only holding ${position.hand.length}.`);
        }
    }

    // more copies of a card than the pack contains
    const total: Map<string, [Card, number]> = new Map<string, [Card, number]>();
    for (const card of [...position.hand, ...position.seen, ...position.trick.flat()]) {
        const entry = total.get(cardKey(card));
        if (entry) entry[1] += 1;
        else total.set(cardKey(card), [card, 1]);
    }
    for (const [card, n] of total.values()) {
        if (n > position.decks) {
            problems.push(
                `${card.suit === "jokers" ? (card.rank === 2 ? "Big joker" : "Small joker") : `${card.rank} of ${card.suit}`} appears ${n} times, but only ${position.decks} decks are in play.`,
            );
        }
    }

    return problems;
}

export function analyse(position: Position): Advice {
    const problems: string[] = validate(position);

    const trump: Trump = position.trump;
    const lead: Move | null = position.trick.length ? position.trick[0] : null;
    const isLead: boolean = lead === null;
    const pot: number = totalPoints(position.trick.flat());
    const cardsLeft: number = position.hand.length;
    const early: boolean = cardsLeft > PARAMETERS.ace_lead_phase;
    const currentWinner: number | null = winningPosition(position.trick, trump);

    const facts: Advice["facts"] = {
        leading: isLead,
        cardsLeft: cardsLeft,
        phase: early ? "early" : "late",
        potPoints: pot,
        winningPosition: currentWinner,
        winningSide:
            currentWinner === null
                ? null
                : (position.trick.length - currentWinner) % 2 === 0
                  ? "partner"
                  : "opponent",
        legalMoveCount: 0,
    };

    if (problems.length) return { candidates: [], facts: facts, problems: problems };

    let legal: Move[] = [];
    try {
        legal = legalMoves(position.hand, lead, trump);
    } catch (err) {
        return {
            candidates: [],
            facts: facts,
            problems: [`Could not enumerate legal plays: ${(err as Error).message}`],
        };
    }

    facts.legalMoveCount = legal.length;
    if (!legal.length) {
        return {
            candidates: [],
            facts: facts,
            problems: ["No legal play — check the hand and the lead."],
        };
    }

    const order: Map<string, number> = strengthOrder(trump);
    const unseen: Array<[Card, number]> = unseenCounts(position);
    const handCounts: Map<string, number> = new Map(
        distinctCounts(position.hand).map(([card, n]) => [cardKey(card), n]),
    );
    const rules: Rule[] = isLead ? LEAD_RULES : FOLLOW_RULES;
    const myPosition: number = position.trick.length;

    const candidates: Candidate[] = legal.map((move) => {
        const outcome = afterMove(move, position.trick, currentWinner, trump);
        const trickCloses: boolean = outcome.trick.length === position.numPlayers;
        const winProbability: number = trickCloses
            ? (myPosition - outcome.winner) % 2 === 0
                ? 1.0
                : 0.0
            : survivalProbability(
                  outcome.trick,
                  outcome.winner,
                  myPosition,
                  position.numPlayers,
                  cardsLeft,
                  unseen,
                  trump,
              );

        const ctx: Ctx = {
            trump: trump,
            hand: position.hand,
            handCounts: handCounts,
            move: move,
            isLead: isLead,
            early: early,
            unseen: unseen,
            order: order,
            winProbability: winProbability,
            threshold: PARAMETERS.trump_commit_threshold,
            pot: pot,
            trick: position.trick,
            myPosition: myPosition,
            winningPosition: currentWinner,
        };

        const { score, hits } = scoreMove(ctx, rules);

        return {
            move: move,
            score: score,
            rules: hits,
            winProbability: winProbability,
            pointsAdded: move.reduce((sum, card) => sum + pointValue(card), 0),
            takesTrick: outcome.winner === myPosition,
        };
    });

    candidates.sort((a, b) => b.score - a.score);

    return { candidates: candidates, facts: facts, problems: [] };
}
