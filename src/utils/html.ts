// Helpers for building HTML strings from text that may come from a remote source. Anything
// interpolated into markup that ends up in innerHTML (or a DataTables cell) must go through
// these.

export function escapeHtml(text: string): string {
    return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// only plain web links are allowed; `javascript:`, `data:` and the like become "#"
export function safeHttpUrl(url: string | undefined): string {
    const trimmed = url?.trim() ?? "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : "#";
}

// `url` may be missing when a row of the source data is short
export function linkHtml(url: string | undefined, text: string, className?: string): string {
    const cls = className ? ` class="${escapeHtml(className)}"` : "";
    return `<a href="${escapeHtml(safeHttpUrl(url))}"${cls}>${escapeHtml(text)}</a>`;
}
