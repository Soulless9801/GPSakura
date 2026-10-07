// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GameRequest } from "/src/services/request";
import type { Identity } from "/src/utils/verify";
import { serialize } from "/src/utils/serial";
import { buildHand, card, craft } from "/src/test/shengji";
import * as advisor from "/src/shengji/advisor/advisor";

const fake = vi.hoisted(() => {
    const presence = {
        get: vi.fn<() => Promise<{ clientId: string; data: { username: string; team: number } }[]>>(),
        enter: vi.fn<() => Promise<void>>(),
        update: vi.fn<() => Promise<void>>(),
        subscribe: vi.fn<(listener: () => void) => Promise<void>>(),
        unsubscribe: vi.fn(),
    };
    const channel = {
        attach: vi.fn<() => Promise<void>>(),
        subscribe: vi.fn<(event: string, listener: (message: { data: { game: string } }) => void) => Promise<void>>(),
        unsubscribe: vi.fn(),
        presence,
    };
    const ably = {
        channels: { get: () => channel },
        connection: { state: "connected", on: vi.fn(), off: vi.fn(), once: vi.fn() },
    };
    return { channel, ably, request: vi.fn<(request: GameRequest) => Promise<string | null>>() };
});

vi.mock("/src/shengji/server/ably", () => ({ useAbly: ({ request }: { request: Identity | null }) => request ? fake.ably : null }));
vi.mock("/src/utils/verify", () => ({ getIdentity: () => Promise.resolve({ clientId: "p0", signature: "test" }), issueIdentity: vi.fn() }));
vi.mock("/src/services/request", () => ({ clientRequest: fake.request }));

import GameRoom from "./GameRoom";

const state = (): ReturnType<typeof craft>["state"] => craft({ hands: {}, overrides: { turn: 0, lead: 0, chu: 0 } }).state;
const present = (ids: string[]): { clientId: string; data: { username: string; team: number } }[] =>
    ids.map((clientId, index) => ({ clientId, data: { username: clientId, team: index % 2 } }));

async function emitState(game = state()): Promise<void> {
    await act(async () => {
        for (const [, listener] of fake.channel.subscribe.mock.calls) {
            listener({ data: { game: serialize(game) } });
        }
        await Promise.resolve();
    });
}

async function emitPresence(ids: string[]): Promise<void> {
    fake.channel.presence.get.mockResolvedValue(present(ids));
    await act(async () => {
        for (const [listener] of fake.channel.presence.subscribe.mock.calls) {listener();}
        await Promise.resolve();
    });
}

async function mount(): Promise<() => void> {
    const { unmount } = render(<GameRoom roomId="test" username="Player" />);
    await waitFor(() => { expect(fake.channel.subscribe).toHaveBeenCalled(); });
    await emitPresence(["p0", "p1", "p2", "p3"]);
    await emitState();
    return unmount;
}

const connections = (): number => fake.request.mock.calls.filter(([request]) => request.action === "connection").length;

beforeEach(() => {
    vi.clearAllMocks();
    fake.channel.attach.mockResolvedValue();
    fake.channel.subscribe.mockResolvedValue();
    fake.channel.presence.subscribe.mockResolvedValue();
    fake.channel.presence.enter.mockResolvedValue();
    fake.channel.presence.update.mockResolvedValue();
    fake.channel.presence.get.mockResolvedValue(present(["p0", "p1", "p2", "p3"]));
    fake.request.mockImplementation(request => Promise.resolve(request.action === "state"
        ? serialize({ game: state() })
        : request.action === "hand" ? serialize({ hand: buildHand([card("hearts", 3)]) }) : "{}"));
});

afterEach(() => { vi.useRealTimers(); });

