// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

let palettes: HTMLStyleElement;

beforeEach(() => {
    vi.resetModules();
    palettes = document.createElement('style');
    palettes.textContent = `[data-theme='light'] { color-scheme: light; }
        [data-theme='dark'] { color-scheme: dark; }`;
    document.head.append(palettes);
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme-changing');
    document.documentElement.dataset.theme = 'light';
    document.documentElement.style.setProperty('--motion-duration', '300ms');
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0; });
    Object.defineProperty(document, 'startViewTransition', { value: undefined, writable: true, configurable: true });
});

afterEach(() => {
    palettes.remove();
    document.documentElement.removeAttribute('style');
    document.querySelectorAll('img[data-theme-asset]').forEach(image => {image.remove();});
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function installTransition() {
    const calls: {
        update: () => Promise<void>;
        finish: () => void;
        skip: ReturnType<typeof vi.fn>;
    }[] = [];
    const start = vi.fn((update: () => Promise<void>) => {
        let finish = (): void => undefined;
        let updated = (): void => undefined;
        const finished = new Promise<void>(resolve => { finish = resolve; });
        const updateCallbackDone = new Promise<void>(resolve => { updated = resolve; });
        const skip = vi.fn();
        calls.push({ update: async () => { await update(); updated(); }, finish, skip });
        return { ready: Promise.resolve(), finished, updateCallbackDone, skipTransition: skip };
    });
    Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true });
    return { start, calls };
}

it('restores the saved theme before React mounts without starting an animation', async () => {
    localStorage.setItem('theme', 'dark');
    const { start } = installTransition();
    const theme = await import('./theme');
    theme.initializeTheme();
    expect(theme.getTheme()).toBe('dark');
    expect(start).not.toHaveBeenCalled();
});

it('commits the DOM, React callback, storage and canvas notification in the snapshot update', async () => {
    const { calls } = installTransition();
    const theme = await import('./theme');
    const commit = vi.fn<(theme: string) => void>();
    const notify = vi.fn();
    window.addEventListener('themeStorage', notify, { once: true });
    const pending = theme.toggleTheme(commit);
    expect(theme.getTheme()).toBe('light');
    expect(document.documentElement.hasAttribute('data-theme-changing')).toBe(true);
    await calls[0].update();
    expect(theme.getTheme()).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(commit).toHaveBeenCalledExactlyOnceWith('dark');
    expect(notify).toHaveBeenCalledTimes(1);
    calls[0].finish();
    await pending;
    expect(document.documentElement.hasAttribute('data-theme-changing')).toBe(false);
});

it('queues rapid toggles without skipping the visible fade or applying concurrent snapshots', async () => {
    const { calls } = installTransition();
    const theme = await import('./theme');
    const commit = vi.fn<(theme: string) => void>();
    const first = theme.toggleTheme(commit);
    const second = theme.toggleTheme(commit);
    expect(calls).toHaveLength(1);
    expect(calls[0].skip).not.toHaveBeenCalled();
    await calls[0].update();
    expect(theme.getTheme()).toBe('dark');
    calls[0].finish();
    await vi.waitFor(() => { expect(calls).toHaveLength(2); });
    expect(document.documentElement.hasAttribute('data-theme-changing')).toBe(true);
    await calls[1].update();
    calls[1].finish();
    await Promise.all([first, second]);
    expect(commit.mock.calls.map(call => call[0])).toEqual(['dark', 'light']);
    expect(theme.getTheme()).toBe('light');
    expect(document.documentElement.hasAttribute('data-theme-changing')).toBe(false);
});

it.each(['unsupported', 'reduced', 'zero', 'hidden'])('switches immediately for %s without leaving transition state behind', async reason => {
    const { start } = installTransition();
    if (reason === 'unsupported') {Object.defineProperty(document, 'startViewTransition', { value: undefined });}
    if (reason === 'reduced') {vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));}
    if (reason === 'zero') {document.documentElement.style.setProperty('--motion-duration', '0ms');}
    if (reason === 'hidden') {vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);}
    const theme = await import('./theme');
    const commit = vi.fn<(theme: string) => void>();
    await theme.toggleTheme(commit);
    expect(theme.getTheme()).toBe('dark');
    expect(commit).toHaveBeenCalledExactlyOnceWith('dark');
    expect(start).not.toHaveBeenCalled();
    expect(document.documentElement.hasAttribute('data-theme-changing')).toBe(false);
});

