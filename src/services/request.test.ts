import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clientRequest } from "./request";

interface FakeButton {
    disabled: boolean;
}

describe("clientRequest", () => {
    let buttons: FakeButton[];
    let querySelectorAll: ReturnType<typeof vi.fn>;
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers();
        buttons = [{ disabled: false }, { disabled: false }];
        querySelectorAll = vi.fn(() => buttons);
        fetchMock = vi.fn(() => Promise.resolve(new Response("payload", { status: 200 })));
        vi.stubGlobal("document", { querySelectorAll });
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("POSTs the JSON body to the named Netlify function", async () => {
        await clientRequest({ payload: { a: 1 } }, "btn", "my-fn");

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("/.netlify/functions/my-fn");
        expect(init.method).toBe("POST");
        expect(init.headers).toEqual({ "Content-Type": "application/json" });
        expect(JSON.parse(init.body as string)).toEqual({ payload: { a: 1 } });
    });

    it("returns the response text", async () => {
        expect(await clientRequest({}, "btn", "fn")).toBe("payload");
    });

    it("returns null on a non-2xx response", async () => {
        fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }));
        expect(await clientRequest({}, "btn", "fn")).toBeNull();
    });

    it("selects buttons by class and disables them immediately", async () => {
        await clientRequest({}, "my-class", "fn");
        expect(querySelectorAll).toHaveBeenCalledWith(".my-class");
        expect(buttons.every((b) => b.disabled)).toBe(true);
    });

    it("re-enables the buttons after one second", async () => {
        await clientRequest({}, "btn", "fn");
        vi.advanceTimersByTime(999);
        expect(buttons.every((b) => b.disabled)).toBe(true);
        vi.advanceTimersByTime(1);
        expect(buttons.every((b) => !b.disabled)).toBe(true);
    });

    it("propagates network errors, and still re-enables the buttons", async () => {
        fetchMock.mockRejectedValueOnce(new Error("offline"));
        await expect(clientRequest({}, "btn", "fn")).rejects.toThrow("offline");
        vi.advanceTimersByTime(1000);
        expect(buttons.every((b) => !b.disabled)).toBe(true);
    });
});
