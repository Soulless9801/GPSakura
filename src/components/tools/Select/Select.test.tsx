// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Select from "./Select";
import type { SelectOption } from "./Select";

const options: SelectOption[] = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
    { value: "c", label: "Gamma" },
];

const selected = (container: HTMLElement): string => container.querySelector(".customSelectSelected")?.textContent ?? "";

describe("Select", () => {
    it("starts on the option matching defaultValue", () => {
        const { container } = render(<Select options={options} defaultValue="b" onChange={vi.fn()} />);
        expect(selected(container)).toContain("Beta");
    });

    it("falls back to defaultIndex when defaultValue matches nothing", () => {
        const { container } = render(<Select options={options} defaultValue="zzz" defaultIndex={2} onChange={vi.fn()} />);
        expect(selected(container)).toContain("Gamma");
    });

    it("starts on the first option by default", () => {
        const { container } = render(<Select options={options} onChange={vi.fn()} />);
        expect(selected(container)).toContain("Alpha");
    });

    it("reports the initial option through onChange on mount", () => {
        const onChange = vi.fn();
        render(<Select options={options} defaultValue="b" onChange={onChange} />);
        expect(onChange).toHaveBeenCalledWith(options[1]);
    });

    it("picking an option updates the label and reports it", () => {
        const onChange = vi.fn();
        const { container } = render(<Select options={options} onChange={onChange} />);
        fireEvent.click(screen.getByText("Gamma"));
        expect(onChange).toHaveBeenLastCalledWith(options[2]);
        expect(selected(container)).toContain("Gamma");
    });

    it("marks the chosen option as selected", () => {
        render(<Select options={options} defaultValue="b" onChange={vi.fn()} />);
        expect(screen.getByText("Beta", { selector: ".customSelectOption" }).className).toMatch(/selected/);
        expect(screen.getByText("Alpha", { selector: ".customSelectOption" }).className).not.toMatch(/selected/);
    });

    it("opens on click and shows the menu", () => {
        const { container } = render(<Select options={options} onChange={vi.fn()} />);
        const menu = container.querySelector(".customSelectOptions");
        expect(menu?.className).not.toMatch(/\bshow\b/);
        fireEvent.click(container.querySelector(".customSelectSelected") as Element);
        expect(menu?.className).toMatch(/\bshow\b/);
    });

    it("closes when the user presses outside", () => {
        const { container } = render(<Select options={options} onChange={vi.fn()} />);
        fireEvent.click(container.querySelector(".customSelectSelected") as Element);
        fireEvent.pointerDown(document.body);
        expect(container.querySelector(".customSelectOptions")?.className).not.toMatch(/\bshow\b/);
    });

    it("a fixed select shows its placeholder and does not report on mount", () => {
        const onChange = vi.fn();
        const { container } = render(<Select options={options} fixedSelect placeholder="Menu" onChange={onChange} />);
        expect(selected(container)).toContain("Menu");
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText("Beta"));
        expect(onChange).toHaveBeenCalledWith(options[1]);
        expect(selected(container)).toContain("Menu"); // the placeholder stays
    });

    it("renders the side labels", () => {
        render(<Select options={options} labelL="left" labelR="right" onChange={vi.fn()} />);
        expect(screen.getByText("left")).toBeTruthy();
        expect(screen.getByText("right")).toBeTruthy();
    });

    it("removes its document listener on unmount", () => {
        const remove = vi.spyOn(document, "removeEventListener");
        const { unmount } = render(<Select options={options} onChange={vi.fn()} />);
        unmount();
        expect(remove).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    });

    // findIndex compares `item.value === String(val)`, so a numeric option never matches the
    // numeric defaultValue the parent passes; the saved choice is lost and index 0 wins.
    it.fails("KNOWN BUG: honours a numeric defaultValue", () => {
        const numeric: SelectOption[] = [
            { value: 2, label: "Two" },
            { value: 3, label: "Three" },
        ];
        const { container } = render(<Select options={numeric} defaultValue={3} onChange={vi.fn()} />);
        expect(selected(container)).toContain("Three");
    });

    // With no options `options[...]` is undefined, which is stored as the selected value and
    // then dereferenced (`value.label`) during render.
    it.fails("KNOWN BUG: renders without crashing when options is empty", () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        expect(() => render(<Select options={[]} onChange={vi.fn()} />)).not.toThrow();
    });
});
