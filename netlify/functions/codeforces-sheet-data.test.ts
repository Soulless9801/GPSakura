import fs from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));

import handler from "../entrypoints/codeforces-sheet-data";

const event = new Request("http://localhost/.netlify/functions/codeforces-sheet-data");
const localCsv = fs.readFileSync(path.resolve("./netlify/functions/data/cfProblems.csv"), "utf8");

describe("codeforces-sheet-data", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    it("returns the Google Sheet as CSV with the delimiter swapped to ';'", async () => {
        vi.mocked(fetch).mockResolvedValue(new Response("a\tb\tc\n1\t2\t3", { status: 200 }));
        const res = await handler(event);
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("text/csv");
        expect(await res.text()).toBe("a;b;c\n1;2;3");
    });

    it("exports the first sheet as TSV", async () => {
        vi.mocked(fetch).mockResolvedValue(new Response("x", { status: 200 }));
        await handler(event);
        const url = String(vi.mocked(fetch).mock.calls[0][0]);
        expect(url).toMatch(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/.+\/export\?format=tsv&gid=0$/);
    });

    it("falls back to the bundled CSV when the sheet answers with an error", async () => {
        vi.mocked(fetch).mockResolvedValue(new Response("forbidden", { status: 403 }));
        const res = await handler(event);
        expect(res.status).toBe(200);
        expect(await res.text()).toBe(localCsv);
    });

    it("falls back to the bundled CSV when the network is down", async () => {
        vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));
        const res = await handler(event);
        expect(await res.text()).toBe(localCsv);
    });

    it("answers 500 when both the sheet and the bundled file are unavailable", async () => {
        vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));
        vi.spyOn(process, "cwd").mockReturnValue("/nonexistent-dir");
        const res = await handler(event);
        expect(res.status).toBe(500);
        expect(res.headers.get("Content-Type")).toBe("application/json");
        expect((await res.json()).error).toMatch(/codeforces-sheet-data: Internal server error/);
    });

    it("every line of the bundled CSV has exactly the four documented columns", () => {
        const lines = localCsv.split(/\r?\n/).filter(Boolean);
        expect(lines[0]).toBe("Rating;Problem Name;Problem Link;Submission");
        for (const line of lines) {expect(line.split(";"), line).toHaveLength(4);}
    });
});
