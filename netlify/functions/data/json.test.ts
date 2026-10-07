import { describe, expect, it } from "vitest";

import { errorJSON, successJSON } from "./json";

describe("successJSON", () => {
    it("is a 200 JSON response carrying the payload", () => {
        const res = successJSON({ a: 1 });
        expect(res.statusCode).toBe(200);
        expect(res.headers).toEqual({ "Content-Type": "application/json" });
        expect(JSON.parse(res.body)).toEqual({ a: 1 });
    });

    it("serialises Maps with the shared Map encoding", () => {
        const res = successJSON({ m: new Map([["k", 1]]) });
        expect(JSON.parse(res.body)).toEqual({ m: { dataType: "Map", value: [["k", 1]] } });
    });
});

describe("errorJSON", () => {
    it("defaults to 400 and wraps the message", () => {
        const res = errorJSON("nope");
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body)).toEqual({ error: "nope" });
        expect(res.headers["Content-Type"]).toBe("application/json");
    });

    it("honours an explicit status code", () => {
        expect(errorJSON("denied", 403).statusCode).toBe(403);
        expect(errorJSON("boom", 500).statusCode).toBe(500);
    });
});
