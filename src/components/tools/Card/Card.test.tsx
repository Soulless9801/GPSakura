// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Card as CardData, Rank, Suit } from "/src/entities/card";

import Card from "./Card";

const c = (suit: Suit, rank: number): CardData => ({ suit, rank: rank as Rank });

describe("Card", () => {
    it("renders nothing without a card", () => {
        const { container } = render(<Card card={null} />);
        expect(container.firstChild).toBeNull();
    });

    it("is a button labelled with its rank and suit", () => {
        render(<Card card={c("hearts", 14)} />);
        expect(screen.getByRole("button", { name: "Ahearts" })).toBeTruthy();
    });

    it("shows the rank and the suit glyph in both corners and the centre", () => {
        const { container } = render(<Card card={c("spades", 13)} />);
        expect([...container.querySelectorAll(".sj-card__rank")].map((e) => e.textContent)).toEqual(["K", "K"]);
        expect([...container.querySelectorAll(".sj-card__suit")].map((e) => e.textContent)).toEqual(["♠", "♠", "♠"]);
    });

    it("colours hearts, diamonds and the big joker red", () => {
        for (const card of [c("hearts", 3), c("diamonds", 3), c("jokers", 2)]) {
            const { container, unmount } = render(<Card card={card} />);
            expect(container.querySelector("button")?.className).toMatch(/sj-card__red/);
            unmount();
        }
    });

    it("colours spades, clubs and the small joker black", () => {
        for (const card of [c("spades", 3), c("clubs", 3), c("jokers", 1)]) {
            const { container, unmount } = render(<Card card={card} />);
            expect(container.querySelector("button")?.className).toMatch(/sj-card__black/);
            unmount();
        }
    });

    it("labels jokers with their characters", () => {
        const { container } = render(<Card card={c("jokers", 1)} />);
        expect(container.querySelector(".sj-card__rank")?.textContent).toBe("小");
    });

    it("toggles its selected state and reports it with its position", () => {
        const onClick = vi.fn();
        render(<Card card={c("clubs", 7)} pos={4} onClick={onClick} />);
        const button = screen.getByRole("button");

        fireEvent.click(button);
        expect(button.className).toMatch(/\bselected\b/);
        expect(onClick).toHaveBeenLastCalledWith(4, true);

        fireEvent.click(button);
        expect(button.className).not.toMatch(/\bselected\b/);
        expect(onClick).toHaveBeenLastCalledWith(4, false);
    });

    it("works without a click handler", () => {
        render(<Card card={c("clubs", 7)} />);
        expect(() => {
            fireEvent.click(screen.getByRole("button"));
        }).not.toThrow();
    });

    it("clears the selection when it is given a different card", () => {
        const { rerender } = render(<Card card={c("clubs", 7)} />);
        fireEvent.click(screen.getByRole("button"));
        rerender(<Card card={c("clubs", 8)} />);
        expect(screen.getByRole("button").className).not.toMatch(/\bselected\b/);
    });

    it("adds a custom class name", () => {
        render(<Card card={c("clubs", 7)} className="mine" />);
        expect(screen.getByRole("button").className).toMatch(/\bmine\b/);
    });
});
