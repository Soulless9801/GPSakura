import type { TreeDefinition } from '../TreeTemplate';

// Overlapping tiers and a single leader keep the evergreen silhouette legible.
export const norwaySpruce: TreeDefinition = {
    id: 'norway-spruce',
    label: 'Norway Spruce',
    colors: { foliage: '#315e49', wood: '#70503d' },
    roots: { count: 5, reach: 0.6, height: 0.45, radius: 0.13 },
    groundLeaves: 6,
    branches: [
        [[0, 0.18, 0], [0, 1.4, 0], 0.25, 0.18],
        [[0, 1.4, 0], [0, 2.8, 0], 0.18, 0.1],
        [[0, 2.8, 0], [0, 4.6, 0], 0.1, 0.025],
    ],
    crowns: [
        [[0, 1.6, 0], [1.65, 1, 1.65], [0, 0, 0], 'cone'],
        [[0, 2.4, 0], [1.35, 1.05, 1.35], [0, 0.3, 0], 'cone'],
        [[0, 3.2, 0], [1, 1, 1], [0, 0.1, 0], 'cone'],
        [[0, 3.95, 0], [0.65, 0.85, 0.65], [0, 0.4, 0], 'cone'],
    ],
};
