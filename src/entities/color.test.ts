import { describe, expect, it, vi } from "vitest";

import { defaultColor, randomColor } from "./color";

describe("color entities", () => {
    it("defaultColor is black and returns a fresh array each time", () => {
        const a = defaultColor();
        expect(a).toEqual([0, 0, 0]);
        a[0] = 9;
        expect(defaultColor()).toEqual([0, 0, 0]);
    });

    it("randomColor maps Math.random onto 0..255 integers", () => {
        const random = vi.spyOn(Math, "random");
        random.mockReturnValue(0);
        expect(randomColor()).toEqual([0, 0, 0]);
        random.mockReturnValue(1);
        expect(randomColor()).toEqual([255, 255, 255]);
        random.mockReturnValue(0.5);
        for (const channel of randomColor()) {expect(Number.isInteger(channel)).toBe(true);}
    });

    it("randomColor always yields channels in range", () => {
        for (let i = 0; i < 500; i++) {
            for (const channel of randomColor()) {
                expect(channel).toBeGreaterThanOrEqual(0);
                expect(channel).toBeLessThanOrEqual(255);
            }
        }
    });
});
