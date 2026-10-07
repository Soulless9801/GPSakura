import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Particle } from "./particle";

const canvas = { clientWidth: 200, clientHeight: 100 } as unknown as HTMLCanvasElement;

describe("Particle", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(1_000_000);
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    function make(speed = 2, radius = 3): Particle {
        return new Particle(canvas, speed, radius);
    }

    it("spawns inside the canvas with speed at most `speed`", () => {
        for (let i = 0; i < 200; i++) {
            const p = make(5);
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x).toBeLessThan(200);
            expect(p.y).toBeGreaterThanOrEqual(0);
            expect(p.y).toBeLessThan(100);
            expect(Math.hypot(p.vx, p.vy)).toBeCloseTo(p.s, 6);
            expect(p.s).toBeLessThanOrEqual(5);
        }
    });

    it("does not move while frozen, and moves once the freeze has elapsed", () => {
        const p = make();
        p.x = 50;
        p.y = 50;
        p.vx = 1;
        p.vy = 0;
        p.move(16, canvas);
        expect(p.x).toBe(50);

        vi.advanceTimersByTime(300);
        p.s = 1;
        p.move(16, canvas);
        expect(p.x).toBeCloseTo(51, 6);
        expect(p.y).toBeCloseTo(50, 6);
    });

    it("addFreeze() freezes it again", () => {
        const p = make();
        vi.advanceTimersByTime(1000);
        p.x = 50;
        p.y = 50;
        p.vx = 1;
        p.vy = 0;
        p.s = 1;
        p.addFreeze();
        p.move(16, canvas);
        expect(p.x).toBe(50);
    });

    it("scales displacement by dt / 16", () => {
        const p = make();
        vi.advanceTimersByTime(1000);
        p.x = 50;
        p.y = 50;
        p.vx = 2;
        p.vy = 0;
        p.s = 2;
        p.move(32, canvas);
        expect(p.x).toBeCloseTo(54, 6);
    });

    it("bounces off the right wall, reversing velocity", () => {
        const p = make(2, 3);
        vi.advanceTimersByTime(1000);
        p.x = 196;
        p.y = 50;
        p.vx = 5;
        p.vy = 0;
        p.s = 5;
        p.move(16, canvas);
        expect(p.x).toBeLessThanOrEqual(200 - 3);
        expect(p.vx).toBeLessThan(0);
    });

    it("bounces off the left wall, keeping the particle inside", () => {
        const p = make(2, 3);
        vi.advanceTimersByTime(1000);
        p.x = 4;
        p.y = 50;
        p.vx = -5;
        p.vy = 0;
        p.s = 5;
        p.move(16, canvas);
        expect(p.x).toBeGreaterThanOrEqual(3);
        expect(p.vx).toBeGreaterThan(0);
    });

    it("bounces vertically too", () => {
        const p = make(2, 3);
        vi.advanceTimersByTime(1000);
        p.x = 100;
        p.y = 98;
        p.vx = 0;
        p.vy = 5;
        p.s = 5;
        p.move(16, canvas);
        expect(p.y).toBeLessThanOrEqual(100 - 3);
        expect(p.vy).toBeLessThan(0);
    });

    it("keeps its speed constant after a move", () => {
        const p = make(4);
        vi.advanceTimersByTime(1000);
        for (let i = 0; i < 100; i++) {
            p.move(16, canvas);
            expect(Math.hypot(p.vx, p.vy)).toBeCloseTo(p.s, 5);
        }
    });

    // adjustSpeed divides by the current speed, so a particle whose velocity is exactly
    // zero (s = 0 is possible because s = random * speed) turns into NaN and vanishes.
    it.fails("KNOWN BUG: a zero-velocity particle stays at a finite position", () => {
        const p = make(0);
        vi.advanceTimersByTime(1000);
        p.x = 50;
        p.y = 50;
        p.move(16, canvas);
        expect(Number.isFinite(p.vx)).toBe(true);
    });

    it("draws a filled circle", () => {
        const ctx = {
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            fillStyle: "",
        };
        const p = make(1, 4);
        p.x = 10;
        p.y = 20;
        p.draw(ctx as unknown as CanvasRenderingContext2D, "rgb(1, 2, 3)");
        expect(ctx.beginPath).toHaveBeenCalledOnce();
        expect(ctx.arc).toHaveBeenCalledWith(10, 20, 4, 0, Math.PI * 2);
        expect(ctx.fillStyle).toBe("rgb(1, 2, 3)");
        expect(ctx.fill).toHaveBeenCalledOnce();
    });
});
