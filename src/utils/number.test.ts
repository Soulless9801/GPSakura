import { describe, expect, it } from "vitest";
import { clampToStep } from "./number";

describe("clampToStep", () => {
    it.each([
        [5, 0, 5, 2, 0, 5],
        [1, 1, 10, 3, 0, 1],
        [5, 1, 20, 2, 0, 6],
        [2.3, 0, 10, 0.5, 1, 2.5],
        [0.3, 0, 1, 0.1, 2, 0.3],
        [100, 0, 1, 0.1, 2, 1],
        [-100, 0, 1, 0.1, 2, 0],
        [0.05, 0.05, 0.95, 0.1, 0, 0.05],
        [5, 5, 5, 2, 0, 5],
        [3.25, 0, 5, 0, 2, 3.25],
    ])("normalizes %s within [%s, %s], step %s, places %s", (value, min, max, step, places, expected) => {
        expect(clampToStep(value, min, max, step, places)).toBe(expected);
    });
});
