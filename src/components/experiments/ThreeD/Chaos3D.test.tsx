// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import * as THREE from 'three';
import { Chaos3D } from './ThreeD';

const rendering = vi.hoisted(() => ({ created: vi.fn(), render: vi.fn(), dispose: vi.fn() }));
vi.mock('three', async importOriginal => {
    const actual = await importOriginal<typeof THREE>();
    return {
        ...actual,
        WebGLRenderer: class {
            constructor() { rendering.created(); }
            render = rendering.render;
            dispose = rendering.dispose;
            getSize(target: THREE.Vector2) { return target.set(300, 150); }
            getPixelRatio() { return 1; }
            setPixelRatio() {}
            setSize() {}
            setViewport() {}
        },
    };
});
vi.mock('three/addons/controls/OrbitControls.js', () => ({
    OrbitControls: class {
        target = new THREE.Vector3();
        reset() {}
        update() {}
        dispose() {}
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('devicePixelRatio', 1);
});
afterEach(cleanup);

describe('Chaos3D', () => {
    const fakeAttractor = {
        dims: 3 as const,
        params: { sigma: 10, rho: 28, beta: 8 / 3 },
        step: (_x: number, _y: number, _z: number, _p: Record<string, number>) => [0, 0, 0] as [number, number, number],
        speedFactor: 5000,
        scaleFactor: 5,
        start: { x: 0.1, y: 0.1, z: 0.1 },
        view: { x: -30, y: 30, z: 0 },
    };

    it('renders without crashing with valid maxdepth', () => {
        expect(() => {
            render(<Chaos3D 
                attractor={fakeAttractor} 
                maxdepth={10000}
                startColor="#0000ff"
                endColor="#ff0000"
            />);
        }).not.toThrow();
    });

    it('handles invalid maxdepth gracefully without memory allocation issues', () => {
        // Test with Infinity - this should not cause a crash or excessive memory allocation
        expect(() => {
            render(<Chaos3D 
                attractor={fakeAttractor} 
                maxdepth={Infinity}
                startColor="#0000ff"
                endColor="#ff0000"
            />);
        }).not.toThrow();
        
        // Test with NaN - this should not cause a crash or excessive memory allocation  
        expect(() => {
            render(<Chaos3D 
                attractor={fakeAttractor} 
                maxdepth={NaN}
                startColor="#0000ff"
                endColor="#ff0000"
            />);
        }).not.toThrow();
        
        // Test with negative value - this should not cause a crash or excessive memory allocation
        expect(() => {
            render(<Chaos3D 
                attractor={fakeAttractor} 
                maxdepth={-100}
                startColor="#0000ff"
                endColor="#ff0000"
            />);
        }).not.toThrow();
        
        // Test with zero value - this should not cause a crash or excessive memory allocation
        expect(() => {
            render(<Chaos3D 
                attractor={fakeAttractor} 
                maxdepth={0}
                startColor="#0000ff"
                endColor="#ff0000"
            />);
        }).not.toThrow();
    });
});