import { describe, expect, it } from "vitest";

import { analyse } from "./advisor";
import { cardKey, distinctCounts, strengthOrder } from "./moves";
import type { Ctx } from "./playbook";
import { CONDITIONS, FEATURES, FOLLOW_RULES, HARMFUL_RULES, LEAD_RULES, PARAMETERS } from "./playbook";
import type { Card, Move, Rank, Suit, Trump } from "./types";

const card = (suit: Suit, rank: number): Card => ({ suit, rank: rank as Rank });
const H = (rank: number): Card => card("hearts", rank);
const S = (rank: number): Card => card("spades", rank);
const C = (rank: number): Card => card("clubs", rank);

const TRUMP: Trump = { suit: "spades", rank: 2 };

function ctx(overrides: Partial<Ctx> & { move: Move }): Ctx {
    const hand = overrides.hand ?? overrides.move;
    return {
        trump: TRUMP,
        hand,
        handCounts: new Map(distinctCounts(hand).map(([c, n]) => [cardKey(c), n])),
        isLead: true,
        early: true,
        unseen: [],
        order: strengthOrder(TRUMP),
        winProbability: 0.5,
        threshold: PARAMETERS.trump_commit_threshold,
        pot: 0,
        trick: [],
        myPosition: 0,
        winningPosition: null,
        ...overrides,
    };
}

