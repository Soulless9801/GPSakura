// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Modal from "./Modal";

const root = (container: HTMLElement): HTMLElement => container.querySelector(".modalRoot") as HTMLElement;

function openIt(container: HTMLElement): void {
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    act(() => {
        vi.advanceTimersByTime(20); // the open is deferred to the next animation frame
    });
    expect(root(container).className).toMatch(/\bopen\b/);
}

describe("Modal", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"] });
    });
    afterEach(() => {
        vi.useRealTimers();
        document.body.style.overflow = "";
    });

    const view = () =>
        render(<Modal title="Hello" description="Some **text**" buttonText="Open" buttonClassName="launch" />);

    it("starts closed and hidden from assistive tech", () => {
        const { container } = view();
        expect(root(container).className).not.toMatch(/\bopen\b/);
        expect(root(container).getAttribute("aria-hidden")).toBe("true");
    });

    it("renders the title and description (strings go through the markdown parser)", () => {
        const { container } = view();
        expect(screen.getByRole("heading", { name: "Hello", hidden: true })).toBeTruthy();
        expect(container.querySelector("strong")?.textContent).toBe("text");
    });

    it("renders a ReactNode description as given", () => {
        render(<Modal title="T" description={<em data-testid="node">custom</em>} buttonText="Open" />);
        expect(screen.getByTestId("node").textContent).toBe("custom");
    });

    it("opens from the trigger button and locks page scroll", () => {
        const { container } = view();
        openIt(container);
        expect(root(container).getAttribute("aria-hidden")).toBe("false");
        expect(document.body.style.overflow).toBe("hidden");
    });

    it("applies the trigger's class and style", () => {
        render(<Modal title="T" description="d" buttonText="Open" buttonClassName="launch" buttonStyle={{ color: "red" }} />);
        const trigger = screen.getByRole("button", { name: "Open" });
        expect(trigger.className).toBe("launch");
        expect(trigger.style.color).toBe("red");
    });

    it("closes with the close button and restores scrolling", () => {
        const { container } = view();
        openIt(container);
        fireEvent.click(screen.getByRole("button", { name: "✕" }));
        expect(root(container).className).not.toMatch(/\bopen\b/);
        expect(document.body.style.overflow).toBe("");
    });

    it("closes with Escape", () => {
        const { container } = view();
        openIt(container);
        fireEvent.keyDown(window, { key: "Escape" });
        expect(root(container).className).not.toMatch(/\bopen\b/);
    });

    it("ignores other keys", () => {
        const { container } = view();
        openIt(container);
        fireEvent.keyDown(window, { key: "Enter" });
        expect(root(container).className).toMatch(/\bopen\b/);
    });

    it("closes when the backdrop is clicked, but not when the panel is", () => {
        const { container } = view();
        openIt(container);
        fireEvent.click(container.querySelector(".modalPanel") as Element);
        expect(root(container).className).toMatch(/\bopen\b/);
        fireEvent.click(container.querySelector(".modalBackdrop") as Element);
        expect(root(container).className).not.toMatch(/\bopen\b/);
    });

    it("scrollable controls the panel class", () => {
        const { container, rerender } = render(<Modal title="T" description="d" buttonText="Open" />);
        expect(container.querySelector(".modalPanel")?.className).toMatch(/\bscrollable\b/);
        rerender(<Modal title="T" description="d" buttonText="Open" scrollable={false} />);
        expect(container.querySelector(".modalPanel")?.className).toMatch(/\bnonScrollable\b/);
    });

    it("stops listening for Escape when unmounted", () => {
        const remove = vi.spyOn(window, "removeEventListener");
        const { unmount } = view();
        unmount();
        expect(remove).toHaveBeenCalledWith("keydown", expect.any(Function));
    });

    // The scroll lock is applied in an effect with no cleanup, so unmounting the modal while it
    // is open (e.g. by navigating away) leaves the page unscrollable.
    it.fails("KNOWN BUG: unmounting an open modal restores page scrolling", () => {
        const { container, unmount } = view();
        openIt(container);
        unmount();
        expect(document.body.style.overflow).toBe("");
    });
});
