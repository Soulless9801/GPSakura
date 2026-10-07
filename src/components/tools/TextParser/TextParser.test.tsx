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

    // The text is written with innerHTML, so the parser must not let it become markup.
    it("shows raw HTML as text instead of parsing it", () => {
        const { container } = render(<TextParser text={'<img src="x" alt="probe" onerror="alert(1)">'} />);
        expect(container.querySelector("img")).toBeNull();
        expect(container.textContent).toBe('<img src="x" alt="probe" onerror="alert(1)">');
    });

    it("does not create script or event-handler attributes from user text", () => {
        const { container } = render(
            <TextParser text={'<script>window.pwned=1</script> [x](https://a.com" onmouseover="window.pwned=1)'} />,
        );
        expect(container.querySelector("script")).toBeNull();
        expect(container.querySelector("[onmouseover]")).toBeNull();
        expect(container.querySelector("a")?.getAttribute("href")).toBe('https://a.com" onmouseover="window.pwned=1');
    });

    it("typesets math containing < and & correctly", () => {
        const { container } = render(<TextParser text={"$a<b$ and $$\\begin{matrix} a & b \\end{matrix}$$"} />);
        expect(container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(2);
        expect(container.querySelector(".katex-error")).toBeNull();
    });

    it("links open safely in a new tab", () => {
        const { container } = render(<TextParser text="[x](https://a.com)" />);
        expect(container.querySelector("a")?.getAttribute("rel")).toBe("noopener noreferrer");
    });
});
