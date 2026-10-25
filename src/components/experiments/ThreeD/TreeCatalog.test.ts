import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TREE_MODELS } from './models';
import { createTreeModel } from './TreeTemplate';

describe('playground tree catalog', () => {
    it('gives every option a distinct stable ID and label', () => {
        expect(new Set(TREE_MODELS.map(model => model.id)).size).toBe(TREE_MODELS.length);
        expect(new Set(TREE_MODELS.map(model => model.label)).size).toBe(TREE_MODELS.length);
        for (const model of TREE_MODELS) {
            expect(model.id).toMatch(/^[a-z][a-z0-9-]*$/);
            expect(model.label.trim().length).toBeGreaterThan(0);
        }
    });

    it.each(TREE_MODELS)('builds a finite, bounded, lightweight $label', definition => {
        expect(definition.branches.length).toBeGreaterThan(0);
        expect(definition.crowns.length).toBeGreaterThan(0);
        for (const [start, end, bottom, top] of definition.branches) {
            expect(new THREE.Vector3(...start).distanceTo(new THREE.Vector3(...end))).toBeGreaterThan(1e-5);
            expect(bottom).toBeGreaterThan(0);
            expect(top).toBeGreaterThan(0);
        }
        const model = createTreeModel(definition);
        let triangles = 0;
        let meshes = 0;
        model.tree.traverse(child => {
            if (!(child instanceof THREE.Mesh)) {return;}
            meshes++;
            const geometry = child.geometry as THREE.BufferGeometry;
            const positions = geometry.getAttribute('position');
            expect(positions.count).toBeGreaterThan(0);
            expect([...positions.array].every(Number.isFinite)).toBe(true);
            const normals = geometry.getAttribute('normal');
            expect([...normals.array].every(Number.isFinite)).toBe(true);
            const indices = geometry.getIndex();
            triangles += (indices?.count ?? positions.count) / 3;
            if (indices) {
                expect([...indices.array].every(index => index >= 0 && index < positions.count)).toBe(true);
            }
        });
        // Keep each selectable tree comfortably below a modest low-poly scene budget.
        expect(triangles).toBeLessThan(20_000);
        expect(meshes).toBeLessThan(80);
        const bounds = new THREE.Box3().setFromObject(model.tree);
        const size = bounds.getSize(new THREE.Vector3());
        expect([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)).toBe(true);
        expect(size.y).toBeGreaterThan(1);
        expect(size.y).toBeLessThan(8);
        expect(Math.max(size.x, size.z)).toBeLessThan(8);
        expect(bounds.min.y).toBeGreaterThanOrEqual(-0.1);
        model.dispose();
    });
});
