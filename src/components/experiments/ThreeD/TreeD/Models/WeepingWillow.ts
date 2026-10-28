import type { Branch, Crown, Point3, TreeDefinition } from '../TreeTemplate';

const limbs: Branch[] = [];
const curtains: Crown[] = [];
for (let i = 0; i < 10; i++) {
    const angle = i / 10 * Math.PI * 2;
    const height = 3.2 + Math.sin(i * 1.8) * 0.15;
    const elbow: Point3 = [Math.cos(angle) * 0.8, 2.8, Math.sin(angle) * 0.8];
    const tip: Point3 = [Math.cos(angle) * 1.5, height, Math.sin(angle) * 1.5];
    limbs.push([[0.1, 2.15, 0], elbow, 0.13, 0.08], [elbow, tip, 0.08, 0.025]);
    curtains.push([
        [Math.cos(angle) * 1.55, height - 0.8, Math.sin(angle) * 1.55],
        [0.43, 1.3 + (i % 3) * 0.08, 0.43],
        [0.03 * Math.sin(angle), angle, 0.03 * Math.cos(angle)],
    ]);
}

export const weepingWillow: TreeDefinition = {
    id: 'weeping-willow',
    label: 'Weeping Willow',
    colors: { foliage: '#93a958', wood: '#75634b' },
    roots: { count: 6, reach: 0.9, height: 0.65, radius: 0.21 },
    groundLeaves: 14,
    branches: [
        [[0, 0.18, 0], [-0.12, 1.15, 0], 0.4, 0.3],
        [[-0.12, 1.15, 0], [0.1, 2.15, 0], 0.3, 0.21],
        [[0.1, 2.15, 0], [0, 3.25, 0], 0.21, 0.07],
        ...limbs,
    ],
    crowns: [
        [[0, 3.45, 0], [1.3, 0.6, 1.25], [0, 0, 0]],
        [[-0.8, 3.25, 0.35], [0.95, 0.5, 0.85], [0, 0.5, 0]],
        [[0.8, 3.3, -0.35], [0.95, 0.5, 0.85], [0, -0.4, 0]],
        ...curtains,
    ],
};
