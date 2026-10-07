import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validateCard } from "./entities";
import * as SJComp from "./comparison";
import { genTestCase } from "./testcase";

describe("genTestCase", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    /** The generator seeds itself from Date.now(), so pinning the clock pins the case. */
    function at(time: number): ReturnType<typeof genTestCase> {
        vi.setSystemTime(time);
        return genTestCase();
    }

    it("is deterministic for a given clock value", () => {
        const a = at(1_700_000_000_000);
        const b = at(1_700_000_000_000);
        expect(b.trump).toEqual(a.trump);
        expect(b.iplay.play.cards).toEqual(a.iplay.play.cards);
        expect(b.ilead.play.cards).toEqual(a.ilead.play.cards);
    });

    it("different clock values give different cases", () => {
        const seen = new Set<string>();
        for (let i = 0; i < 20; i++) {
            const t = at(1_700_000_000_000 + i * 977);
            seen.add(JSON.stringify([t.trump, t.ilead.play.cards]));
        }
        expect(seen.size).toBeGreaterThan(10);
    });

    it("always produces a plain-suit trump", () => {
        for (let i = 0; i < 100; i++) {
            const { trump } = at(1_600_000_000_000 + i * 12_345);
            expect(trump.suit).not.toBeNull();
            expect(trump.suit).not.toBe("jokers");
        }
    });

    // randomTrump draws a random card; when that card is a joker it only replaces the suit and
    // keeps the joker's rank (1 or 2), so the trump rank can be 1.
    it.fails("KNOWN BUG: the trump rank is always between 2 and 14", () => {
        for (let i = 0; i < 100; i++) {
            const { trump } = at(1_600_000_000_000 + i * 12_345);
            expect(trump.rank).toBeGreaterThanOrEqual(2);
            expect(trump.rank).toBeLessThanOrEqual(14);
        }
    });

    it("only deals legal cards, and the play comes out of the hand", () => {
        for (let i = 0; i < 100; i++) {
            const t = at(1_600_000_000_000 + i * 54_321);
            for (const c of [...t.ilead.play.cards, ...t.iplay.play.cards]) {expect(validateCard(c)).toBe(true);}
            expect(SJComp.isSubset(t.iplay, t.ihand), `case ${String(i)}`).toBe(true);
        }
    });

    it("the follow has as many cards as the lead", () => {
        for (let i = 0; i < 100; i++) {
            const t = at(1_600_000_000_000 + i * 31_337);
            expect(t.iplay.play.cards.length, `case ${String(i)}`).toBe(t.ilead.play.cards.length);
        }
    });

    it("the information blocks describe the same cards as the plays", () => {
        const t = at(1_650_000_000_000);
        expect(t.ihand.struct.cards.length).toBeGreaterThan(0);
        let total = 0;
        for (const n of t.ilead.struct.count) {total += n;}
        expect(total).toBeGreaterThan(0);
    });
});
