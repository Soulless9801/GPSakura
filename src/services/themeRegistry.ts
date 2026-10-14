export interface ThemeDefinition {
    id: string;
    label: string;
}

export const DEFAULT_THEME = 'light';

/** Discover root theme blocks in loaded CSS, in source order. No JS palette list. */
export function getThemes(): ThemeDefinition[] {
    const themes = new Map<string, ThemeDefinition>();
    const visited = new Set<CSSStyleSheet>();

    const readRules = (rules: CSSRuleList): void => {
        for (const rule of Array.from(rules)) {
            if (rule instanceof CSSStyleRule) {
                for (const selector of rule.selectorText.split(',')) {
                    // Ignore component overrides such as [data-theme='dark'] .button.
                    const match = /^(?::root|html)?\[data-theme\s*=\s*['"]?([a-z][a-z0-9_-]*)['"]?\]$/i.exec(selector.trim());
                    if (!match) {continue;}
                    const id = match[1];
                    const label = rule.style.getPropertyValue('--theme-label').trim().replace(/^(['"])(.*)\1$/, '$2');
                    const previous = themes.get(id);
                    themes.set(id, { id, label: label || previous?.label || id.replace(/[-_]/g, ' ') });
                }
            } else if (rule instanceof CSSImportRule && rule.styleSheet) {
                readSheet(rule.styleSheet);
            } else if ('cssRules' in rule) {
                // Theme definitions belong in unconditional root blocks; layers are fine.
                readRules((rule as CSSGroupingRule).cssRules);
            }
        }
    };
    const readSheet = (sheet: CSSStyleSheet): void => {
        if (visited.has(sheet) || sheet.disabled) {return;}
        visited.add(sheet);
        try {readRules(sheet.cssRules);} catch {
            // Cross-origin vendor CSS may be unreadable; it cannot register app themes.
        }
    };

    for (const sheet of Array.from(document.styleSheets)) {readSheet(sheet);}
    return themes.size ? [...themes.values()] : [{ id: DEFAULT_THEME, label: 'light' }];
}

export function getNextTheme(current: string): ThemeDefinition {
    const themes = getThemes();
    const index = themes.findIndex(theme => theme.id === current);
    return themes[(index + 1) % themes.length];
}
