function parseNewlines(text: string): string {
    return text
    .split('\n\n')
    .map(p => `<p class="textParserBlock">${p}</p>`)
    .join("");
}

function parseBlockMath(html: string): string {
    return html.replace(
        /\$\$([\s\S]+?)\$\$/g,
        (_match: string, expr: string) => `<div>\\[${expr.trim()}\\]</div>`
    );
}

function parseInlineMath(html: string): string {
    return html.replace(
        /\$(.+?)\$/g,
        (_match: string, expr: string) => `\\(${expr}\\)`
    );
}

function parseTextDecorations(html: string): string {
    return html
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/__(.+?)__/g, "<u>$1</u>");
}

function parseLinks(html: string): string {
    return html.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
        '<a href="$2" target="_blank">$1</a>'
    );
}

export function parseMarkdown(text: string): string {
    let html = text;
    html = parseNewlines(html);
    html = parseBlockMath(html);
    html = parseInlineMath(html);
    html = parseTextDecorations(html);
    html = parseLinks(html);
    return html;
}
