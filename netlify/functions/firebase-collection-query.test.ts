import fs from "node:fs";
import path from "node:path";

import type { HandlerEvent } from "@netlify/functions";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));

const fb = vi.hoisted(() => {
    class Timestamp {
        constructor(private readonly ms: number) {}
        toDate(): Date {
            return new Date(this.ms);
        }
    }
    return {
        Timestamp,
        getApps: vi.fn(() => [] as unknown[]),
        initializeApp: vi.fn(() => ({ name: "app" })),
        getApp: vi.fn(() => ({ name: "existing" })),
        getFirestore: vi.fn(() => ({ db: true })),
        collection: vi.fn((_db: unknown, name: string) => ({ collection: name })),
        query: vi.fn((c: unknown) => c),
        getDocs: vi.fn(),
    };
});

vi.mock("firebase/app", () => ({
    getApps: fb.getApps,
    initializeApp: fb.initializeApp,
    getApp: fb.getApp,
}));
vi.mock("firebase/firestore", () => ({
    Timestamp: fb.Timestamp,
    getFirestore: fb.getFirestore,
    collection: fb.collection,
    query: fb.query,
    getDocs: fb.getDocs,
}));

import { handler } from "./firebase-collection-query";

const post = (body: unknown): HandlerEvent => ({ body: JSON.stringify(body) }) as HandlerEvent;

const snapshot = (docs: { id: string; data: () => Record<string, unknown> }[]) => ({
    empty: docs.length === 0,
    docs,
});

const parse = (res: { body: string }): unknown => JSON.parse(res.body);

