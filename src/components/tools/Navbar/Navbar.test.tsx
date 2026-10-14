// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Navbar from './Navbar';
import { initializeTheme } from '../../../services/theme';

let palettes: HTMLStyleElement;
beforeEach(() => {
    localStorage.clear();
    palettes = document.createElement('style');
    palettes.textContent = `[data-theme=light] { --theme-label: Light; color-scheme: light; }
        [data-theme=dark] { --theme-label: Dark; color-scheme: dark; }
        [data-theme=ocean] { --theme-label: Ocean; color-scheme: dark; }`;
    document.head.append(palettes);
    Object.defineProperty(document, 'startViewTransition', { value: undefined, writable: true, configurable: true });
    initializeTheme();
});
afterEach(() => {
    palettes.remove();
    vi.restoreAllMocks();
});

it('keeps a single theme control outside the collapsed navigation and switches without opening it', async () => {
    render(<MemoryRouter><Navbar /></MemoryRouter>);
    const toggle = screen.getByRole('button', { name: 'Switch to Dark theme' });
    const menu = screen.getByRole('button', { name: 'Menu' });
    const links = document.getElementById(menu.getAttribute('aria-controls') ?? '');
    expect(links?.contains(toggle)).toBe(false);
    expect(toggle.nextElementSibling).toBe(menu);
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    await act(async () => { fireEvent.click(toggle); await Promise.resolve(); });
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getAllByRole('button', { name: /Switch to .* theme/ })).toHaveLength(1);
});

it('cycles through CSS-only palettes and preserves an open mobile menu', async () => {
    render(<MemoryRouter><Navbar /></MemoryRouter>);
    const menu = screen.getByRole('button', { name: 'Menu' });
    fireEvent.click(menu);
    for (const next of ['Dark', 'Ocean', 'Light']) {
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: `Switch to ${next} theme` })); await Promise.resolve(); });
        expect(document.documentElement.dataset.theme).toBe(next.toLowerCase());
        expect(menu.getAttribute('aria-expanded')).toBe('true');
    }
});
