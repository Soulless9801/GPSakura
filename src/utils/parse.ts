// The output of parseMarkdown is assigned to innerHTML, so the input is escaped before any
// markup is added: the only tags in the result are the ones generated below.
//
// Math and link URLs are swapped for placeholders while the emphasis rules run, so that
// `$a*b*c$` and `https://x.com/__id__` are not mangled into <em> / <u>.

import { escapeHtml } from "/src/utils/html";

const STASH_OPEN = "";
const STASH_CLOSE = "";
const STASH_PATTERN = new RegExp(`${STASH_OPEN}(\\d+)${STASH_CLOSE}`, "g");

class Stash {
    private items: string[] = [];

    put(html: string): string {
        this.items.push(html);
        return `${STASH_OPEN}${String(this.items.length - 1)}${STASH_CLOSE}`;
    }

    restore(text: string): string {
        return text.replace(STASH_PATTERN, (_match: string, index: string) => this.items[Number(index)]);
    }
}

function parseNewlines(text: string): string {
    return text
    .split('\n\n')
    .map(p => `<p class="textParserBlock">${p}</p>`)
    .join("");
}

function parseBlockMath(html: string, stash: Stash): string {
    return html.replace(
        /\$\$([\s\S]+?)\$\$/g,
        (_match: string, expr: string) => stash.put(`<div>\\[${expr.trim()}\\]</div>`)
    );
}

function parseInlineMath(html: string, stash: Stash): string {
    return html.replace(
        /\$(.+?)\$/g,
        (_match: string, expr: string) => stash.put(`\\(${expr}\\)`)
    );
}

function parseLinks(html: string, stash: Stash): string {
    return html.replace(
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
        (_match: string, label: string, url: string) =>
            `<a href="${stash.put(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
    );
}

function parseTextDecorations(html: string): string {
    return html
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/__(.+?)__/g, "<u>$1</u>");
}

export function parseMarkdown(text: string): string {
    const stash = new Stash();

    // the stash markers are private-use characters; drop any that the input already contains
    let html = text.replace(new RegExp(`[${STASH_OPEN}${STASH_CLOSE}]`, "g"), "");

    html = escapeHtml(html);
    html = parseNewlines(html);
    html = parseBlockMath(html, stash);
    html = parseInlineMath(html, stash);
    html = parseLinks(html, stash);
    html = parseTextDecorations(html);

    return stash.restore(html);
}
