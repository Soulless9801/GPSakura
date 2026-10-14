// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import Chaos from '../components/experiments/Chaos/Chaos';
import Fractal from '../components/experiments/Fractal/Fractal';
import ParticleNetwork from '../components/experiments/ParticleNetwork/ParticleNetwork';
import GameOfLife from '../components/experiments/GameOfLife/GameOfLife';
import FreqGuesser from '../components/games/FreqGuesser/FreqGuesser';

const paints: string[] = [];
beforeEach(() => {
    paints.length = 0;
    // Deliberately never run animation frames: snapshot updates suppress them.
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
        const context = {
            canvas: this,
            fillStyle: '', strokeStyle: '', globalAlpha: 1,
            setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(),
            moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), arc: vi.fn(),
            save: vi.fn(), restore: vi.fn(),
            fillRect() { paints.push(this.fillStyle); },
            fill() { paints.push(this.fillStyle); },
            stroke() { paints.push(this.strokeStyle); },
        };
        return context as unknown as CanvasRenderingContext2D;
    });
    document.documentElement.style.setProperty('--primary-color', '#292824');
    document.documentElement.style.setProperty('--secondary-color', '#706d66');
});

afterEach(() => {
    document.documentElement.removeAttribute('style');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

it.each([
    ['Chaos', <Chaos />],
    ['Fractal', <Fractal type="koch" depth={1} speed={1} angle={0} />],
    ['Particle network', <ParticleNetwork numParticles={2} connectionDistance={100} />],
    ['Cellular automaton', <GameOfLife speed={1} zoom={1} running={false} rules={{ survive: [2, 3], birth: [3] }} />],
    ['Frequency guesser', <FreqGuesser signal={new Float32Array([0, 1, 0])} components={1} />],
])('%s repaints theme colors synchronously even when animation frames are suspended', (_name, component) => {
    const { unmount } = render(component);
    paints.length = 0;
    document.documentElement.style.setProperty('--primary-color', '#e8e5de');
    document.documentElement.style.setProperty('--secondary-color', '#b0aca3');
    act(() => { window.dispatchEvent(new Event('themeStorage')); });
    // Blank cell grids paint their secondary color; other renderers paint primary.
    expect(paints.some(color => ['rgb(232, 229, 222)', 'rgb(176, 172, 163)'].includes(color))).toBe(true);
    expect(paints).not.toContain('rgb(41, 40, 36)');
    unmount();
    paints.length = 0;
    window.dispatchEvent(new Event('themeStorage'));
    expect(paints).toEqual([]);
});
