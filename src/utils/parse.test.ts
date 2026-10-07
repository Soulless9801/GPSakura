import { describe, expect, it } from "vitest";

import { parseMarkdown } from "./parse";

const P = (inner: string): string => `<p class="textParserBlock">${inner}</p>`;

describe("parseMarkdown", () => {
    it("wraps blank-line separated paragraphs", () => {
        expect(parseMarkdown("one\n\ntwo")).toBe(P("one") + P("two"));
    });

    it("keeps single newlines inside a paragraph", () => {
        expect(parseMarkdown("one\ntwo")).toBe(P("one\ntwo"));
    });

    it("renders bold, italic and underline", () => {
        expect(parseMarkdown("**b**")).toBe(P("<strong>b</strong>"));
        expect(parseMarkdown("*i*")).toBe(P("<em>i</em>"));
        expect(parseMarkdown("__u__")).toBe(P("<u>u</u>"));
    });

    it("handles bold before italic so ** is not read as two empty italics", () => {
        expect(parseMarkdown("**bold** and *it*")).toBe(P("<strong>bold</strong> and <em>it</em>"));
    });

    it("converts inline math delimiters to KaTeX \\( \\)", () => {
        expect(parseMarkdown("area $x^2$ done")).toBe(P("area \\(x^2\\) done"));
    });

    it("converts block math to a \\[ \\] div and trims it", () => {
        expect(parseMarkdown("$$ a + b $$")).toBe(P("<div>\\[a + b\\]</div>"));
    });

    it("lets block math span lines", () => {
        expect(parseMarkdown("$$a\n+b$$")).toBe(P("<div>\\[a\n+b\\]</div>"));
    });

    it("renders http(s) links that open in a new tab", () => {
        expect(parseMarkdown("[site](https://example.com/a?b=1)")).toBe(
            P('<a href="https://example.com/a?b=1" target="_blank">site</a>'),
        );
    });

    it("leaves non-http links alone", () => {
        expect(parseMarkdown("[x](javascript:alert(1))")).toBe(P("[x](javascript:alert(1))"));
        expect(parseMarkdown("[x](ftp://example.com)")).toBe(P("[x](ftp://example.com)"));
    });

    it("returns an empty paragraph for empty input", () => {
        expect(parseMarkdown("")).toBe(P(""));
    });

    // The output is assigned to innerHTML by TextParser, and nothing is escaped.
    describe("HTML injection (TextParser assigns the result to innerHTML)", () => {
        it("passes raw HTML straight through", () => {
            expect(parseMarkdown("<img src=x onerror=alert(1)>")).toContain("<img src=x onerror=alert(1)>");
        });

        it.fails("KNOWN BUG: escapes raw HTML", () => {
            expect(parseMarkdown("<script>alert(1)</script>")).not.toContain("<script>");
        });

        it.fails("KNOWN BUG: link URLs cannot break out of the href attribute", () => {
            const html = parseMarkdown('[x](https://a.com" onmouseover="alert(1)');
            expect(html).not.toMatch(/onmouseover=/);
        });
    });
});
