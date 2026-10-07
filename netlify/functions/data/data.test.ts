import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/** Shape checks on the offline fallback data the Firebase function serves. */
function load(name: string): Record<string, unknown>[] {
    const raw = fs.readFileSync(path.resolve(`./netlify/functions/data/${name}.json`), "utf8");
    return JSON.parse(raw) as Record<string, unknown>[];
}

const collections: Record<string, string[]> = {
    firebaseBlogPosts: ["id", "title", "body", "created", "updated"],
    firebaseProblemData: ["id", "title", "created", "updated"],
    firebaseUSACOProblems: ["id", "title", "link", "division"],
};

describe.each(Object.entries(collections))("%s.json", (name, fields) => {
    const rows = load(name);

    it("is a non-empty array", () => {
        expect(Array.isArray(rows)).toBe(true);
        expect(rows.length).toBeGreaterThan(0);
    });

    it("has unique ids", () => {
        const ids = rows.map((r) => r.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("every row carries the fields the UI reads", () => {
        for (const row of rows) {
            for (const field of fields) {expect(row, `${String(row.id)}.${field}`).toHaveProperty(field);}
        }
    });

    it("timestamps are ISO-8601 strings (Firestore Timestamps are converted to the same)", () => {
        for (const row of rows) {
            for (const key of ["created", "updated"]) {
                if (!(key in row)) {continue;}
                expect(typeof row[key]).toBe("string");
                expect(Number.isNaN(Date.parse(row[key] as string)), `${String(row.id)}.${key}`).toBe(false);
            }
        }
    });
});

describe("USACO problems", () => {
    it("link to a web URL", () => {
        for (const row of load("firebaseUSACOProblems")) {
            expect(String(row.link)).toMatch(/^https?:\/\//);
        }
    });
});
