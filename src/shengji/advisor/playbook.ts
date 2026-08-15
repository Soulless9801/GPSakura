/**
 * The playbook, in the browser.
 *
 * This is a direct port of `Learner_V1/strategy/playbook.yaml` and the feature /
 * condition registries in `Learner_V1/strategy/playbook_bot.py`. Every rule is `when`
 * (conditions, all of which must hold) plus either `add` (weight x feature) or a flat
 * constant. Each legal move gets a score; the highest wins.
 *
 * Keeping the rules as data rather than folding them into one scoring function is the
 * whole point — the advisor can show you *which* rules moved a play up or down, and the
 * numbers below are the same ones the offline bot was measured with.
 *
 * Measured strength of this rule set (200 paired deals, 4 players, sides swapped):
 * 48.5% against ProHeuristicBot, 59.0% against HeuristicBot, 97.0% against random.
 */

import * as SJComp from "/src/shengji/core/comparison";

import type { Card, Move, Trump } from "./types";
import { cardKey, distinctCounts, playInfo, pointValue } from "./moves";

/** Everything the rules can talk about, computed once per candidate move. */
export interface Ctx {
    trump: Trump;
    /** your hand, before this move is played */
    hand: Card[];
    handCounts: Map<string, number>;
    move: Move;
    isLead: boolean;
    early: boolean;
    /** cards that could still be in someone else's hand or the kitty */
    unseen: Array<[Card, number]>;
    /** trump-aware strength rank per card, 0 = weakest */
    order: Map<string, number>;
    winProbability: number;
    threshold: number;
    /** points already riding on this trick */
    pot: number;
    trick: Move[];
    myPosition: number;
    /** index into `trick` of the play currently winning, or null when you lead */
    winningPosition: number | null;
}

// ---------------------------------------------------------------------------
// Named numbers. Every threshold the strategy depends on lives here.
// ---------------------------------------------------------------------------

export const PARAMETERS: Record<string, number> = {
    // the human's rules
    trump_commit_threshold: 0.65,
    ace_lead_phase: 12,
    partner_feed_weight: 4.0,

    // leading
    tractor_bonus: 14.0,
    pair_bonus: 6.0,
    suit_length_bonus: 0.6,
    lead_rank_early: 0.35,
    lead_rank_late: -0.2,
    trump_hold_early: -12.0,
    trump_hold_late: -4.0,
    lead_points_penalty: -0.8,

    // following
    take_trick_bonus: 8.0,
    pot_weight: 3.0,
    overtake_partner_penalty: -45.0,
    wasted_trump_penalty: -25.0,
    losing_points_penalty: -5.0,
    follow_cost_weight: -0.4,
    void_creation_bonus: 2.5,
    break_pair_penalty: -1.0,
};

// ---------------------------------------------------------------------------
// the facts a rule can talk about
// ---------------------------------------------------------------------------

/** True when nothing still unaccounted for can beat this play. */
function isBoss(ctx: Ctx): boolean {
    if (ctx.move.length === 0) return false;
    const ranked: Card[] = [...ctx.move].sort((a, b) => {
        const mainA: number = SJComp.isMainLine(a, ctx.trump) ? 1 : 0;
        const mainB: number = SJComp.isMainLine(b, ctx.trump) ? 1 : 0;
        if (mainA !== mainB) return mainA - mainB;
        return a.rank - b.rank;
    });
    const top: Card = ranked[ranked.length - 1];
    for (const [card, n] of ctx.unseen) {
        if (n > 0 && SJComp.isCardBigger(card, top, ctx.trump)) return false;
    }
    return true;
}

/** How many side suits this play empties. */
function createsVoid(ctx: Ctx): number {
    const left: Map<string, number> = new Map<string, number>();
    for (const [card, n] of distinctCounts(ctx.hand)) {
        if (SJComp.isMainLine(card, ctx.trump)) continue;
        left.set(card.suit, (left.get(card.suit) || 0) + n);
    }

    const spent: Map<string, number> = new Map<string, number>();
    for (const card of ctx.move) {
        if (SJComp.isMainLine(card, ctx.trump)) continue;
        spent.set(card.suit, (spent.get(card.suit) || 0) + 1);
    }

    let voids: number = 0;
    for (const [suit, used] of spent) if ((left.get(suit) || 0) === used) voids += 1;
    return voids;
}

/** The play currently winning the trick, or null when you are leading. */
function winningPlay(ctx: Ctx): Move | null {
    if (ctx.winningPosition === null) return null;
    return ctx.trick[ctx.winningPosition] || null;
}

