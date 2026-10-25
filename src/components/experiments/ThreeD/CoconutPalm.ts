import type { Crown, TreeDefinition } from './TreeTemplate';

const fronds: Crown[] = Array.from({ length: 9 }, (_, index) => {
    const angle = index / 9 * Math.PI * 2;
    const length = 1.05 + (index % 3) * 0.1;
    return [
        [0.55 + Math.sin(angle) * 0.92, 3.65 + (index % 2) * 0.12, 0.05 + Math.cos(angle) * 0.92],
        [1.1, 1, length],
        [0, angle, 0],
        'frond',
    ];
});

export const coconutPalm: TreeDefinition = {
    id: 'coconut-palm',
    label: 'Coconut Palm',
    colors: { foliage: '#6f9d48', wood: '#9b8060' },
    roots: { count: 5, reach: 0.45, height: 0.32, radius: 0.09 },
    groundLeaves: 4,
    branches: [
        [[-0.3, 0.18, 0], [-0.25, 1.35, 0], 0.24, 0.21],
        [[-0.25, 1.35, 0], [0.1, 2.55, 0.03], 0.21, 0.17],
        [[0.1, 2.55, 0.03], [0.55, 3.65, 0.05], 0.17, 0.14],
    ],
    crowns: [
        [[0.55, 3.66, 0.05], [0.3, 0.22, 0.3], [0, 0, 0]],
        ...fronds,
    ],
};
