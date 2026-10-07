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
            P('<a href="https://example.com/a?b=1" target="_blank" rel="noopener noreferrer">site</a>'),
        );
    });

    it("leaves non-http links alone", () => {
        expect(parseMarkdown("[x](javascript:alert(1))")).toBe(P("[x](javascript:alert(1))"));
        expect(parseMarkdown("[x](ftp://example.com)")).toBe(P("[x](ftp://example.com)"));
    });

    it("returns an empty paragraph for empty input", () => {
        expect(parseMarkdown("")).toBe(P(""));
    });

    it("formats the label of a link", () => {
        expect(parseMarkdown("[**big** site](https://example.com)")).toBe(
            P('<a href="https://example.com" target="_blank" rel="noopener noreferrer"><strong>big</strong> site</a>'),
        );
    });

    it("does not let emphasis rules reach into a link URL", () => {
        expect(parseMarkdown("[x](https://example.com/__id__/a*b*c)")).toBe(
            P('<a href="https://example.com/__id__/a*b*c" target="_blank" rel="noopener noreferrer">x</a>'),
        );
    });

    it("does not let emphasis rules reach into math", () => {
        expect(parseMarkdown("$a*b*c$ and $$x__y__z$$")).toBe(P("\\(a*b*c\\) and <div>\\[x__y__z\\]</div>"));
    });

    it("applies several rules in one paragraph", () => {
        expect(parseMarkdown("**a** $x$ [l](https://e.com) *b*")).toBe(
            P('<strong>a</strong> \\(x\\) <a href="https://e.com" target="_blank" rel="noopener noreferrer">l</a> <em>b</em>'),
        );
    });

    // The output is assigned to innerHTML by TextParser, so nothing the author types may
    // become markup of its own.
    describe("HTML injection (TextParser assigns the result to innerHTML)", () => {
        it("escapes raw HTML", () => {
            const html = parseMarkdown("<img src=x onerror=alert(1)>");
            expect(html).toBe(P("&lt;img src=x onerror=alert(1)&gt;"));
            expect(html).not.toMatch(/<img/);
        });

        it("escapes script tags", () => {
            expect(parseMarkdown("<script>alert(1)</script>")).not.toContain("<script>");
        });

        it("escapes quotes and ampersands", () => {
            expect(parseMarkdown(`a & "b" 'c'`)).toBe(P("a &amp; &quot;b&quot; &#39;c&#39;"));
        });

        it("link URLs cannot break out of the href attribute", () => {
            // the quotes stay inside the attribute value as entities; no attribute is added
            expect(parseMarkdown('[x](https://a.com" onmouseover="alert(1))')).toBe(
                P('<a href="https://a.com&quot; onmouseover=&quot;alert(1" target="_blank" rel="noopener noreferrer">x</a>)'),
            );
        });

        it("link labels cannot carry markup", () => {
            const html = parseMarkdown("[<b onclick=1>x</b>](https://a.com)");
            expect(html).not.toMatch(/<b /);
        });

        it("a less-than sign in math is not read as a tag", () => {
            expect(parseMarkdown("$a<b$")).toBe(P("\\(a&lt;b\\)"));
        });

        it("keeps an ampersand in math as an entity, which the DOM turns back into '&'", () => {
            expect(parseMarkdown("$$a & b$$")).toBe(P("<div>\\[a &amp; b\\]</div>"));
        });

        it("only ever emits the tags it generates", () => {
            const hostile = [
                "<iframe src=javascript:alert(1)></iframe>",
                "[a](https://x.com\"><script>alert(1)</script>)",
                "$$</div><script>alert(1)</script>$$",
                "**<img src=x onerror=1>**",
                "<<script>script>alert(1)<</script>/script>",
            ].join("\n\n");
            const tags = new Set([...parseMarkdown(hostile).matchAll(/<\/?([a-z0-9]+)/gi)].map((m) => m[1].toLowerCase()));
            for (const tag of tags) {expect(["p", "strong", "em", "u", "a", "div"]).toContain(tag);}
            expect(parseMarkdown(hostile)).not.toMatch(/<script|<iframe|<img/i);
        });

        it("ignores the internal placeholder characters if the input contains them", () => {
            expect(parseMarkdown("\uE0000\uE001 [x](https://a.com)")).toBe(
                P('0 <a href="https://a.com" target="_blank" rel="noopener noreferrer">x</a>'),
            );
        });

        it("does not throw on odd input", () => {
            for (const input of ["", "$", "$$", "[", "]()", "[](http://a)", "**", "*", "__", "\n\n\n\n"]) {
                expect(() => parseMarkdown(input)).not.toThrow();
            }
        });
    });
});