function takesTrick(ctx: Ctx): boolean {
    const winning: Move | null = winningPlay(ctx);
    if (!winning) return true;
    return SJComp.isPlayBigger(
        playInfo(ctx.move, ctx.trump),
        playInfo(winning, ctx.trump),
        ctx.trump,
    );
}

export const FEATURES: Record<string, (ctx: Ctx) => number> = {
    structure_run_extra: (ctx) => {
        const struct = playInfo(ctx.move, ctx.trump).struct;
        if (!struct.cards.length) return 0;
        return Math.max(0, struct.cards[0].length - 1);
    },
    structure_multiplicity_extra: (ctx) => {
        const struct = playInfo(ctx.move, ctx.trump).struct;
        return Math.max(0, (struct.count.length ? struct.count[0] : 1) - 1);
    },
    top_card_strength: (ctx) => {
        const best: number = Math.max(...ctx.move.map((card) => ctx.order.get(cardKey(card)) || 0));
        return (best / 53.0) * 14.0;
    },
    led_suit_length: (ctx) => {
        const suit = ctx.move[0].suit;
        let total: number = 0;
        for (const [card, n] of distinctCounts(ctx.hand)) if (card.suit === suit) total += n;
        return total;
    },
    points_in_move: (ctx) => ctx.move.reduce((sum, card) => sum + pointValue(card), 0),
    pot_plus_move_points: (ctx) =>
        ctx.pot + ctx.move.reduce((sum, card) => sum + pointValue(card), 0),
    move_cost: (ctx) => {
        const total: number = ctx.move.reduce(
            (sum, card) => sum + (ctx.order.get(cardKey(card)) || 0),
            0,
        );
        return (total / Math.max(1, ctx.move.length) / 53.0) * 14.0;
    },
    creates_void: (ctx) => createsVoid(ctx),
    breaks_pair: (ctx) => {
        let broken: number = 0;
        for (const card of ctx.move) {
            const inHand: number = ctx.handCounts.get(cardKey(card)) || 0;
            const inMove: number = ctx.move.filter((other) => cardKey(other) === cardKey(card)).length;
            if (inHand >= 2 && inMove === 1) broken += 1;
        }
        return broken;
    },
};

export const CONDITIONS: Record<string, (ctx: Ctx) => boolean> = {
    is_lead: (ctx) => ctx.isLead,
    is_follow: (ctx) => !ctx.isLead,
    is_early: (ctx) => ctx.early,
    is_late: (ctx) => !ctx.early,
    is_trump_line: (ctx) => ctx.move.every((card) => SJComp.isMainLine(card, ctx.trump)),
    is_side_suit: (ctx) => !ctx.move.some((card) => SJComp.isMainLine(card, ctx.trump)),
    is_boss_card: (ctx) => isBoss(ctx),
    partner_winning: (ctx) =>
        ctx.winningPosition !== null && (ctx.myPosition - ctx.winningPosition) % 2 === 0,
    opponent_winning: (ctx) =>
        ctx.winningPosition !== null && (ctx.myPosition - ctx.winningPosition) % 2 !== 0,
    move_takes_trick: (ctx) => takesTrick(ctx),
    move_loses_trick: (ctx) => !takesTrick(ctx),
    move_spends_trump: (ctx) =>
        ctx.move.some((card) => SJComp.isMainLine(card, ctx.trump)) &&
        ctx.trick.length > 0 &&
        !SJComp.isMainLine(ctx.trick[0][0], ctx.trump),
    pot_is_empty: (ctx) => ctx.pot <= 0,
    win_probability_below_threshold: (ctx) => ctx.winProbability < ctx.threshold,
};

// ---------------------------------------------------------------------------
// the rules
// ---------------------------------------------------------------------------

export interface Rule {
    id: string;
    plain: string;
    when: string[];
    /** parameter name -> feature name */
    add?: Record<string, string>;
    constParam?: string;
    const?: number;
}

