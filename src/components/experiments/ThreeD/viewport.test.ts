import { describe, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Vector2, Vector3, type WebGLRenderer } from 'three';
import { syncViewport } from './viewport';

function fixture(width: number, height: number, ratio = 1) {
    const size = new Vector2(width, height);
    const renderer = {
        getSize: (target: Vector2) => target.copy(size),
        getPixelRatio: () => ratio,
        setPixelRatio: vi.fn(),
        setSize: vi.fn(),
    };
    const element = {
        getBoundingClientRect: () => ({ width, height }),
    } as HTMLElement;
    return { renderer, element, camera: new PerspectiveCamera(40, 1, 0.1, 100) };
}

describe('3D viewport sizing', () => {
    it.each([[300, 150], [320, 600], [1450.5, 440.25]])(
        'keeps equal world distances equally scaled at %s × %s, even without a buffer resize',
        (width, height) => {
            const { renderer, element, camera } = fixture(width, height);
            syncViewport(renderer as unknown as WebGLRenderer, camera, element, 1);
            const origin = new Vector3(0, 0, -5).project(camera);
            const horizontal = new Vector3(1, 0, -5).project(camera);
            const vertical = new Vector3(0, 1, -5).project(camera);
            expect((horizontal.x - origin.x) * width).toBeCloseTo((vertical.y - origin.y) * height, 8);
            expect(renderer.setSize).not.toHaveBeenCalled();
        },
    );

    it('updates the buffer for a density change even when CSS size is unchanged', () => {
        const { renderer, element, camera } = fixture(400.5, 600.25);
        syncViewport(renderer as unknown as WebGLRenderer, camera, element, 3);
        expect(renderer.setPixelRatio).toHaveBeenCalledWith(2);
        expect(renderer.setSize).toHaveBeenCalledWith(400.5, 600.25, false);
        expect(camera.aspect).toBe(400.5 / 600.25);
    });

    it('updates both dimensions after a container layout change', () => {
        const { renderer, element, camera } = fixture(800, 400);
        element.getBoundingClientRect = () => ({ width: 350, height: 500 }) as DOMRect;
        syncViewport(renderer as unknown as WebGLRenderer, camera, element, 1);
        expect(renderer.setSize).toHaveBeenCalledWith(350, 500, false);
        expect(camera.aspect).toBe(0.7);
    });

    it('does not replace the projection with invalid dimensions while hidden', () => {
        const { renderer, element, camera } = fixture(0, 0);
        syncViewport(renderer as unknown as WebGLRenderer, camera, element, 2);
        expect(camera.aspect).toBe(1);
        expect(renderer.setSize).not.toHaveBeenCalled();
    });
});
