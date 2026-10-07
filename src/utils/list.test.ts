import { describe, expect, it } from "vitest";

import { findIndex, toggleVal } from "./list";

describe("toggleVal", () => {
    it("appends a value that is absent", () => {
        expect(toggleVal([1, 2], 3)).toEqual([1, 2, 3]);
    });

    it("removes a value that is present", () => {
        expect(toggleVal([1, 2, 3], 2)).toEqual([1, 3]);
    });

    it("removes every duplicate of the value", () => {
        expect(toggleVal([1, 2, 2, 3], 2)).toEqual([1, 3]);
    });

    it("never mutates its input", () => {
        const input = Object.freeze([1, 2]);
        expect(() => toggleVal(input, 3)).not.toThrow();
        expect(() => toggleVal(input, 1)).not.toThrow();
        expect(input).toEqual([1, 2]);
    });

    it("works from and to the empty list", () => {
        expect(toggleVal<number>([], 1)).toEqual([1]);
        expect(toggleVal([1], 1)).toEqual([]);
    });
});

describe("findIndex", () => {
    const options = [{ value: "a" }, { value: "b" }, { value: "c" }];

    it("finds a string value", () => {
        expect(findIndex("b", options, 0)).toBe(1);
    });

    it("returns the default index when absent, null or undefined", () => {
        expect(findIndex("z", options, 2)).toBe(2);
        expect(findIndex(null, options, 1)).toBe(1);
        expect(findIndex(undefined, options, 1)).toBe(1);
    });

    it("returns the default index for an empty list", () => {
        expect(findIndex("a", [], 0)).toBe(0);
    });

    // The signature is generic over `string | number`, but the comparison is
    // `item.value === String(val)`, so a numeric option can never be matched.
    it("matches numeric option values", () => {
        expect(findIndex(5, [{ value: 4 }, { value: 5 }], -1)).toBe(1);
    });

    it("does not treat null or undefined as literal option strings", () => {
        expect(findIndex(null, [{ value: "null" }], -1)).toBe(-1);
        expect(findIndex(undefined, [{ value: "undefined" }], -1)).toBe(-1);
    });
});
