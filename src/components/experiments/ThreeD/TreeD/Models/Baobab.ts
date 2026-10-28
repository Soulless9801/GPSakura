import type { Branch, Crown, Point3, TreeDefinition } from '../TreeTemplate';

const limbs: Branch[] = [];
const tufts: Crown[] = [];
for (let i = 0; i < 5; i++) {
    const angle = i / 5 * Math.PI * 2 + 0.2;
    const elbow: Point3 = [Math.cos(angle) * 0.8, 3.45 + (i % 2) * 0.12, Math.sin(angle) * 0.8];
    const tip: Point3 = [Math.cos(angle) * 1.5, 4 + (i % 3) * 0.12, Math.sin(angle) * 1.5];
    limbs.push([[0, 2.85, 0], elbow, 0.25, 0.16], [elbow, tip, 0.16, 0.055]);
    tufts.push([[tip[0], tip[1] + 0.12, tip[2]], [0.78, 0.38, 0.72], [0, angle, 0]]);
}

export const baobab: TreeDefinition = {
    id: 'baobab',
    label: 'Baobab',
    colors: { foliage: '#7b914e', wood: '#96836d' },
    roots: { count: 6, reach: 1.05, height: 0.65, radius: 0.28 },
    groundLeaves: 8,
    branches: [
        [[0, 0.18, 0], [0.03, 1.2, 0], 0.75, 0.95],
        [[0.03, 1.2, 0], [0, 2.85, 0], 0.95, 0.4],
        [[0, 2.85, 0], [0.08, 3.8, -0.05], 0.4, 0.14],
        ...limbs,
    ],
    crowns: [
        [[0.08, 4, -0.05], [0.82, 0.42, 0.75], [0, 0.3, 0]],
        ...tufts,
    ],
};
