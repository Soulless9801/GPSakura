import { describe, expect, it } from "vitest";

import { formatDate } from "./time";

describe("formatDate", () => {
    const expected = (date: Date): string =>
        date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

    it("accepts a Date, an ISO string and an epoch number equivalently", () => {
        const date = new Date("2024-03-05T14:30:00Z");
        expect(formatDate(date)).toBe(expected(date));
        expect(formatDate(date.toISOString())).toBe(expected(date));
        expect(formatDate(date.getTime())).toBe(expected(date));
    });

    it("includes the year and a time of day", () => {
        const out = formatDate(new Date(2024, 2, 5, 14, 30));
        expect(out).toMatch(/2024/);
        expect(out).toMatch(/\d{1,2}:\d{2}/);
    });

    it("renders an invalid date as 'Invalid Date' instead of throwing", () => {
        expect(formatDate("not a date")).toBe("Invalid Date");
    });
});
