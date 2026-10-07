import { describe, expect, it } from "vitest";

import { deserialize, serialize } from "./serial";

describe("serialize / deserialize", () => {
    it("round-trips plain JSON", () => {
        const value = { a: 1, b: "two", c: [true, null], d: { e: 1.5 } };
        expect(deserialize(serialize(value))).toEqual(value);
    });

    it("round-trips a Map", () => {
        const map = new Map<string, number>([["x", 1], ["y", 2]]);
        const back = deserialize<Map<string, number>>(serialize(map));
        expect(back).toBeInstanceOf(Map);
        expect([...back.entries()]).toEqual([["x", 1], ["y", 2]]);
    });

    it("round-trips Maps nested in objects, arrays and other Maps", () => {
        const inner = new Map<string, number>([["k", 1]]);
        const value = {
            list: [inner],
            outer: new Map<string, Map<string, number>>([["in", inner]]),
        };
        const back = deserialize<typeof value>(serialize(value));
        expect(back.list[0]).toBeInstanceOf(Map);
        expect(back.outer.get("in")?.get("k")).toBe(1);
    });

    it("encodes a Map with the dataType marker", () => {
        expect(JSON.parse(serialize(new Map([["a", 1]])))).toEqual({
            dataType: "Map",
            value: [["a", 1]],
        });
    });

    it("preserves non-string Map keys", () => {
        const back = deserialize<Map<number, string>>(serialize(new Map([[1, "a"], [2, "b"]])));
        expect(back.get(1)).toBe("a");
        expect(back.get(2)).toBe("b");
    });

    it("leaves ordinary objects with similar keys alone", () => {
        const value = { dataType: "Map", value: "not-an-array" };
        expect(deserialize(serialize(value))).toEqual(value);
        expect(deserialize(serialize({ dataType: "Set", value: [] }))).toEqual({ dataType: "Set", value: [] });
    });

    it("throws on malformed JSON", () => {
        expect(() => deserialize("{nope")).toThrow(SyntaxError);
    });

    it("deserializes null and primitives", () => {
        expect(deserialize("null")).toBeNull();
        expect(deserialize("42")).toBe(42);
    });

    // Because the marker is plain data, any JSON a client sends that has the right shape
    // becomes a Map on the server (e.g. in the game-room request body).
    it("turns any attacker-supplied {dataType:'Map'} object into a Map", () => {
        const parsed = deserialize<unknown>('{"dataType":"Map","value":[["a",1]]}');
        expect(parsed).toBeInstanceOf(Map);
    });
});
