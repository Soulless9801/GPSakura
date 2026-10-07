// @vitest-environment jsdom
import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Form from "./Form";

const input = (): HTMLInputElement => screen.getByRole<HTMLInputElement>("textbox");

/** type a value and leave the field, as a user does */
function enter(text: string): void {
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: text } });
    fireEvent.focusOut(input());
}

describe("Form", () => {
    it("shows the initial value", () => {
        render(<Form init={5} min={0} max={10} />);
        expect(input().value).toBe("5");
    });

    it("reports the initial value once on mount by default", () => {
        const onChange = vi.fn();
        render(<Form init={5} min={0} max={10} onChange={onChange} />);
        expect(onChange.mock.calls).toEqual([[5]]);
    });

    it("stays quiet on mount when notifyOnInitChange is false", () => {
        const onChange = vi.fn();
        render(<Form init={5} min={0} max={10} onChange={onChange} notifyOnInitChange={false} />);
        expect(onChange).not.toHaveBeenCalled();
    });

    it("commits typed input on blur", () => {
        const onChange = vi.fn();
        render(<Form init={5} min={0} max={10} onChange={onChange} />);
        enter("7");
        expect(onChange).toHaveBeenLastCalledWith(7);
        expect(input().value).toBe("7");
    });

    it("clamps to the range", () => {
        render(<Form init={5} min={0} max={10} />);
        enter("99");
        expect(input().value).toBe("10");
        enter("-4");
        expect(input().value).toBe("0");
    });

    it("rounds to the step and to the requested decimal places", () => {
        render(<Form init={1} min={0} max={10} step={0.5} places={1} />);
        enter("2.3");
        expect(input().value).toBe("2.5");
    });

    it("reverts garbage input to the last good value", () => {
        render(<Form init={5} min={0} max={10} />);
        enter("abc");
        expect(input().value).toBe("5");
    });

    it("moves by one step with the arrow keys while focused", () => {
        const onChange = vi.fn();
        render(<Form init={4} min={0} max={10} step={2} onChange={onChange} />);
        fireEvent.focus(input());
        fireEvent.keyDown(input(), { key: "ArrowUp" });
        expect(input().value).toBe("6");
        fireEvent.keyDown(input(), { key: "ArrowDown" });
        fireEvent.keyDown(input(), { key: "ArrowDown" });
        expect(input().value).toBe("2");
    });

    it("snaps values onto the step grid (multiples of the step, counted from zero)", () => {
        render(<Form init={5} min={0} max={20} step={2} />);
        expect(input().value).toBe("6");
    });

    // Snapping happens after clamping, so a value that rounds up can leave the range.
    it("never shows a value above max", () => {
        render(<Form init={5} min={0} max={5} step={2} />);
        expect(Number(input().value)).toBeLessThanOrEqual(5);
    });

    it("ignores the arrow keys when disabled", () => {
        render(<Form init={5} min={0} max={10} disabled />);
        fireEvent.keyDown(input(), { key: "ArrowUp" });
        expect(input().value).toBe("5");
    });

    it("the ▲ and ▼ buttons step the value", () => {
        render(<Form init={5} min={0} max={10} />);
        fireEvent.pointerDown(screen.getByText("▲"));
        fireEvent.pointerUp(screen.getByText("▲"));
        expect(input().value).toBe("6");
        fireEvent.pointerDown(screen.getByText("▼"));
        fireEvent.pointerUp(screen.getByText("▼"));
        expect(input().value).toBe("5");
    });

    it("follows a changed `init`", () => {
        const { rerender } = render(<Form init={5} min={0} max={10} />);
        rerender(<Form init={8} min={0} max={10} />);
        expect(input().value).toBe("8");
    });

    it("re-clamps when the range shrinks", () => {
        const { rerender } = render(<Form init={9} min={0} max={10} />);
        rerender(<Form init={9} min={0} max={5} />);
        expect(input().value).toBe("5");
    });

    it("uses changed step props while focused and keeps an edited value when bounds change", () => {
        const { rerender } = render(<Form init={2} min={0} max={20} />);
        enter("8");
        rerender(<Form init={2} min={0} max={10} step={2} />);
        expect(input().value).toBe("8");
        fireEvent.focus(input());
        fireEvent.keyDown(input(), { key: "ArrowUp" });
        expect(input().value).toBe("10");
    });

    it("silently follows an external init change without swallowing the next edit", () => {
        const onChange = vi.fn();
        const { rerender } = render(<Form init={2} min={0} max={10} notifyOnInitChange={false} onChange={onChange} />);
        rerender(<Form init={7} min={0} max={10} notifyOnInitChange={false} onChange={onChange} />);
        expect(input().value).toBe("7");
        expect(onChange).not.toHaveBeenCalled();
        enter("8");
        expect(onChange.mock.calls).toEqual([[8]]);
    });

    it("normalizes the draft even when clamping leaves the committed value unchanged", () => {
        render(<Form init={5} min={0} max={5} step={2} />);
        enter("100");
        expect(input().value).toBe("5");
    });

    describe("holding a button", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });
        afterEach(() => {
            vi.useRealTimers();
        });

        it("clears pending repeats when unmounted or the pointer is cancelled", () => {
            const { unmount } = render(<Form init={0} min={0} max={100} />);
            fireEvent.pointerDown(screen.getByText("▲"));
            fireEvent.pointerCancel(screen.getByText("▲"));
            expect(vi.getTimerCount()).toBe(0);
            fireEvent.pointerDown(screen.getByText("▲"));
            act(() => { vi.advanceTimersByTime(600); });
            unmount();
            expect(vi.getTimerCount()).toBe(0);
        });

        it("repeats after half a second, every 30ms, until released", () => {
            render(<Form init={0} min={0} max={1000} />);
            fireEvent.pointerDown(screen.getByText("▲"));
            expect(input().value).toBe("1");

            act(() => {
                vi.advanceTimersByTime(499);
            });
            expect(input().value).toBe("1");

            act(() => {
                vi.advanceTimersByTime(1 + 30 * 4);
            });
            expect(input().value).toBe("5");

            fireEvent.pointerUp(screen.getByText("▲"));
            act(() => {
                vi.advanceTimersByTime(1000);
            });
            expect(input().value).toBe("5");
        });

        it("a disabled form does not start a hold", () => {
            render(<Form init={3} min={0} max={10} disabled />);
            fireEvent.pointerDown(screen.getByText("▲"));
            act(() => {
                vi.advanceTimersByTime(2000);
            });
            expect(input().value).toBe("3");
        });
    });

    // Slider and ColorSelector use <Form notifyOnInitChange={false}> bound to parent state:
    // the parent echoes each reported value back as `init`, which re-arms a skip flag that
    // nothing consumes (the echo does not change `value`), so the *next* user edit is swallowed.
    describe("controlled by a parent that echoes the value back", () => {
        function Parent({ seen }: { seen: number[] }) {
            const [value, setValue] = useState(50);
            return (
                <Form
                    init={value}
                    min={0}
                    max={255}
                    notifyOnInitChange={false}
                    onChange={(v) => {
                        seen.push(v);
                        setValue(v);
                    }}
                />
            );
        }

        it("reports the first edit", () => {
            const seen: number[] = [];
            render(<Parent seen={seen} />);
            enter("100");
            expect(seen).toEqual([100]);
        });

        it("reports the second edit as well", () => {
            const seen: number[] = [];
            render(<Parent seen={seen} />);
            enter("100");
            enter("150");
            expect(seen).toEqual([100, 150]);
        });
    });
});
