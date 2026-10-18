import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createTreeModel, type TreeDefinition } from './TreeTemplate';
import { TREE_MODELS } from './models';
import { createFallingLeaves } from './FallingLeaves';

describe('tree model template', () => {
    it('builds a new model from shape data without a custom factory', () => {
        const definition: TreeDefinition = {
            id: 'test-tree', label: 'Test tree', colors: { foliage: '#123456', wood: '#654321' },
            branches: [[[0, 0.18, 0], [0, 2, 0], 0.3, 0.1]],
            crowns: [[[0, 2, 0], [1, 1, 1]]],
            roots: { count: 0, reach: 0, height: 0, radius: 0 }, groundLeaves: 0,
        };
        const model = createTreeModel(definition);
        expect(model.tree.children).toHaveLength(3); // platform, trunk, crown
        expect(model.foliage.color.getHexString()).toBe('123456');
        expect(model.wood.color.getHexString()).toBe('654321');
        expect(model.canopies[0].position.toArray()).toEqual([0, 2, 0]);
        model.dispose();
    });

    it.each(TREE_MODELS)('provides leaf spawn surfaces and releases all $label resources', definition => {
        const model = createTreeModel(definition);
        const leaves = createFallingLeaves(model.canopies, definition.colors.foliage);
        leaves.setCount(20);
        leaves.update(1);
        expect(leaves.group.children.filter(child => child.visible)).toHaveLength(20);
        for (const child of leaves.group.children.filter(child => child.visible)) {
            expect(child.position.toArray().every(Number.isFinite)).toBe(true);
            expect(child.position.y).toBeGreaterThanOrEqual(0.205);
        }
        const geometries = new Set<THREE.BufferGeometry>();
        const materials = new Set<THREE.Material>();
        model.tree.traverse(child => {
            if (child instanceof THREE.Mesh) {
                geometries.add(child.geometry as THREE.BufferGeometry);
                materials.add(child.material as THREE.Material);
            }
        });
        const disposers = [...geometries, ...materials].map(resource => vi.spyOn(resource, 'dispose'));
        model.dispose();
        for (const dispose of disposers) {expect(dispose).toHaveBeenCalledOnce();}
        expect(model.tree.children).toHaveLength(0);
        leaves.dispose();
    });

    it('keeps palettes and resources independent between model instances', () => {
        const first = createTreeModel(TREE_MODELS[0]);
        const second = createTreeModel(TREE_MODELS[0]);
        first.foliage.color.set('#ffffff');
        expect(second.foliage.color.getHexString()).toBe(TREE_MODELS[0].colors.foliage.slice(1));
        first.dispose();
        expect(second.tree.children.length).toBeGreaterThan(0);
        second.dispose();
    });
});