export const LEAD_RULES: Rule[] = [
    {
        id: "lead-structure-first",
        plain: "Lead a tractor before a pair, and a pair before a single — structure drags the opponents' pairs out.",
        when: ["is_lead"],
        add: { tractor_bonus: "structure_run_extra", pair_bonus: "structure_multiplicity_extra" },
    },
    {
        id: "lead-high-early-cheap-late",
        plain: "Lead your strongest plain card in the first half of the round — the human's \"start off with aces\".",
        when: ["is_lead", "is_early", "is_side_suit"],
        add: { lead_rank_early: "top_card_strength" },
    },
    {
        id: "lead-cheap-late",
        plain: "Once the round is half gone, stop cashing high cards and shed cheap ones.",
        when: ["is_lead", "is_late"],
        add: { lead_rank_late: "top_card_strength" },
    },
    {
        id: "prefer-boss-cards-early",
        plain: "Prefer a lead that nothing still outstanding can beat.",
        when: ["is_lead", "is_early", "is_boss_card", "is_side_suit"],
        const: 6.0,
    },
    {
        id: "lead-your-longest-suit",
        plain: "Lead the plain suit you hold most of; your small cards there become winners once everyone else runs out.",
        when: ["is_lead"],
        add: { suit_length_bonus: "led_suit_length" },
    },
    {
        id: "hold-trumps-back-early",
        plain: "Do not lead trumps in the first half — keep them to ruff with.",
        when: ["is_lead", "is_trump_line", "is_early"],
        constParam: "trump_hold_early",
    },
    {
        id: "hold-trumps-back-late",
        plain: "Late on, leading trumps is fine — draw the last ones out.",
        when: ["is_lead", "is_trump_line", "is_late"],
        constParam: "trump_hold_late",
    },
    {
        id: "never-lead-points",
        plain: "Never lead a 5, 10 or King — you would be putting points on a trick you have not won yet.",
        when: ["is_lead"],
        add: { lead_points_penalty: "points_in_move" },
    },
];

export const FOLLOW_RULES: Rule[] = [
    {
        id: "feed-points-to-a-winning-partner",
        plain: "If your partner is winning the trick, throw your point cards on it — your side collects them.",
        when: ["is_follow", "partner_winning"],
        add: { partner_feed_weight: "points_in_move" },
    },
    {
        id: "do-not-overtake-your-partner",
        plain: "Do not beat a trick your own partner already owns.",
        when: ["is_follow", "partner_winning", "move_takes_trick"],
        constParam: "overtake_partner_penalty",
    },
    {
        id: "feed-cheaply",
        plain: "When feeding a partner, use your lowest cards, not your best ones.",
        when: ["is_follow", "partner_winning"],
        add: { follow_cost_weight: "move_cost" },
    },
    {
        id: "take-tricks-that-hold-points",
        plain: "When an opponent is winning, take the trick if there is something in it — and take it cheaply.",
        when: ["is_follow", "opponent_winning", "move_takes_trick"],
        add: { pot_weight: "pot_plus_move_points" },
        constParam: "take_trick_bonus",
    },
    {
        id: "trump-commit-threshold",
        plain: "Do not spend a real trump on a trick you probably will not hold.",
        when: ["is_follow", "move_spends_trump", "win_probability_below_threshold"],
        constParam: "wasted_trump_penalty",
    },
    {
        id: "do-not-waste-trumps-on-empty-tricks",
        plain: "Never ruff a trick carrying no points.",
        when: ["is_follow", "move_spends_trump", "pot_is_empty"],
        constParam: "wasted_trump_penalty",
    },
    {
        id: "hold-points-when-you-are-losing",
        plain: "If the other side is taking this trick anyway, throw junk and keep your point cards.",
        when: ["is_follow", "opponent_winning", "move_loses_trick"],
        add: { losing_points_penalty: "points_in_move" },
    },
    {
        id: "discard-cheapest-when-losing",
        plain: "When you are not winning the trick, play your weakest legal card.",
        when: ["is_follow", "move_loses_trick"],
        add: { follow_cost_weight: "move_cost" },
    },
    {
        id: "shed-short-suits-to-create-a-void",
        plain: "Prefer discarding from a suit you are nearly out of — going void lets you ruff it later.",
        when: ["is_follow"],
        add: { void_creation_bonus: "creates_void" },
    },
    {
        id: "keep-pairs-together",
        plain: "Do not split a pair to discard when a lone card would do.",
        when: ["is_follow"],
        add: { break_pair_penalty: "breaks_pair" },
    },
];

/**
 * Rules the offline ablation measured as *harmful* — removing each one raised the win
 * rate against HeuristicBot over 400 paired deals. They are still applied (the advisor
 * plays the measured playbook, not an improved guess) but the UI flags them.
 *
 * Source: `Learner_V1/reports/rule_ablation.json`.
 */
export const HARMFUL_RULES: Record<string, string> = {
    "never-lead-points": "ablation: +4.5pp win rate without it",
    "hold-trumps-back-early": "ablation: +4.0pp win rate without it",
};