describe("firebase-collection-query", () => {
    beforeEach(() => {
        fb.getApps.mockReturnValue([]);
        fb.getDocs.mockReset();
    });

    describe("live Firestore", () => {
        it("returns every document with its id merged in", async () => {
            fb.getDocs.mockResolvedValue(
                snapshot([
                    { id: "a", data: () => ({ title: "A" }) },
                    { id: "b", data: () => ({ title: "B" }) },
                ]),
            );
            const res = await handler(post({ col: "blogPosts", loc: "firebaseBlogPosts" }));
            expect(res.statusCode).toBe(200);
            expect(parse(res)).toEqual([
                { id: "a", title: "A" },
                { id: "b", title: "B" },
            ]);
        });

        it("queries the requested collection", async () => {
            fb.getDocs.mockResolvedValue(snapshot([{ id: "a", data: () => ({}) }]));
            await handler(post({ col: "blogPosts", loc: "x" }));
            expect(fb.collection).toHaveBeenCalledWith(expect.anything(), "blogPosts");
        });

        it("converts Firestore Timestamps to ISO strings", async () => {
            fb.getDocs.mockResolvedValue(
                snapshot([{ id: "a", data: () => ({ created: new fb.Timestamp(Date.UTC(2024, 0, 2, 3, 4, 5)), n: 1 }) }]),
            );
            const [doc] = parse(await handler(post({ col: "c", loc: "x" }))) as Record<string, unknown>[];
            expect(doc.created).toBe("2024-01-02T03:04:05.000Z");
            expect(doc.n).toBe(1);
        });

        it("narrows to one document by id, or null when it does not exist", async () => {
            fb.getDocs.mockResolvedValue(
                snapshot([
                    { id: "a", data: () => ({ t: 1 }) },
                    { id: "b", data: () => ({ t: 2 }) },
                ]),
            );
            expect(parse(await handler(post({ col: "c", loc: "x", id: "b" })))).toEqual({ id: "b", t: 2 });
            expect(parse(await handler(post({ col: "c", loc: "x", id: "zzz" })))).toBeNull();
        });

        it("initialises Firebase once and reuses the app afterwards", async () => {
            fb.initializeApp.mockClear();
            fb.getApp.mockClear();
            fb.getDocs.mockResolvedValue(snapshot([{ id: "a", data: () => ({}) }]));

            fb.getApps.mockReturnValue([]);
            await handler(post({ col: "c", loc: "x" }));
            expect(fb.initializeApp).toHaveBeenCalledTimes(1);

            fb.getApps.mockReturnValue([{}]);
            await handler(post({ col: "c", loc: "x" }));
            expect(fb.initializeApp).toHaveBeenCalledTimes(1);
            expect(fb.getApp).toHaveBeenCalledTimes(1);
        });
    });

    describe("local fallback", () => {
        const local = (name: string): unknown =>
            JSON.parse(fs.readFileSync(path.resolve(`./netlify/functions/data/${name}.json`), "utf8"));

        it("serves the bundled file when the collection is empty", async () => {
            fb.getDocs.mockResolvedValue(snapshot([]));
            const res = await handler(post({ col: "blogPosts", loc: "firebaseBlogPosts" }));
            expect(res.statusCode).toBe(200);
            expect(parse(res)).toEqual(local("firebaseBlogPosts"));
        });

        it("serves the bundled file when Firestore throws", async () => {
            fb.getDocs.mockRejectedValue(new Error("permission-denied"));
            const res = await handler(post({ col: "usaco", loc: "firebaseUSACOProblems" }));
            expect(parse(res)).toEqual(local("firebaseUSACOProblems"));
        });

        it("still supports narrowing by id in the fallback", async () => {
            fb.getDocs.mockRejectedValue(new Error("offline"));
            const all = local("firebaseBlogPosts") as { id: string }[];
            const res = await handler(post({ col: "c", loc: "firebaseBlogPosts", id: all[0].id }));
            expect(parse(res)).toEqual(all[0]);
        });

        it("answers 500 naming the fallback problem when the bundled file is missing", async () => {
            fb.getDocs.mockRejectedValue(new Error("offline"));
            const res = await handler(post({ col: "c", loc: "doesNotExist" }));
            expect(res.statusCode).toBe(500);
            expect((parse(res) as { error: string }).error).toMatch(/firebase-collection-query: Error fetching collection/);
        });

        it("trims whitespace from the parameters", async () => {
            fb.getDocs.mockRejectedValue(new Error("offline"));
            const res = await handler(post({ col: " c ", loc: " firebaseBlogPosts " }));
            expect(res.statusCode).toBe(200);
        });

        // `loc` used to be spliced into a file path unchecked, so `../` walked out of the data
        // directory and returned any .json file in the repository.
        it.each([
            ["../../../package"],
            ["../../package"],
            ["..%2F..%2Fpackage"],
            ["..\\..\\package"],
            ["/etc/passwd"],
            ["firebaseBlogPosts/../../../../package"],
            ["firebaseBlogPosts.json"],
            ["data/firebaseBlogPosts"],
            ["a b"],
            [""],
        ])("rejects the unsafe loc %j with 400 and reads no file", async (loc) => {
            fb.getDocs.mockRejectedValue(new Error("offline"));
            const read = vi.spyOn(fs, "readFileSync");
            const res = await handler(post({ col: "c", loc }));
            expect(res.statusCode).toBe(400);
            expect((parse(res) as { error: string }).error).toMatch(/Invalid loc/);
            expect(read).not.toHaveBeenCalled();
        });

        it("SECURITY: a traversal does not return repository files", async () => {
            fb.getDocs.mockRejectedValue(new Error("offline"));
            const res = await handler(post({ col: "c", loc: "../../../package" }));
            expect(res.body).not.toContain("gpsakura");
        });

        it("only reads from inside the data directory", async () => {
            fb.getDocs.mockRejectedValue(new Error("offline"));
            const read = vi.spyOn(fs, "readFileSync");
            await handler(post({ col: "c", loc: "firebaseBlogPosts" }));
            expect(read).toHaveBeenCalledTimes(1);
            expect(String(read.mock.calls[0][0])).toBe(path.resolve("./netlify/functions/data/firebaseBlogPosts.json"));
        });

        it("accepts names with digits, dashes and underscores", async () => {
            fb.getDocs.mockRejectedValue(new Error("offline"));
            const res = await handler(post({ col: "c", loc: "no-such_file2" }));
            expect(res.statusCode).toBe(500); // passed validation, then the file is simply missing
        });

        it("does not validate `loc` when Firestore answers (it is only used for the fallback)", async () => {
            fb.getDocs.mockResolvedValue(snapshot([{ id: "a", data: () => ({}) }]));
            const res = await handler(post({ col: "c", loc: "../../etc/passwd" }));
            expect(res.statusCode).toBe(200);
        });
    });

    describe("bad requests", () => {
        // JSON.parse sits outside the try block, so a bad body rejects the whole handler.
        it.fails("KNOWN BUG: malformed JSON is answered with a 4xx response", async () => {
            const res = await handler({ body: "{oops" } as HandlerEvent);
            expect(res.statusCode).toBe(400);
        });

        it("an empty body queries the empty collection and is rejected for having no loc", async () => {
            fb.getDocs.mockRejectedValue(new Error("bad collection"));
            const res = await handler({ body: null } as HandlerEvent);
            expect(res.statusCode).toBe(400);
        });
    });
});
