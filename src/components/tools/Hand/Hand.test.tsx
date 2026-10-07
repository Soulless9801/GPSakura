// @vitest-environment jsdom
import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Card as CardData, Rank, Suit } from "/src/entities/card";

import Hand from "./Hand";
import type { HandRef } from "./Hand";

const c = (suit: Suit, rank: number): CardData => ({ suit, rank: rank as Rank });
const CARDS = [c("hearts", 3), c("spades", 14), c("clubs", 9)];

describe("Hand", () => {
    it("renders one button per card, in order", () => {
        render(<Hand cards={CARDS} />);
        expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual([
            "3hearts",
            "Aspades",
            "9clubs",
        ]);
    });

    it("renders an empty wrapper for an empty hand", () => {
        const { container } = render(<Hand cards={[]} />);
        expect(container.querySelectorAll("button")).toHaveLength(0);
        expect(container.querySelector(".card-hand__wrapper")).not.toBeNull();
    });

    it("stacks later cards above earlier ones", () => {
        const { container } = render(<Hand cards={CARDS} />);
        const slots = [...container.querySelectorAll<HTMLElement>(".card-hand > div")];
        expect(slots.map((s) => s.style.zIndex)).toEqual(["0", "1", "2"]);
    });

    it("reports the selected cards through its ref", () => {
        const ref = createRef<HandRef>();
        render(<Hand ref={ref} cards={CARDS} />);
        expect(ref.current?.getActiveCards()).toEqual([]);

        fireEvent.click(screen.getByRole("button", { name: "3hearts" }));
        fireEvent.click(screen.getByRole("button", { name: "9clubs" }));
        expect(ref.current?.getActiveCards()).toEqual([CARDS[0], CARDS[2]]);

        fireEvent.click(screen.getByRole("button", { name: "3hearts" }));
        expect(ref.current?.getActiveCards()).toEqual([CARDS[2]]);
    });

    it("drops the selection when the cards change", () => {
        const ref = createRef<HandRef>();
        const { rerender } = render(<Hand ref={ref} cards={CARDS} />);
        fireEvent.click(screen.getByRole("button", { name: "3hearts" }));
        rerender(<Hand ref={ref} cards={[c("hearts", 5), c("clubs", 2)]} />);
        expect(ref.current?.getActiveCards()).toEqual([]);
    });

    it("applies the custom class alongside the base class", () => {
        const { container } = render(<Hand cards={CARDS} className="mine" />);
        expect(container.firstElementChild?.className).toContain("mine");
        expect(container.firstElementChild?.className).toContain("card-hand__wrapper");
    });

    // The class string is `card-hand__wrapper${className}` with no space, so a custom class
    // fuses onto the base one and neither selector matches.
    it("the custom class is a separate class token", () => {
        const { container } = render(<Hand cards={CARDS} className="mine" />);
        expect([...(container.firstElementChild?.classList ?? [])]).toContain("mine");
    });

    // The selection is reset whenever the `cards` array identity changes, and callers build a
    // fresh array on every render (e.g. from `handToCards`), so an unrelated re-render of the
    // game room silently clears what the player had picked.
    it("re-rendering with an equal array keeps the selection", () => {
        const ref = createRef<HandRef>();
        const { rerender } = render(<Hand ref={ref} cards={[...CARDS]} />);
        fireEvent.click(screen.getByRole("button", { name: "3hearts" }));
        rerender(<Hand ref={ref} cards={CARDS.map(card => ({ ...card }))} />);
        expect(ref.current?.getActiveCards()).toHaveLength(1);
        expect(screen.getByRole("button", { name: "3hearts" }).classList.contains("selected")).toBe(true);
        fireEvent.click(screen.getByRole("button", { name: "3hearts" }));
        expect(ref.current?.getActiveCards()).toEqual([]);
    });

    it("clears both the selection and its highlight when another card changes", () => {
        const ref = createRef<HandRef>();
        const { rerender } = render(<Hand ref={ref} cards={CARDS} />);
        fireEvent.click(screen.getByRole("button", { name: "3hearts" }));
        rerender(<Hand ref={ref} cards={[CARDS[0], c("clubs", 5), CARDS[2]]} />);
        expect(ref.current?.getActiveCards()).toEqual([]);
        expect(screen.getByRole("button", { name: "3hearts" }).classList.contains("selected")).toBe(false);
    });
});
