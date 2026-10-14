import lightImage from '/favicon.png';
import darkImage from '/favicom.png';
import { flushSync } from 'react-dom';
import { DEFAULT_THEME, getNextTheme, getThemes } from './themeRegistry';

export type Theme = string;
const THEME_STORAGE_KEY = 'theme';
let requestedTheme: Theme | undefined;
let activeTransition: ViewTransition | undefined;
let pendingSwitch: Promise<void> | undefined;
let commitTheme: ((theme: Theme) => void) | undefined;

/** Logo and icon treatment follows CSS color-scheme, not a hard-coded theme id. */
export function isDarkTheme(): boolean {
    return getComputedStyle(document.documentElement).colorScheme === 'dark';
}
export function themeImage(): string {
    return isDarkTheme() ? darkImage : lightImage;
}
export function getTheme(): Theme {
    return document.documentElement.dataset.theme || DEFAULT_THEME;
}

function applyTheme(theme: Theme): void {
    document.documentElement.dataset.theme = theme;
    const icon = document.getElementById('websiteIcon');
    if (icon instanceof HTMLLinkElement) {icon.href = themeImage();}
    try {localStorage.setItem(THEME_STORAGE_KEY, theme);} catch {
        // Theme changes should work even if storage is unavailable.
    }
    window.dispatchEvent(new Event('themeStorage'));
}

/** Restore before React mounts. Unknown/deleted saved themes fall back to the first palette. */
export function initializeTheme(): void {
    const themes = getThemes();
    let theme = themes[0].id;
    try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        theme = themes.find(candidate => candidate.id === saved)?.id ?? theme;
    } catch { /* Use the first CSS palette. */ }
    requestedTheme = theme;
    applyTheme(theme);
    // Warm both tiny logo assets so changing color-scheme doesn't introduce a late image.
    for (const src of [lightImage, darkImage]) {const image = new Image(); image.src = src;}
}

/** Cycle CSS palettes. One root snapshot fade owns all theme pixels, including vendor UI. */
export async function toggleTheme(commit: (theme: Theme) => void): Promise<void> {
    requestedTheme = getNextTheme(requestedTheme ?? getTheme()).id;
    commitTheme = commit;
    // Interrupting a snapshot fade reveals the destination immediately, causing
    // a flash. Finish the current fade, then honor the latest queued selection.
    pendingSwitch ??= drainThemeChanges().finally(() => { pendingSwitch = undefined; });
    await pendingSwitch;
}

async function drainThemeChanges(): Promise<void> {
    while (requestedTheme !== undefined && requestedTheme !== getTheme()) {
        await transitionToTheme(requestedTheme);
    }
}

async function transitionToTheme(nextTheme: Theme): Promise<void> {
    const root = document.documentElement;
    root.dataset.themeChanging = '';

    let applied = false;
    const updateTheme = (): void => {
        if (applied) {return;}
        applied = true;
        flushSync(() => {
            applyTheme(nextTheme);
            commitTheme?.(nextTheme);
        });
        // Settle styles while interaction transitions are disabled, including the fallback.
        void root.getBoundingClientRect();
    };
    const cleanup = (): void => {
        activeTransition = undefined;
        delete root.dataset.themeChanging;
    };
    const skipWhenHidden = (): void => {
        if (document.hidden) {activeTransition?.skipTransition();}
    };

    try {
        const platform: Partial<Pick<Document, 'startViewTransition'>> = document;
        const startTransition = platform.startViewTransition;
        const duration = parseFloat(getComputedStyle(root).getPropertyValue('--motion-duration'));
        if (!startTransition || duration === 0 || document.hidden ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            updateTheme();
            return;
        }
        document.addEventListener('visibilitychange', skipWhenHidden);
        const transition = startTransition.call(document, async () => {
            updateTheme();
            await waitForThemeAssets();
        });
        activeTransition = transition;
        void transition.ready.catch(() => undefined);
        await transition.finished.catch(() => undefined);
        await transition.updateCallbackDone.catch(() => undefined);
        updateTheme();
    } catch {
        updateTheme();
    } finally {
        document.removeEventListener('visibilitychange', skipWhenHidden);
        cleanup();
    }
}

async function waitForThemeAssets(): Promise<void> {
    // Decode React's updated theme logo before the new snapshot. Bound the wait so a
    // failed image cannot strand the theme controller. Never await rAF here:
    // browsers suppress rendering while the snapshot update is pending. Canvas
    // listeners repaint synchronously when receiving themeStorage instead.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ready = async (): Promise<void> => {
        await Promise.all(Array.from(document.querySelectorAll<HTMLImageElement>('img[data-theme-asset]'))
            .map(image => image.decode().catch(() => undefined)));
    };
    try {
        await Promise.race([
            ready(),
            new Promise<void>(resolve => {timer = setTimeout(resolve, 250);}),
        ]);
    } finally {
        clearTimeout(timer);
    }
}
