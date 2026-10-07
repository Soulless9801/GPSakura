// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ably = vi.hoisted(() => ({
    instances: [] as { options: Record<string, unknown>; close: () => void }[],
}));

vi.mock("ably", () => ({
    default: {
        Realtime: class {
            readonly options: Record<string, unknown>;
            readonly close = vi.fn();
            constructor(options: Record<string, unknown>) {
                this.options = options;
                ably.instances.push(this);
            }
        },
    },
}));

import { useAbly } from "./ably";
import type { Identity } from "/src/utils/verify";

const identity = (clientId: string, signature: string): Identity => ({ clientId, signature });

describe("useAbly", () => {
    beforeEach(() => {
        ably.instances.length = 0;
    });

    it("stays disconnected without an identity", () => {
        const { result } = renderHook(() => useAbly({ request: null }));
        expect(result.current).toBeNull();
        expect(ably.instances).toHaveLength(0);
    });

    it.each([
        ["no client id", identity("", "sig")],
        ["no signature", identity("me", "")],
        ["whitespace only", identity("  ", "  ")],
    ])("stays disconnected with %s", (_label, request) => {
        const { result } = renderHook(() => useAbly({ request }));
        expect(result.current).toBeNull();
        expect(ably.instances).toHaveLength(0);
    });

    it("connects through the auth endpoint with the signed identity", () => {
        const { result } = renderHook(() => useAbly({ request: identity("me", "sig") }));
        expect(ably.instances).toHaveLength(1);
        expect(ably.instances[0].options).toEqual({
            authUrl: "/.netlify/functions/ably-auth",
            authParams: { clientId: "me", signature: "sig" },
        });
        expect(result.current).toBe(ably.instances[0]);
    });

    it("trims whitespace from the identity", () => {
        renderHook(() => useAbly({ request: identity(" me ", " sig ") }));
        expect(ably.instances[0].options.authParams).toEqual({ clientId: "me", signature: "sig" });
    });

    it("closes the connection on unmount", () => {
        const { unmount } = renderHook(() => useAbly({ request: identity("me", "sig") }));
        unmount();
        expect(ably.instances[0].close).toHaveBeenCalledTimes(1);
    });

    it("reconnects when the identity changes, closing the old client", () => {
        const { rerender, result } = renderHook(({ request }) => useAbly({ request }), {
            initialProps: { request: identity("me", "sig") },
        });
        rerender({ request: identity("me", "other") });
        expect(ably.instances).toHaveLength(2);
        expect(ably.instances[0].close).toHaveBeenCalledTimes(1);
        expect(result.current).toBe(ably.instances[1]);
    });

    it("does not reconnect when re-rendered with the same identity values", () => {
        const { rerender } = renderHook(({ request }) => useAbly({ request }), {
            initialProps: { request: identity("me", "sig") },
        });
        rerender({ request: identity("me", "sig") });
        expect(ably.instances).toHaveLength(1);
    });

    it("drops the client when the identity goes away", () => {
        const initialProps: { request: Identity | null } = { request: identity("me", "sig") };
        const { rerender, result } = renderHook(({ request }: { request: Identity | null }) => useAbly({ request }), {
            initialProps,
        });
        rerender({ request: null });
        expect(result.current).toBeNull();
        expect(ably.instances[0].close).toHaveBeenCalledTimes(1);
    });
});
