import { describe, expect, it, vi } from "vitest";

import {
    composeSignal,
    defaultComponent,
    generateTimeArray,
    randomComponent,
    sineComponent,
} from "./signal";

describe("generateTimeArray", () => {
    it("spans [0, tMax] inclusive with n samples", () => {
        const t = generateTimeArray(5, 2);
        expect(t).toHaveLength(5);
        expect(Array.from(t)).toEqual([0, 0.5, 1, 1.5, 2]);
    });

    it("defaults to 512 samples over one second", () => {
        const t = generateTimeArray();
        expect(t).toHaveLength(512);
        expect(t[0]).toBe(0);
        expect(t[511]).toBeCloseTo(1, 6);
    });

    it("returns an empty array for n = 0", () => {
        expect(generateTimeArray(0)).toHaveLength(0);
    });

    // (i / (n - 1)) divides by zero when n = 1.
    it("yields NaN for a single sample", () => {
        expect(generateTimeArray(1)[0]).toBeNaN();
    });
});

describe("sineComponent", () => {
    it("is a * sin(2*pi*f*t)", () => {
        expect(sineComponent(2, 1, 0.25)).toBeCloseTo(2, 10);
        expect(sineComponent(3, 2, 0.25)).toBeCloseTo(0, 10);
        expect(sineComponent(1, 1, 0.75)).toBeCloseTo(-1, 10);
    });

    it("is zero amplitude -> zero signal", () => {
        expect(sineComponent(0, 5, 0.3)).toBe(0);
    });
});

describe("composeSignal", () => {
    it("sums its components sample by sample", () => {
        const t = generateTimeArray(9, 1);
        const out = composeSignal([{ a: 1, f: 1 }, { a: 2, f: 3 }], t);
        for (let i = 0; i < t.length; i++) {
            expect(out[i]).toBeCloseTo(sineComponent(1, 1, t[i]) + sineComponent(2, 3, t[i]), 5);
        }
    });

    it("returns silence for no components", () => {
        const out = composeSignal([], generateTimeArray(4));
        expect(Array.from(out)).toEqual([0, 0, 0, 0]);
    });

    it("returns a Float32Array the same length as the time array", () => {
        const out = composeSignal([defaultComponent()], generateTimeArray(7));
        expect(out).toBeInstanceOf(Float32Array);
        expect(out).toHaveLength(7);
    });
});

describe("component factories", () => {
    it("defaultComponent is unit amplitude at 1 Hz", () => {
        expect(defaultComponent()).toEqual({ a: 1, f: 1 });
    });

    it("randomComponent covers amplitude 1..3 and frequency 1..10", () => {
        const random = vi.spyOn(Math, "random");
        random.mockReturnValue(0);
        expect(randomComponent()).toEqual({ a: 1, f: 1 });
        random.mockReturnValue(0.999999);
        expect(randomComponent()).toEqual({ a: 3, f: 10 });
    });
});
