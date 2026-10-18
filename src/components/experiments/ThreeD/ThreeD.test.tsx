// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as THREE from 'three';
import ThreeD from './ThreeD';

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
vi.mock('/src/components/tools/ColorSelector/ColorSelector', () => ({
    default: ({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) => (
        <button onClick={() => { onChange('#123456'); }}>{label} {value}</button>
    ),
}));

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(cleanup);

it('switches models without rebuilding the renderer, preserves view/count and restores each palette', () => {
    const { unmount } = render(<ThreeD />);
    const [scene, camera] = rendering.render.mock.calls[0] as [THREE.Scene, THREE.PerspectiveCamera];
    const sakura = scene.getObjectByName('sakura') as THREE.Group;
    const previousBounds = new THREE.Box3().setFromObject(sakura).getBoundingSphere(new THREE.Sphere());
    const relativeView = camera.position.clone().sub(previousBounds.center).divideScalar(previousBounds.radius);
    const canvas = screen.getByLabelText('Interactive geometric sakura tree');
    fireEvent.click(screen.getByRole('button', { name: 'Leaves & blossoms #ef9fbc' }));
    const count = screen.getByRole('textbox');
    fireEvent.change(count, { target: { value: '73' } });
    fireEvent.blur(count);
    fireEvent.click(screen.getByRole('button', { name: 'Oak Tree', hidden: true }));
    expect(rendering.created).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Interactive geometric oak tree')).toBe(canvas);
    expect(sakura.parent).toBeNull();
    expect(sakura.children).toHaveLength(0);
    const oak = scene.getObjectByName('oak') as THREE.Group;
    const bounds = new THREE.Box3().setFromObject(oak).getBoundingSphere(new THREE.Sphere());
    expect(camera.position.clone().sub(bounds.center).divideScalar(bounds.radius).distanceTo(relativeView)).toBeLessThan(1e-10);
    expect(screen.getByRole('button', { name: 'Leaves & blossoms #658746' })).toBeTruthy();
    const particles = scene.children.find(child => child instanceof THREE.Group && child !== oak) as THREE.Group;
    expect(particles.children.filter(child => child.visible)).toHaveLength(73);
    fireEvent.click(screen.getByRole('button', { name: 'Sakura Tree', hidden: true }));
    expect(screen.getByRole('button', { name: 'Leaves & blossoms #123456' })).toBeTruthy();
    expect(oak.children).toHaveLength(0);
    unmount();
    expect(rendering.dispose).toHaveBeenCalledOnce();
});
