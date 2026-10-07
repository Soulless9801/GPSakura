// @vitest-environment jsdom
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Slider from "./Slider";

/** make the 200px-wide track start at x = 100 */
function stubTrack(container: HTMLElement): void {
    const track = container.querySelector(".customSliderTrack") as HTMLElement;
    track.getBoundingClientRect = () => ({ left: 100, width: 200, right: 300, top: 0, bottom: 10, height: 10, x: 100, y: 0, toJSON: () => ({}) });
}

const wrapper = (c: HTMLElement): HTMLElement => c.querySelector(".customSliderTrackWrapper") as HTMLElement;
const active = (c: HTMLElement): string => (c.querySelector(".customSliderTrackActive") as HTMLElement).style.width;
const field = (): HTMLInputElement => screen.getByRole<HTMLInputElement>("textbox");

describe("Slider", () => {
    it("shows its initial value, label and unit", () => {
        const { container } = render(<Slider min={0} max={100} value={25} label="Speed" unit="px" />);
        expect(field().value).toBe("25");
        expect(screen.getByText("Speed")).toBeTruthy();
        expect(screen.getByText("px")).toBeTruthy();
        expect(active(container)).toBe("25%");
    });

    it("can hide the numeric field", () => {
        render(<Slider min={0} max={100} value={25} form={false} />);
        expect(screen.queryByRole("textbox")).toBeNull();
    });

    it("reports its starting value on mount", () => {
        const onChange = vi.fn();
        render(<Slider min={0} max={100} value={25} onChange={onChange} />);
        expect(onChange).toHaveBeenCalledWith(25);
    });

    it("maps a press on the track to a value", () => {
        const onChange = vi.fn();
        const { container } = render(<Slider min={0} max={100} value={0} onChange={onChange} />);
        stubTrack(container);
        fireEvent.pointerDown(wrapper(container), { clientX: 200 });
        expect(onChange).toHaveBeenLastCalledWith(50);
        expect(field().value).toBe("50");
        expect(active(container)).toBe("50%");
    });

    it("follows the pointer while dragging and stops on release", () => {
        const onChange = vi.fn();
        const { container } = render(<Slider min={0} max={100} value={0} onChange={onChange} />);
        stubTrack(container);
        fireEvent.pointerDown(wrapper(container), { clientX: 100 });
        fireEvent.pointerMove(window, { clientX: 250 });
        expect(onChange).toHaveBeenLastCalledWith(75);

        fireEvent.pointerUp(window);
        fireEvent.pointerMove(window, { clientX: 300 });
        expect(onChange).toHaveBeenLastCalledWith(75);
    });

    it("clamps a drag past either end", () => {
        const { container } = render(<Slider min={10} max={20} value={15} />);
        stubTrack(container);
        fireEvent.pointerDown(wrapper(container), { clientX: 5000 });
        expect(field().value).toBe("20");
        fireEvent.pointerMove(window, { clientX: -5000 });
        expect(field().value).toBe("10");
    });

    it("snaps to the step", () => {
        const { container } = render(<Slider min={0} max={100} value={0} step={10} />);
        stubTrack(container);
        fireEvent.pointerDown(wrapper(container), { clientX: 100 + 200 * 0.37 });
        expect(field().value).toBe("40");
    });

    it("ignores the pointer when disabled", () => {
        const { container } = render(<Slider min={0} max={100} value={30} disabled />);
        stubTrack(container);
        fireEvent.pointerDown(wrapper(container), { clientX: 300 });
        expect(field().value).toBe("30");
    });

    it("follows a changed `value` prop", () => {
        const { container, rerender } = render(<Slider min={0} max={100} value={10} />);
        rerender(<Slider min={0} max={100} value={60} />);
        expect(field().value).toBe("60");
        expect(active(container)).toBe("60%");
    });

    it("typing in the field moves the track (when the parent echoes the value back)", () => {
        function Parent() {
            const [value, setValue] = useState(10);
            return <Slider min={0} max={100} value={value} onChange={setValue} />;
        }
        const { container } = render(<Parent />);
        fireEvent.focus(field());
        fireEvent.change(field(), { target: { value: "80" } });
        fireEvent.focusOut(field());
        expect(active(container)).toBe("80%");
    });

    // The numeric field only updates `internalValue`; the track percentage is recomputed in
    // updateValue, which the field's onChange never calls. Only a parent that feeds the value
    // back through the `value` prop re-syncs it.
    it.fails("KNOWN BUG: typing in the field moves the track even when the parent is static", () => {
        const { container } = render(<Slider min={0} max={100} value={10} />);
        fireEvent.focus(field());
        fireEvent.change(field(), { target: { value: "80" } });
        fireEvent.focusOut(field());
        expect(active(container)).toBe("80%");
    });
});
