import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadValue } from "./storage";

class MemoryStorage {
    private data = new Map<string, string>();
    getItem = vi.fn((key: string): string | null => this.data.get(key) ?? null);
    setItem = vi.fn((key: string, value: string): void => {
        this.data.set(key, value);
    });
}

describe("loadValue", () => {
    let storage: MemoryStorage;

    beforeEach(() => {
        storage = new MemoryStorage();
        vi.stubGlobal("localStorage", storage);
    });

    it("returns the default and persists it when nothing is stored", () => {
        expect(loadValue("k", 7)).toBe(7);
        expect(storage.setItem).toHaveBeenCalledWith("k", "7");
    });

    it("returns the stored value parsed from JSON", () => {
        storage.setItem("k", JSON.stringify({ a: [1, 2] }));
        expect(loadValue("k", { a: [] as number[] })).toEqual({ a: [1, 2] });
    });

    it("keeps falsy stored values rather than falling back to the default", () => {
        storage.setItem("zero", "0");
        storage.setItem("no", "false");
        expect(loadValue("zero", 5)).toBe(0);
        expect(loadValue("no", true)).toBe(false);
    });

    it("rewrites the stored value after a successful load", () => {
        storage.setItem("k", "[1]");
        loadValue("k", []);
        expect(storage.setItem).toHaveBeenLastCalledWith("k", "[1]");
    });

    // The demo components call this inside a useState initialiser, so a throw here
    // blanks the whole page.
    it("falls back to the default when the stored JSON is corrupt", () => {
        storage.setItem("k", "{not json");
        expect(loadValue("k", 3)).toBe(3);
        expect(storage.setItem).toHaveBeenLastCalledWith("k", "3");
    });

    it("returns the default when reading storage is blocked", () => {
        storage.getItem.mockImplementation(() => { throw new Error("blocked"); });
        expect(loadValue("k", 3)).toBe(3);
    });

    it("keeps a successful read even when write-back fails", () => {
        storage.setItem("k", "7");
        storage.setItem.mockImplementation(() => { throw new Error("quota"); });
        expect(loadValue("k", 3)).toBe(7);
    });
});
