// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { getNextTheme, getThemes } from './themeRegistry';

const styles: HTMLStyleElement[] = [];
function addCSS(css: string): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.append(style);
    styles.push(style);
    return style;
}
afterEach(() => {
    styles.forEach(style => { style.remove(); });
    styles.length = 0;
    vi.restoreAllMocks();
});

it('discovers CSS-only palettes in source order, with optional labels and root selectors', () => {
    addCSS(`:root, [data-theme="light"] { --theme-label: Light; }
        html[data-theme='dark'] { --theme-label: "Night mode"; }
        :root[data-theme=ocean-blue] { color-scheme: dark; }`);
    expect(getThemes()).toEqual([
        { id: 'light', label: 'Light' },
        { id: 'dark', label: 'Night mode' },
        { id: 'ocean-blue', label: 'ocean blue' },
    ]);
    expect(getNextTheme('light').id).toBe('dark');
    expect(getNextTheme('dark').id).toBe('ocean-blue');
    expect(getNextTheme('ocean-blue').id).toBe('light');
    expect(getNextTheme('deleted').id).toBe('light');
});

it('ignores component overrides and deduplicates later root overrides', () => {
    addCSS(`[data-theme=light] { --theme-label: Day; }
        [data-theme=dark] { color-scheme: dark; }
        [data-theme=ignored] .button { color: red; }
        .card[data-theme=ignored] { color: red; }
        [data-theme=light] { --color-text: blue; }`);
    expect(getThemes()).toEqual([{ id: 'light', label: 'Day' }, { id: 'dark', label: 'dark' }]);
});

it('discovers palettes added later and forgets removed stylesheets', () => {
    addCSS('[data-theme=light] { color-scheme: light; }');
    const extra = addCSS('[data-theme=forest] { --theme-label: Forest; }');
    expect(getNextTheme('light').id).toBe('forest');
    extra.remove();
    expect(getNextTheme('light').id).toBe('light');
});

it('reads layered palettes and skips inaccessible vendor stylesheets', () => {
    const vendor = addCSS('.vendor { color: blue; }');
    Object.defineProperty(vendor.sheet, 'cssRules', { get: () => { throw new DOMException('Cross origin', 'SecurityError'); } });
    addCSS('@layer palettes { [data-theme=forest] { --theme-label: Forest; } }');
    expect(getThemes()).toEqual([{ id: 'forest', label: 'Forest' }]);
});

it('has a safe fallback when no CSS themes are available', () => {
    expect(getThemes()).toEqual([{ id: 'light', label: 'light' }]);
    expect(getNextTheme('unknown').id).toBe('light');
});
