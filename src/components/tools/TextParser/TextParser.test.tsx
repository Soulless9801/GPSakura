// @vitest-environment jsdom
import { createRef } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TextParser from "./TextParser";

describe("TextParser", () => {
    it("renders paragraphs and inline formatting", () => {
        const { container } = render(<TextParser text={"one **bold**\n\ntwo *it*"} />);
        expect(container.querySelectorAll("p.textParserBlock")).toHaveLength(2);
        expect(container.querySelector("strong")?.textContent).toBe("bold");
        expect(container.querySelector("em")?.textContent).toBe("it");
    });

    it("typesets inline and block math with KaTeX", () => {
        const { container } = render(<TextParser text={"inline $x^2$ and\n\n$$y = 1$$"} />);
        expect(container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(2);
        expect(container.querySelector(".katex-display")).not.toBeNull();
    });

    it("renders http links in a new tab", () => {
        const { container } = render(<TextParser text="[site](https://example.com)" />);
        const link = container.querySelector("a");
        expect(link?.getAttribute("href")).toBe("https://example.com");
        expect(link?.getAttribute("target")).toBe("_blank");
    });

    it("re-renders when the text changes", () => {
        const { container, rerender } = render(<TextParser text="first" />);
        rerender(<TextParser text="second" />);
        expect(container.textContent).toBe("second");
    });

    it("forwards the ref to the container element", () => {
        const ref = createRef<HTMLDivElement>();
        render(<TextParser ref={ref} text="x" className="extra" />);
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
        expect(ref.current?.className).toContain("extra");
    });

    it("supports a callback ref", () => {
        let node: HTMLDivElement | null = null;
        render(
            <TextParser
                ref={(el) => {
                    node = el;
                }}
                text="x"
            />,
        );
        expect(node).toBeInstanceOf(HTMLDivElement);
    });

    // Text is written with innerHTML after a regex "markdown" pass that escapes nothing. The
    // blog and problem pages feed it text from Firestore.
    it("SECURITY: raw HTML in the text becomes live DOM", () => {
        const { container } = render(<TextParser text={'<img src="x" alt="probe" onerror="alert(1)">'} />);
        expect(container.querySelector("img[onerror]")).not.toBeNull();
    });

    it.fails("KNOWN BUG: raw HTML in the text is shown as text, not parsed", () => {
        const { container } = render(<TextParser text={'<img src="x" alt="probe" onerror="alert(1)">'} />);
        expect(container.querySelector("img")).toBeNull();
    });
});
