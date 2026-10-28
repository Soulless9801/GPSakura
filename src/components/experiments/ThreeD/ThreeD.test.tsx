// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import * as THREE from 'three';
import ThreeD from './ThreeD';
import { TREE_MODELS } from './TreeD';

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

it('cycles the entire catalog while preserving palettes, particle count, canvas, and relative view', () => {
    const { container, unmount } = render(<ThreeD />);
    const [scene, camera] = rendering.render.mock.calls[0] as [THREE.Scene, THREE.PerspectiveCamera];
    const canvas = container.querySelector('canvas');
    const initialTree = scene.getObjectByName(TREE_MODELS[0].id) as THREE.Group;
    const initialBounds = new THREE.Box3().setFromObject(initialTree).getBoundingSphere(new THREE.Sphere());
    const initialView = camera.position.clone().sub(initialBounds.center).divideScalar(initialBounds.radius);
    const count = screen.getByRole('textbox');
    fireEvent.change(count, { target: { value: '73' } });
    fireEvent.blur(count);
    const options = container.querySelector('.customSelectOptions');
    if (!(options instanceof HTMLElement)) {throw new Error('Missing model options');}
    let previous = initialTree;

    for (let pass = 0; pass < 2; pass++) {
        for (const definition of TREE_MODELS) {
            fireEvent.click(within(options).getByRole('button', { name: definition.label, hidden: true }));
            const current = scene.getObjectByName(definition.id) as THREE.Group;
            expect(current).toBeTruthy();
            if (previous !== current) {
                expect(previous.parent).toBeNull();
                expect(previous.children).toHaveLength(0);
            }
            expect(container.querySelector('canvas')).toBe(canvas);
            expect(screen.getByLabelText(`Interactive geometric ${definition.label.toLowerCase()}`)).toBe(canvas);
            expect(rendering.created).toHaveBeenCalledOnce();
            expect(scene.children.filter(child => child instanceof THREE.Group)).toHaveLength(2);
            const particles = scene.children.find(child => child instanceof THREE.Group && child !== current) as THREE.Group;
            expect(particles.children.filter(child => child.visible)).toHaveLength(73);
            const bounds = new THREE.Box3().setFromObject(current).getBoundingSphere(new THREE.Sphere());
            expect(camera.position.clone().sub(bounds.center).divideScalar(bounds.radius).distanceTo(initialView)).toBeLessThan(1e-10);
            const foliageColor = pass === 0 ? definition.colors.foliage : '#123456';
            const woodColor = pass === 0 ? definition.colors.wood : '#123456';
            fireEvent.click(screen.getByRole('button', { name: `Leaves & blossoms ${foliageColor}` }));
            fireEvent.click(screen.getByRole('button', { name: `Wood ${woodColor}` }));
            previous = current;
        }
    }
    unmount();
    expect(previous.children).toHaveLength(0);
    expect(rendering.dispose).toHaveBeenCalledOnce();
});
