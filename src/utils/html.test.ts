import { describe, expect, it } from "vitest";

import { escapeHtml, linkHtml, safeHttpUrl } from "./html";

describe("escapeHtml", () => {
    it("escapes the five characters that matter in HTML text and attributes", () => {
        expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe("&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
    });

    it("escapes ampersands first, so existing entities are not left half-decoded", () => {
        expect(escapeHtml("&lt;")).toBe("&amp;lt;");
    });

    it("leaves ordinary text alone", () => {
        expect(escapeHtml("Hello, world 123 — ünïcode")).toBe("Hello, world 123 — ünïcode");
        expect(escapeHtml("")).toBe("");
    });

    it("leaves nothing that can open a tag or close an attribute", () => {
        const out = escapeHtml(`"><img src=x onerror=alert(1)>'`);
        expect(out).not.toMatch(/[<>"']/);
    });
});

describe("safeHttpUrl", () => {
    it("keeps http and https URLs, case-insensitively", () => {
        expect(safeHttpUrl("https://codeforces.com/a")).toBe("https://codeforces.com/a");
        expect(safeHttpUrl("http://www.usaco.org")).toBe("http://www.usaco.org");
        expect(safeHttpUrl("HTTPS://EXAMPLE.COM")).toBe("HTTPS://EXAMPLE.COM");
    });

    it("trims surrounding whitespace", () => {
        expect(safeHttpUrl("  https://a.com \n")).toBe("https://a.com");
    });

    it.each([
        "javascript:alert(1)",
        "JaVaScRiPt:alert(1)",
        " javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "vbscript:msgbox(1)",
        "//evil.com",
        "/relative",
        "ftp://a.com",
        "",
        "undefined",
    ])("replaces %j with '#'", (url) => {
        expect(safeHttpUrl(url)).toBe("#");
    });
});

describe("linkHtml", () => {
    it("builds an anchor with escaped text", () => {
        expect(linkHtml("https://a.com", "A & B")).toBe('<a href="https://a.com">A &amp; B</a>');
    });

    it("adds a class when given one", () => {
        expect(linkHtml("https://a.com", "x", "table-link")).toBe('<a href="https://a.com" class="table-link">x</a>');
    });

    it("escapes quotes in the URL so it cannot leave the attribute", () => {
        const html = linkHtml('https://a.com/" onmouseover="alert(1)', "x");
        expect(html).toBe('<a href="https://a.com/&quot; onmouseover=&quot;alert(1)">x</a>');
    });

    it("neutralises a javascript: link", () => {
        expect(linkHtml("javascript:alert(1)", "click")).toBe('<a href="#">click</a>');
    });

    it("escapes markup in the link text", () => {
        expect(linkHtml("https://a.com", "<img src=x onerror=1>")).not.toMatch(/<img/);
    });

    it("renders a link with no URL as an inert one (missing sheet column)", () => {
        expect(linkHtml(undefined, "x")).toBe('<a href="#">x</a>');
        expect(safeHttpUrl(undefined)).toBe("#");
    });
});
