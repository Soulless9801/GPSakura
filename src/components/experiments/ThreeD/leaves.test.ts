import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createFallingLeaves, MAX_LEAF_COUNT } from './FallingLeaves';

function setup() {
    const canopy = new THREE.Mesh();
    canopy.position.set(1, 3, 0);
    const leaves = createFallingLeaves([canopy], '#ef9fbc', () => 0.5);
    leaves.setCount(1);
    const mesh = leaves.group.children[0] as THREE.Mesh<THREE.OctahedronGeometry, THREE.MeshStandardMaterial>;
    return { leaves, mesh };
}

describe('falling leaf particles', () => {
    it('falls, lands flat, fades slowly, and respawns inside the canopy using the same mesh', () => {
        const { leaves, mesh } = setup();
        const initialHeight = mesh.position.y;
        leaves.update(1);
        expect(mesh.position.y).toBeLessThan(initialHeight);
        leaves.update(1.75); // Seeded age 6.75 + 2.75 = 9.5 second landing.
        expect(mesh.position.y).toBeCloseTo(0.205);
        expect(mesh.rotation.x).toBeCloseTo(0);
        expect(mesh.rotation.z).toBeCloseTo(0);
        expect(mesh.material.opacity).toBe(1);
        leaves.update(1); // Pause on the ground before fading.
        expect(mesh.material.opacity).toBe(1);
        leaves.update(1.5);
        expect(mesh.material.opacity).toBeCloseTo(0.5);
        expect(mesh.position.y).toBeCloseTo(0.205);
        leaves.update(1.5);
        expect(leaves.group.children[0]).toBe(mesh);
        expect(mesh.position.toArray()).toEqual([1, 3, 0]);
        expect(mesh.material.opacity).toBe(0);
        leaves.dispose();
    });

    it('keeps a bounded pool while changing the exact active count, including zero', () => {
        const { leaves, mesh } = setup();
        leaves.setCount(80);
        expect(leaves.group.children.filter(part => part.visible)).toHaveLength(80);
        leaves.update(80);
        expect(leaves.group.children).toHaveLength(MAX_LEAF_COUNT);
        expect(leaves.group.children[0]).toBe(mesh);
        leaves.setCount(0);
        const position = mesh.position.clone();
        leaves.update(5);
        expect(mesh.position.equals(position)).toBe(true);
        expect(leaves.group.children.every(part => !part.visible)).toBe(true);
        leaves.setCount(10000);
        expect(leaves.group.children.filter(part => part.visible)).toHaveLength(MAX_LEAF_COUNT);
        leaves.dispose();
    });

    it('produces the same motion at different frame rates', () => {
        const first = setup();
        const second = setup();
        for (let i = 0; i < 60; i++) {first.leaves.update(1 / 60);}
        for (let i = 0; i < 120; i++) {second.leaves.update(1 / 120);}
        expect(first.mesh.position.distanceTo(second.mesh.position)).toBeLessThan(1e-10);
        expect(first.mesh.material.opacity).toBeCloseTo(second.mesh.material.opacity);
        first.leaves.dispose();
        second.leaves.dispose();
    });

    it('updates the color of active and inactive particles', () => {
        const { leaves } = setup();
        leaves.setColor('#65a98b');
        leaves.setCount(MAX_LEAF_COUNT);
        for (const child of leaves.group.children) {
            const mesh = child as THREE.Mesh<THREE.OctahedronGeometry, THREE.MeshStandardMaterial>;
            expect(mesh.material.color.getHexString()).toBe('65a98b');
        }
        leaves.dispose();
    });

    it('disposes the shared geometry once and every particle material', () => {
        const { leaves, mesh } = setup();
        const geometryDispose = vi.spyOn(mesh.geometry, 'dispose');
        const disposers = leaves.group.children.map(child => vi.spyOn((child as typeof mesh).material, 'dispose'));
        leaves.dispose();
        expect(geometryDispose).toHaveBeenCalledOnce();
        for (const dispose of disposers) {expect(dispose).toHaveBeenCalledOnce();}
        expect(leaves.group.children).toHaveLength(0);
    });

    it('recreates the same seeded particles and trajectories through multiple respawns', () => {
        const canopy = new THREE.Mesh();
        canopy.position.y = 3;
        const first = createFallingLeaves([canopy], '#ffffff', 'sakura');
        const second = createFallingLeaves([canopy], '#123456', 'sakura');
        const other = createFallingLeaves([canopy], '#ffffff', 'oak');
        for (const pool of [first, second, other]) {pool.setCount(10);}
        expect(first.group.children[0].position.equals(second.group.children[0].position)).toBe(true);
        expect(first.group.children[0].position.equals(other.group.children[0].position)).toBe(false);
        first.update(90);
        for (let i = 0; i < 90 * 60; i++) {second.update(1 / 60);}
        for (let i = 0; i < 10; i++) {
            const a = first.group.children[i] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
            const b = second.group.children[i] as typeof a;
            expect(a.position.distanceTo(b.position)).toBeLessThan(1e-9);
            expect(a.rotation.x).toBeCloseTo(b.rotation.x, 9);
            expect(a.rotation.y).toBeCloseTo(b.rotation.y, 9);
            expect(a.rotation.z).toBeCloseTo(b.rotation.z, 9);
            expect(a.material.opacity).toBeCloseTo(b.material.opacity, 9);
        }
        for (const pool of [first, second, other]) {pool.dispose();}
        canopy.geometry.dispose();
        (canopy.material as THREE.Material).dispose();
    });

    it('uses deterministic defaults and keeps existing leaves independent of extra particles', () => {
        const canopy = new THREE.Mesh();
        canopy.position.y = 3;
        const small = createFallingLeaves([canopy], '#ffffff');
        const large = createFallingLeaves([canopy], '#ffffff');
        small.setCount(1);
        large.setCount(MAX_LEAF_COUNT);
        for (const pool of [small, large]) {pool.update(100);}
        expect(small.group.children[0].position.equals(large.group.children[0].position)).toBe(true);
        small.dispose();
        large.dispose();
        canopy.geometry.dispose();
        (canopy.material as THREE.Material).dispose();
    });
});
