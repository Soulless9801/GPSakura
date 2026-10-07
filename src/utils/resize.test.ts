import { beforeEach, describe, expect, it, vi } from "vitest";

import { convertToPixels } from "./resize";

describe("convertToPixels", () => {
    const context = { getBoundingClientRect: () => ({ width: 400 }) } as unknown as HTMLElement;

    beforeEach(() => {
        vi.stubGlobal("window", { innerWidth: 1000, innerHeight: 800 });
        vi.stubGlobal("document", { body: context, documentElement: { id: "root" } });
        vi.stubGlobal("getComputedStyle", (el: { id?: string }) => ({
            fontSize: el.id === "root" ? "20px" : "10px",
        }));
    });

    it("returns numbers untouched", () => {
        expect(convertToPixels(42)).toBe(42);
        expect(convertToPixels(0)).toBe(0);
    });

    it("handles px", () => {
        expect(convertToPixels("12px")).toBe(12);
    });

    it("handles viewport units", () => {
        expect(convertToPixels("50vw")).toBe(500);
        expect(convertToPixels("25vh")).toBe(200);
    });

    it("handles % relative to the supplied context", () => {
        expect(convertToPixels("50%", context)).toBe(200);
        expect(convertToPixels("50%")).toBe(200); // defaults to document.body
    });

    it("handles em relative to the context font size and rem to the root", () => {
        expect(convertToPixels("2em", context)).toBe(20);
        expect(convertToPixels("2rem")).toBe(40);
    });

    it("treats unitless strings as pixels", () => {
        expect(convertToPixels("17")).toBe(17);
    });

    it("tolerates whitespace between number and unit", () => {
        expect(convertToPixels("5 px")).toBe(5);
    });

    it("returns NaN for non-numeric input", () => {
        expect(convertToPixels("auto")).toBeNaN();
    });

    // The unit is found by deleting String(parseFloat(input)) from the input, which fails
    // whenever the number is written with trailing zeros: "1.50em" -> unit "0em".
    it.fails("KNOWN BUG: honours the unit when the number has a trailing zero", () => {
        expect(convertToPixels("1.50em", context)).toBe(15);
    });

    it.fails("KNOWN BUG: honours the unit on '2.50vw'", () => {
        expect(convertToPixels("2.50vw")).toBe(25);
    });
});
