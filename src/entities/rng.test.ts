import { describe, expect, it } from "vitest";

import RNG from "./rng";

describe("RNG", () => {
    it("is deterministic for a given seed", () => {
        const a = new RNG(1234);
        const b = new RNG(1234);
        for (let i = 0; i < 100; i++) {expect(a.next()).toBe(b.next());}
    });

    it("produces different streams for different seeds", () => {
        const a = new RNG(1);
        const b = new RNG(2);
        const seqA = Array.from({ length: 5 }, () => a.next());
        const seqB = Array.from({ length: 5 }, () => b.next());
        expect(seqA).not.toEqual(seqB);
    });

    it("next() stays within [0, 1)", () => {
        const rng = new RNG(99);
        for (let i = 0; i < 10_000; i++) {
            const x = rng.next();
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThan(1);
        }
    });

    it("next() is roughly uniform", () => {
        const rng = new RNG(2024);
        const buckets = new Array<number>(10).fill(0);
        const n = 50_000;
        for (let i = 0; i < n; i++) {buckets[Math.floor(rng.next() * 10)]++;}
        for (const count of buckets) {
            expect(count / n).toBeGreaterThan(0.09);
            expect(count / n).toBeLessThan(0.11);
        }
    });

    it("int(min, max) is inclusive on both ends and in range", () => {
        const rng = new RNG(7);
        const seen = new Set<number>();
        for (let i = 0; i < 2000; i++) {
            const v = rng.int(3, 6);
            expect(Number.isInteger(v)).toBe(true);
            seen.add(v);
        }
        expect([...seen].sort()).toEqual([3, 4, 5, 6]);
    });

    it("int(n, n) always returns n", () => {
        const rng = new RNG(7);
        for (let i = 0; i < 20; i++) {expect(rng.int(5, 5)).toBe(5);}
    });

    it("pick() returns members of the array", () => {
        const rng = new RNG(5);
        const items = ["a", "b", "c"];
        for (let i = 0; i < 100; i++) {expect(items).toContain(rng.pick(items));}
    });

    it("chance(0) never fires and chance(1) always does", () => {
        const rng = new RNG(5);
        for (let i = 0; i < 200; i++) {
            expect(rng.chance(0)).toBe(false);
            expect(rng.chance(1)).toBe(true);
        }
    });

    it("shuffle() returns a permutation and leaves the input alone", () => {
        const rng = new RNG(31337);
        const input = Array.from({ length: 52 }, (_, i) => i);
        const copy = [...input];
        const out = rng.shuffle(input);

        expect(input).toEqual(copy);
        expect([...out].sort((a, b) => a - b)).toEqual(copy);
        expect(out).not.toEqual(copy);
    });

    it("shuffle() is reproducible per seed", () => {
        const items = Array.from({ length: 20 }, (_, i) => i);
        expect(new RNG(11).shuffle(items)).toEqual(new RNG(11).shuffle(items));
    });

    it("shuffle() handles empty and single-element arrays", () => {
        expect(new RNG(1).shuffle([])).toEqual([]);
        expect(new RNG(1).shuffle([9])).toEqual([9]);
    });

    // xorshift32 maps state 0 to itself, so seed 0 yields an all-zero stream and a
    // "shuffle" that is only a fixed rotation. The blackjack server draws seeds from
    // Math.floor(Math.random() * 1e6), so one game in a million is dealt from a fixed deck.
    it.fails("KNOWN BUG: seed 0 still produces a varied stream", () => {
        const rng = new RNG(0);
        const values = new Set(Array.from({ length: 10 }, () => rng.next()));
        expect(values.size).toBeGreaterThan(1);
    });
});
