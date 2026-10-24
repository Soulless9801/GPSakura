import { describe, expect, it } from 'vitest';
import { createWoodGeometry } from './WoodGeometry';
import type { TreeDefinition } from './TreeTemplate';

const bentTree: TreeDefinition = {
    id: 'bent', label: 'Bent trunk', colors: { foliage: '#ffffff', wood: '#654321' },
    branches: [
        [[0, 0.18, 0], [0, 1.5, 0], 0.3, 0.22],
        [[0, 1.5, 0], [0.8, 2.5, 0], 0.22, 0.08],
    ],
    crowns: [], roots: { count: 0, reach: 1, height: 0.7, radius: 0.2 },
};

describe('continuous tree wood', () => {
    it('joins an angled chain into one closed surface with no internal caps', () => {
        const geometry = createWoodGeometry(bentTree);
        const positions = geometry.getAttribute('position');
        const indices = geometry.getIndex();
        if (!indices) {throw new Error('Expected indexed wood geometry');}
        const neighbors = Array.from({ length: positions.count }, () => new Set<number>());
        const edges = new Map<string, number>();
        for (let i = 0; i < indices.count; i += 3) {
            const triangle = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)];
            for (let side = 0; side < 3; side++) {
                const a = triangle[side], b = triangle[(side + 1) % 3];
                neighbors[a].add(b);
                neighbors[b].add(a);
                const key = `${String(Math.min(a, b))}:${String(Math.max(a, b))}`;
                edges.set(key, (edges.get(key) ?? 0) + 1);
            }
        }
        const visited = new Set<number>();
        const pending = [0];
        while (pending.length) {
            const vertex = pending.pop() as number;
            if (visited.has(vertex)) {continue;}
            visited.add(vertex);
            pending.push(...neighbors[vertex]);
        }
        expect(visited.size).toBe(positions.count);
        expect([...edges.values()].every(count => count === 2)).toBe(true);
        // A cylinder cap would put a vertex at the bend's center.
        for (let i = 0; i < positions.count; i++) {
            expect(Math.hypot(positions.getX(i), positions.getY(i) - 1.5, positions.getZ(i))).toBeGreaterThan(0.1);
        }
        expect([...positions.array].every(Number.isFinite)).toBe(true);
        geometry.dispose();
    });

    it('spreads tapered roots across the ground without placing their underside below it', () => {
        const trunkOnly = { ...bentTree, branches: [bentTree.branches[0]] };
        const trunk = createWoodGeometry(trunkOnly);
        const rooted = createWoodGeometry({ ...trunkOnly, roots: { count: 5, reach: 1, height: 0.7, radius: 0.2 } });
        const positions = rooted.getAttribute('position');
        let maximumReach = 0;
        for (let i = trunk.getAttribute('position').count; i < positions.count; i++) {
            expect(positions.getY(i)).toBeGreaterThanOrEqual(0.18 - 1e-6);
            maximumReach = Math.max(maximumReach, Math.hypot(positions.getX(i), positions.getZ(i)));
        }
        expect(maximumReach).toBeGreaterThan(1);
        expect(maximumReach).toBeLessThan(1.6);
        rooted.dispose();
        trunk.dispose();
    });
});