describe("playbook integrity", () => {
    const allRules = [...LEAD_RULES, ...FOLLOW_RULES];

    it("rule ids are unique", () => {
        const ids = allRules.map((r) => r.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("every rule has a plain-English explanation", () => {
        for (const rule of allRules) {expect(rule.plain.length, rule.id).toBeGreaterThan(10);}
    });

    it("every `when` names a known condition", () => {
        for (const rule of allRules) {
            for (const name of rule.when) {expect(CONDITIONS, `${rule.id}: ${name}`).toHaveProperty(name);}
        }
    });

    it("every `add` pairs a known parameter with a known feature", () => {
        for (const rule of allRules) {
            for (const [param, feature] of Object.entries(rule.add ?? {})) {
                expect(PARAMETERS, `${rule.id}: ${param}`).toHaveProperty(param);
                expect(FEATURES, `${rule.id}: ${feature}`).toHaveProperty(feature);
            }
            if (rule.constParam !== undefined) {expect(PARAMETERS, rule.id).toHaveProperty(rule.constParam);}
        }
    });

    it("every rule contributes something to the score", () => {
        for (const rule of allRules) {
            const contributes = Object.keys(rule.add ?? {}).length > 0 || rule.constParam !== undefined || rule.const !== undefined;
            expect(contributes, rule.id).toBe(true);
        }
    });

    it("lead rules only fire when leading, follow rules only when following", () => {
        for (const rule of LEAD_RULES) {expect(rule.when, rule.id).toContain("is_lead");}
        for (const rule of FOLLOW_RULES) {expect(rule.when, rule.id).toContain("is_follow");}
    });

    it("every harmful-rule note points at a real rule", () => {
        const ids = new Set(allRules.map((r) => r.id));
        for (const id of Object.keys(HARMFUL_RULES)) {expect(ids.has(id), id).toBe(true);}
    });

    it("all parameters are finite numbers", () => {
        for (const [name, value] of Object.entries(PARAMETERS)) {expect(Number.isFinite(value), name).toBe(true);}
    });

    it("penalty parameters are negative and bonuses positive", () => {
        for (const name of ["overtake_partner_penalty", "wasted_trump_penalty", "losing_points_penalty", "break_pair_penalty", "lead_points_penalty"]) {
            expect(PARAMETERS[name], name).toBeLessThan(0);
        }
        for (const name of ["tractor_bonus", "pair_bonus", "take_trick_bonus", "void_creation_bonus", "partner_feed_weight"]) {
            expect(PARAMETERS[name], name).toBeGreaterThan(0);
        }
    });
});

describe("features", () => {
    it("structure_run_extra counts the extra links in a tractor", () => {
        expect(FEATURES.structure_run_extra(ctx({ move: [H(5)] }))).toBe(0);
        expect(FEATURES.structure_run_extra(ctx({ move: [H(5), H(5)] }))).toBe(0);
        expect(FEATURES.structure_run_extra(ctx({ move: [H(5), H(5), H(6), H(6)] }))).toBe(1);
        expect(FEATURES.structure_run_extra(ctx({ move: [H(5), H(5), H(6), H(6), H(7), H(7)] }))).toBe(2);
    });

    it("structure_multiplicity_extra counts the extra copies", () => {
        expect(FEATURES.structure_multiplicity_extra(ctx({ move: [H(5)] }))).toBe(0);
        expect(FEATURES.structure_multiplicity_extra(ctx({ move: [H(5), H(5)] }))).toBe(1);
        expect(FEATURES.structure_multiplicity_extra(ctx({ move: [H(5), H(5), H(5)] }))).toBe(2);
    });

    it("top_card_strength is 0 for the weakest card and 14 for the strongest", () => {
        const weakest = allWeakest();
        expect(FEATURES.top_card_strength(ctx({ move: [weakest] }))).toBe(0);
        expect(FEATURES.top_card_strength(ctx({ move: [card("jokers", 2)] }))).toBeCloseTo(14, 10);
    });

    it("top_card_strength uses the best card in a multi-card move", () => {
        expect(FEATURES.top_card_strength(ctx({ move: [H(3), H(14)] }))).toBe(FEATURES.top_card_strength(ctx({ move: [H(14)] })));
    });

    it("move_cost is the average strength", () => {
        const low = FEATURES.move_cost(ctx({ move: [H(3)] }));
        const mixed = FEATURES.move_cost(ctx({ move: [H(3), card("jokers", 2)] }));
        expect(mixed).toBeCloseTo((low + 14) / 2, 10);
    });

    it("points_in_move and pot_plus_move_points", () => {
        expect(FEATURES.points_in_move(ctx({ move: [H(5), H(10)] }))).toBe(15);
        expect(FEATURES.pot_plus_move_points(ctx({ move: [H(5)], pot: 20 }))).toBe(25);
    });

    it("led_suit_length counts the suit of the first card across the whole hand", () => {
        const hand = [H(3), H(4), H(5), C(9)];
        expect(FEATURES.led_suit_length(ctx({ move: [H(3)], hand }))).toBe(3);
        expect(FEATURES.led_suit_length(ctx({ move: [C(9)], hand }))).toBe(1);
    });

    it("creates_void counts plain suits the move empties and ignores trumps", () => {
        const hand = [H(3), H(4), C(9), S(5)];
        expect(FEATURES.creates_void(ctx({ move: [C(9)], hand }))).toBe(1);
        expect(FEATURES.creates_void(ctx({ move: [H(3)], hand }))).toBe(0);
        expect(FEATURES.creates_void(ctx({ move: [H(3), H(4)], hand }))).toBe(1);
        expect(FEATURES.creates_void(ctx({ move: [S(5)], hand }))).toBe(0);
    });

    it("breaks_pair counts cards played singly out of a held pair", () => {
        const hand = [H(3), H(3), H(4)];
        expect(FEATURES.breaks_pair(ctx({ move: [H(3)], hand }))).toBe(1);
        expect(FEATURES.breaks_pair(ctx({ move: [H(3), H(3)], hand }))).toBe(0);
        expect(FEATURES.breaks_pair(ctx({ move: [H(4)], hand }))).toBe(0);
    });

    function allWeakest(): Card {
        const order = strengthOrder(TRUMP);
        const [key] = [...order.entries()].find(([, v]) => v === 0) ?? ["diamonds:3"];
        const [suit, rank] = key.split(":");
        return card(suit as Suit, Number(rank));
    }
});

describe("conditions", () => {
    it("lead / follow and early / late", () => {
        expect(CONDITIONS.is_lead(ctx({ move: [H(3)], isLead: true }))).toBe(true);
        expect(CONDITIONS.is_follow(ctx({ move: [H(3)], isLead: true }))).toBe(false);
        expect(CONDITIONS.is_early(ctx({ move: [H(3)], early: true }))).toBe(true);
        expect(CONDITIONS.is_late(ctx({ move: [H(3)], early: true }))).toBe(false);
    });

    it("is_trump_line needs every card in the main line, is_side_suit needs none", () => {
        expect(CONDITIONS.is_trump_line(ctx({ move: [S(3), H(2)] }))).toBe(true);
        expect(CONDITIONS.is_trump_line(ctx({ move: [S(3), H(3)] }))).toBe(false);
        expect(CONDITIONS.is_side_suit(ctx({ move: [H(3), C(4)] }))).toBe(true);
        expect(CONDITIONS.is_side_suit(ctx({ move: [H(3), S(4)] }))).toBe(false);
    });

    it("partner_winning and opponent_winning depend on seat parity and require a winner", () => {
        const base = { move: [H(3)], isLead: false, trick: [[H(14)], [H(9)]] as Move[], myPosition: 2 };
        expect(CONDITIONS.partner_winning(ctx({ ...base, winningPosition: 0 }))).toBe(true);
        expect(CONDITIONS.opponent_winning(ctx({ ...base, winningPosition: 0 }))).toBe(false);
        expect(CONDITIONS.partner_winning(ctx({ ...base, winningPosition: 1 }))).toBe(false);
        expect(CONDITIONS.opponent_winning(ctx({ ...base, winningPosition: 1 }))).toBe(true);
        expect(CONDITIONS.partner_winning(ctx({ ...base, winningPosition: null }))).toBe(false);
        expect(CONDITIONS.opponent_winning(ctx({ ...base, winningPosition: null }))).toBe(false);
    });

    it("move_takes_trick is true when leading and otherwise compares to the winner", () => {
        expect(CONDITIONS.move_takes_trick(ctx({ move: [H(3)] }))).toBe(true);
        const follow = { isLead: false, trick: [[H(10)]] as Move[], myPosition: 1, winningPosition: 0 };
        expect(CONDITIONS.move_takes_trick(ctx({ move: [H(14)], ...follow }))).toBe(true);
        expect(CONDITIONS.move_loses_trick(ctx({ move: [H(14)], ...follow }))).toBe(false);
        expect(CONDITIONS.move_takes_trick(ctx({ move: [H(3)], ...follow }))).toBe(false);
        expect(CONDITIONS.move_loses_trick(ctx({ move: [H(3)], ...follow }))).toBe(true);
    });

    it("move_spends_trump needs a plain lead and a main-line card in the move", () => {
        const plainLead = { isLead: false, trick: [[H(10)]] as Move[], myPosition: 1, winningPosition: 0 };
        expect(CONDITIONS.move_spends_trump(ctx({ move: [S(3)], ...plainLead }))).toBe(true);
        expect(CONDITIONS.move_spends_trump(ctx({ move: [C(3)], ...plainLead }))).toBe(false);
        const trumpLead = { isLead: false, trick: [[S(10)]] as Move[], myPosition: 1, winningPosition: 0 };
        expect(CONDITIONS.move_spends_trump(ctx({ move: [S(3)], ...trumpLead }))).toBe(false);
        expect(CONDITIONS.move_spends_trump(ctx({ move: [S(3)] }))).toBe(false); // leading
    });

    it("pot_is_empty and the win-probability threshold", () => {
        expect(CONDITIONS.pot_is_empty(ctx({ move: [H(3)], pot: 0 }))).toBe(true);
        expect(CONDITIONS.pot_is_empty(ctx({ move: [H(3)], pot: 5 }))).toBe(false);
        expect(CONDITIONS.win_probability_below_threshold(ctx({ move: [H(3)], winProbability: 0.64 }))).toBe(true);
        expect(CONDITIONS.win_probability_below_threshold(ctx({ move: [H(3)], winProbability: 0.65 }))).toBe(false);
    });

    it("is_boss_card is true only when nothing unseen can beat the move", () => {
        const unseen: Array<[Card, number]> = [[H(13), 1]];
        expect(CONDITIONS.is_boss_card(ctx({ move: [H(14)], unseen }))).toBe(true);
        expect(CONDITIONS.is_boss_card(ctx({ move: [H(12)], unseen }))).toBe(false);
        // an unseen trump could still ruff a plain ace, so it is not a boss card
        expect(CONDITIONS.is_boss_card(ctx({ move: [H(14)], unseen: [[S(3), 1]] }))).toBe(false);
        expect(CONDITIONS.is_boss_card(ctx({ move: [] }))).toBe(false);
    });
});

describe("rules through analyse()", () => {
    const base = { numPlayers: 4, decks: 2, trump: TRUMP, seen: [] as Card[] };

    it("never leads a king when a cheap card of the same suit is available, all else equal", () => {
        const advice = analyse({ ...base, hand: [H(13), H(3), H(4)], trick: [] });
        expect(advice.candidates[0].move[0].rank).not.toBe(13);
    });

    it("prefers a pair lead to a single of the same rank", () => {
        const advice = analyse({ ...base, hand: [H(9), H(9), C(4)], trick: [] });
        const pair = advice.candidates.find((c) => c.move.length === 2);
        const single = advice.candidates.find((c) => c.move.length === 1 && c.move[0].rank === 9);
        expect(pair).toBeDefined();
        expect(single).toBeDefined();
        if (!pair || !single) {return;}
        expect(pair.rules.map((r) => r.id)).toContain("lead-structure-first");
        expect(pair.score).toBeGreaterThan(single.score);
    });

    it("never overtakes a partner who already owns the trick", () => {
        // I am seat 2; seat 0 (my partner) led the ace and seat 1 played low
        const advice = analyse({ ...base, hand: [H(13), H(4)], trick: [[H(14)], [H(3)]] });
        expect(advice.facts.winningSide).toBe("partner");
        expect(advice.candidates.find((c) => c.takesTrick)).toBeUndefined();
    });

    it("explains every score through the rules that fired", () => {
        const advice = analyse({ ...base, hand: [H(5), H(6), H(6), C(14), S(3)], trick: [] });
        for (const candidate of advice.candidates) {
            const sum = candidate.rules.reduce((total, r) => total + r.delta, 0);
            expect(sum).toBeCloseTo(candidate.score, 9);
        }
    });
});
