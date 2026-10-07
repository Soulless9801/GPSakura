// @vitest-environment jsdom
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Pagination from "./Pagination";

function Harness({ total, size = 10, start = 0 }: { total: number; size?: number; start?: number }) {
    const [page, setPage] = useState(start);
    return (
        <>
            <output data-testid="page">{page}</output>
            <Pagination page={page} setPage={setPage} postsLength={total} pageSize={size} />
        </>
    );
}

const labels = (): string[] => screen.getAllByRole("button").map((b) => b.textContent);
const FIRST = "↞";
const PREV = "←";
const NEXT = "→";
const LAST = "↠";
const current = (): string => screen.getByTestId("page").textContent;
const btn = (name: string): HTMLButtonElement => screen.getByRole<HTMLButtonElement>("button", { name });
const pageButton = (n: number): HTMLElement => screen.getByRole("button", { name: String(n) });

describe("Pagination", () => {
    it("lists every page when there are five or fewer", () => {
        render(<Harness total={50} />);
        expect(labels()).toEqual([FIRST, PREV, "1", "2", "3", "4", "5", NEXT, LAST]);
    });

    it("collapses long ranges around the current page", () => {
        render(<Harness total={100} start={0} />);
        expect(labels()).toEqual([FIRST, PREV, "1", "2", "…", "10", NEXT, LAST]);
    });

    it("shows a window of three pages with ellipses on both sides in the middle", () => {
        render(<Harness total={100} start={5} />);
        expect(labels()).toEqual([FIRST, PREV, "1", "…", "5", "6", "7", "…", "10", NEXT, LAST]);
    });

    it("keeps the last pages visible near the end", () => {
        render(<Harness total={100} start={9} />);
        expect(labels()).toEqual([FIRST, PREV, "1", "…", "9", "10", NEXT, LAST]);
    });

    it("rounds the page count up", () => {
        render(<Harness total={21} size={10} />);
        expect(labels()).toEqual([FIRST, PREV, "1", "2", "3", NEXT, LAST]);
    });

    it("renders no page buttons for an empty list", () => {
        render(<Harness total={0} />);
        expect(labels()).toEqual([FIRST, PREV, NEXT, LAST]);
    });

    it("disables first/previous on the first page and next/last on the last", () => {
        const { unmount } = render(<Harness total={50} start={0} />);
        expect(btn(FIRST).disabled).toBe(true);
        expect(btn(PREV).disabled).toBe(true);
        expect(btn(NEXT).disabled).toBe(false);
        unmount();

        render(<Harness total={50} start={4} />);
        expect(btn(NEXT).disabled).toBe(true);
        expect(btn(LAST).disabled).toBe(true);
        expect(btn(PREV).disabled).toBe(false);
    });

    it("steps with next and previous", () => {
        render(<Harness total={50} />);
        fireEvent.click(screen.getByRole("button", { name: NEXT }));
        fireEvent.click(screen.getByRole("button", { name: NEXT }));
        expect(current()).toBe("2");
        fireEvent.click(screen.getByRole("button", { name: PREV }));
        expect(current()).toBe("1");
    });

    it("jumps with first and last", () => {
        render(<Harness total={100} start={4} />);
        fireEvent.click(screen.getByRole("button", { name: LAST }));
        expect(current()).toBe("9");
        fireEvent.click(screen.getByRole("button", { name: FIRST }));
        expect(current()).toBe("0");
    });

    it("clicking a page number goes there (labels are one-based)", () => {
        render(<Harness total={100} />);
        fireEvent.click(pageButton(10));
        expect(current()).toBe("9");
    });

    it("clicking an ellipsis does nothing", () => {
        render(<Harness total={100} start={5} />);
        for (const dots of screen.getAllByRole("button", { name: "…" })) {fireEvent.click(dots);}
        expect(current()).toBe("5");
    });

    it("marks the current page", () => {
        render(<Harness total={50} start={2} />);
        expect(pageButton(3).className).toMatch(/\bactive\b/);
        expect(pageButton(2).className).not.toMatch(/\bactive\b/);
    });

    it("walking forward one page at a time never skips or repeats a page", () => {
        render(<Harness total={100} />);
        for (let expected = 1; expected < 10; expected++) {
            fireEvent.click(screen.getByRole("button", { name: NEXT }));
            expect(current()).toBe(String(expected));
            expect(pageButton(expected + 1).className).toMatch(/\bactive\b/);
        }
        expect(btn(NEXT).disabled).toBe(true);
    });
});