it('still changes theme if snapshot setup throws or storage is unavailable', async () => {
    Object.defineProperty(document, 'startViewTransition', { value: () => { throw new Error('capture unavailable'); } });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage blocked'); });
    const theme = await import('./theme');
    const commit = vi.fn<(theme: string) => void>();
    await theme.toggleTheme(commit);
    expect(theme.getTheme()).toBe('dark');
    expect(commit).toHaveBeenCalledExactlyOnceWith('dark');
    expect(document.documentElement.hasAttribute('data-theme-changing')).toBe(false);
});

it('cycles a new CSS-only palette, wraps, and restores its saved preference', async () => {
    palettes.textContent += `[data-theme=ocean] { --theme-label: Ocean; color-scheme: dark; }`;
    localStorage.setItem('theme', 'ocean');
    const theme = await import('./theme');
    theme.initializeTheme();
    expect(theme.getTheme()).toBe('ocean');
    expect(theme.isDarkTheme()).toBe(true);
    const commit = vi.fn<(theme: string) => void>();
    await theme.toggleTheme(commit);
    await theme.toggleTheme(commit);
    await theme.toggleTheme(commit);
    expect(commit.mock.calls.map(call => call[0])).toEqual(['light', 'dark', 'ocean']);
    expect(localStorage.getItem('theme')).toBe('ocean');
});

it.each(['deleted', 'unavailable'])('uses the first CSS palette when saved storage is %s', async reason => {
    localStorage.setItem('theme', 'deleted');
    if (reason === 'unavailable') {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    }
    const theme = await import('./theme');
    theme.initializeTheme();
    expect(theme.getTheme()).toBe('light');
});

it('skips an active capture when the document becomes hidden', async () => {
    const { calls } = installTransition();
    const theme = await import('./theme');
    const pending = theme.toggleTheme(vi.fn());
    await calls[0].update();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(calls[0].skip).toHaveBeenCalledOnce();
    calls[0].finish();
    await pending;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(calls[0].skip).toHaveBeenCalledOnce();
    expect(document.documentElement.hasAttribute('data-theme-changing')).toBe(false);
});

it('finishes consistently when snapshot promises reject', async () => {
    const theme = await import('./theme');
    Object.defineProperty(document, 'startViewTransition', {
        value: (update: () => Promise<void>) => {
            const failed = Promise.reject(new Error('capture skipped'));
            return { ready: failed, finished: failed, updateCallbackDone: update(), skipTransition: vi.fn() };
        },
    });
    const commit = vi.fn<(theme: string) => void>();
    await theme.toggleTheme(commit);
    expect(commit).toHaveBeenCalledExactlyOnceWith('dark');
    expect(document.documentElement.hasAttribute('data-theme-changing')).toBe(false);
});

it('coalesces repeated requests after the DOM update to the latest selected palette', async () => {
    const { calls } = installTransition();
    const theme = await import('./theme');
    const commit = vi.fn<(theme: string) => void>();
    const first = theme.toggleTheme(commit);
    await calls[0].update();
    const second = theme.toggleTheme(commit);
    const third = theme.toggleTheme(commit);
    expect(calls[0].skip).not.toHaveBeenCalled();
    calls[0].finish();
    await Promise.all([first, second, third]);
    expect(calls).toHaveLength(1);
    expect(commit).toHaveBeenCalledExactlyOnceWith('dark');
    expect(theme.getTheme()).toBe('dark');
    expect(document.documentElement.hasAttribute('data-theme-changing')).toBe(false);
});

it('bounds a stalled image decode and does not schedule a late paint after timeout', async () => {
    vi.useFakeTimers();
    const frame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', frame);
    const image = document.createElement('img');
    image.dataset.themeAsset = '';
    let decode = (): void => undefined;
    image.decode = () => new Promise<void>(resolve => { decode = resolve; });
    document.body.append(image);
    const { calls } = installTransition();
    const theme = await import('./theme');
    const pending = theme.toggleTheme(vi.fn());
    const updating = calls[0].update();
    await vi.advanceTimersByTimeAsync(250);
    await updating;
    calls[0].finish();
    await pending;
    decode();
    await Promise.resolve();
    await Promise.resolve();
    expect(frame).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(document.documentElement.hasAttribute('data-theme-changing')).toBe(false);
});

it('continues after an image decode fails', async () => {
    const image = document.createElement('img');
    image.dataset.themeAsset = '';
    image.decode = () => Promise.reject(new Error('image unavailable'));
    document.body.append(image);
    const { calls } = installTransition();
    const theme = await import('./theme');
    const pending = theme.toggleTheme(vi.fn());
    await calls[0].update();
    calls[0].finish();
    await pending;
    expect(theme.getTheme()).toBe('dark');
    expect(document.documentElement.hasAttribute('data-theme-changing')).toBe(false);
});
