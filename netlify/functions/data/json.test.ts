import { describe, expect, it } from "vitest";

import { errorJSON, successJSON } from "./json";

describe("successJSON", () => {
    it("is a 200 JSON response carrying the payload", async () => {
        const res = successJSON({ a: 1 });
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("application/json");
        expect(await res.json()).toEqual({ a: 1 });
    });

    it("serialises Maps with the shared Map encoding", async () => {
        const res = successJSON({ m: new Map([["k", 1]]) });
        expect(await res.json()).toEqual({ m: { dataType: "Map", value: [["k", 1]] } });
    });
});

describe("errorJSON", () => {
    it("defaults to 400 and wraps the message", async () => {
        const res = errorJSON("nope");
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: "nope" });
        expect(res.headers.get("Content-Type")).toBe("application/json");
    });

    it("honours an explicit status code", () => {
        expect(errorJSON("denied", 403).status).toBe(403);
        expect(errorJSON("boom", 500).status).toBe(500);
    });
});