describe("Shengji room presence", () => {
    it("retries a rate-limited connection update and cancels retries on unmount", async () => {
        const unmount = await mount();
        vi.useFakeTimers();
        fake.request.mockResolvedValue(null);
        await emitPresence(["p0", "p1", "p2"]);
        const before = connections();
        fake.request.mockResolvedValue("{}");
        await act(() => vi.advanceTimersByTimeAsync(1500));
        expect(connections()).toBe(before + 1);
        await act(() => vi.advanceTimersByTimeAsync(3000));
        expect(connections()).toBe(before + 1);
        fake.request.mockResolvedValue(null);
        await emitPresence(["p0", "p1"]);
        const beforeUnmount = connections();
        unmount();
        await act(() => vi.advanceTimersByTimeAsync(3000));
        expect(connections()).toBe(beforeUnmount);
    });

    it("does not overwrite a live update with a slower initial state response", async () => {
        let resolveState: (value: string) => void = () => undefined;
        fake.request.mockImplementation(request => request.action === "state"
            ? new Promise<string>(resolve => { resolveState = resolve; }) : Promise.resolve("{}"));
        render(<GameRoom roomId="test" username="Player" />);
        await waitFor(() => { expect(fake.request.mock.calls.some(([request]) => request.action === "state")).toBe(true); });
        await emitState({ ...state(), paused: true });
        await act(async () => {
            resolveState(serialize({ game: state() }));
            await Promise.resolve();
        });
        expect(screen.getByRole<HTMLButtonElement>("button", { name: "Play Cards" }).disabled).toBe(true);
    });

    it("loads the game on joining even when connection does not broadcast", async () => {
        render(<GameRoom roomId="test" username="Player" />);
        await screen.findByRole("button", { name: "Play Cards" });
        expect(fake.request.mock.calls.some(([request]) => request.action === "state")).toBe(true);
    });

    it("sends once per presence change and resumes when the missing player returns", async () => {
        await mount();
        const before = connections();
        await emitPresence(["p0", "p1", "p2"]);
        expect(connections()).toBe(before + 1);
        const paused = { ...state(), paused: true };
        await emitState(paused);
        await emitState(paused);
        await emitPresence(["p2", "p1", "p0"]);
        expect(connections()).toBe(before + 1);
        await emitPresence(["p0", "p1", "p2", "p3"]);
        expect(connections()).toBe(before + 2);
    });

    it("receives game updates even if entering presence fails", async () => {
        fake.channel.presence.enter.mockRejectedValue(new Error("offline"));
        await mount();
        expect(screen.getByRole("button", { name: "Play Cards" })).toBeTruthy();
    });
});

describe("Shengji advice", () => {
    it("uses the latest hand when help is enabled or the hand is refreshed", async () => {
        const analyse = vi.spyOn(advisor, "analyse");
        await mount();
        fireEvent.click(screen.getByRole("button", { name: "Refresh Hand" }));
        await screen.findByRole("button", { name: "3hearts" });
        fireEvent.click(screen.getByRole("button", { name: "Toggle Help" }));
        await waitFor(() => { expect(analyse).toHaveBeenCalled(); });
        expect(analyse.mock.lastCall?.[0].hand).toEqual([card("hearts", 3)]);

        fake.request.mockResolvedValue(serialize({ hand: buildHand([card("clubs", 9)]) }));
        fireEvent.click(screen.getByRole("button", { name: "Refresh Hand" }));
        await waitFor(() => { expect(analyse.mock.lastCall?.[0].hand).toEqual([card("clubs", 9)]); });
        await emitState({ ...state(), turn: 1 });
        expect(screen.getByText("No advice available")).toBeTruthy();
    });

    it("builds the current trick from its first player and clears it on a new lead", async () => {
        const analyse = vi.spyOn(advisor, "analyse");
        await mount();
        fireEvent.click(screen.getByRole("button", { name: "Refresh Hand" }));
        await screen.findByRole("button", { name: "3hearts" });
        fireEvent.click(screen.getByRole("button", { name: "Toggle Help" }));
        const game = state();
        game.chu = 2;
        game.lead = 3;
        const p2 = game.info.get("p2");
        const p3 = game.info.get("p3");
        if (!p2 || !p3) {throw new Error("Missing seats");}
        p2.play = { cards: [card("hearts", 5)], suit: null };
        p3.play = { cards: [card("hearts", 9)], suit: null };
        await emitState(game);
        expect(analyse.mock.lastCall?.[0].trick).toEqual([p2.play.cards, p3.play.cards]);
        await emitState({ ...game, chu: 0, lead: 0 });
        expect(analyse.mock.lastCall?.[0].trick).toEqual([]);
    });
});
