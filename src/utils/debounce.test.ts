import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { debounce } from "./debounce";

describe("debounce", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it("only fires once after the delay with the last arguments", () => {
        const spy = vi.fn<(value: number) => void>();
        const debounced = debounce(spy, 100);

        debounced(1);
        debounced(2);
        debounced(3);
        expect(spy).not.toHaveBeenCalled();

        vi.advanceTimersByTime(99);
        expect(spy).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(3);
    });

    it("restarts the timer on every call", () => {
        const spy = vi.fn<() => void>();
        const debounced = debounce(spy, 100);

        debounced();
        vi.advanceTimersByTime(80);
        debounced();
        vi.advanceTimersByTime(80);
        expect(spy).not.toHaveBeenCalled();
        vi.advanceTimersByTime(20);
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it("can fire again after a quiet period", () => {
        const spy = vi.fn<(value: string) => void>();
        const debounced = debounce(spy, 10);

        debounced("a");
        vi.advanceTimersByTime(10);
        debounced("b");
        vi.advanceTimersByTime(10);

        expect(spy.mock.calls).toEqual([["a"], ["b"]]);
    });

    it("cancel() drops a pending call", () => {
        const spy = vi.fn<() => void>();
        const debounced = debounce(spy, 10);

        debounced();
        debounced.cancel();
        vi.advanceTimersByTime(1000);
        expect(spy).not.toHaveBeenCalled();
    });

    it("cancel() with nothing pending is harmless", () => {
        const debounced = debounce(() => undefined, 10);
        expect(() => {
            debounced.cancel();
        }).not.toThrow();
    });
});
