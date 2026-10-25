/*
// import type { TreeDefinition } from './TreeTemplate';

// export const smallTree: TreeDefinition = {
//     id: 'small-tree',
//     label: 'Small Tree',
//     colors: { foliage: '#76945a', wood: '#70513c' },
//     branches: [
//         // start [x,y,z], end [x,y,z], bottom radius, top radius
//         [[0, 0.18, 0], [0, 2.4, 0], 0.3, 0.1],
//     ],
//     crowns: [
//         // center [x,y,z], scale [x,y,z], optional rotation [x,y,z] in radians
//         [[0, 2.5, 0], [1.3, 1, 1.3]],
//     ],
// };
*/

import * as THREE from 'three';
import { createWoodGeometry } from './WoodGeometry';
import { createCrownGeometry, type CrownShape } from './CrownGeometry';

export type Point3 = readonly [number, number, number];
export type Branch = readonly [from: Point3, to: Point3, bottomRadius: number, topRadius: number];
// Cone: radius 1, height 2 along Y. Frond: length 2 along Z. Omit shape for a faceted cluster.
export type Crown = readonly [position: Point3, scale: Point3, rotation?: Point3, shape?: CrownShape];

/** A model supplies its shape and palette; the template owns Three.js resources. */
export interface TreeDefinition {
    id: string;
    label: string;
    colors: { foliage: string; wood: string };
    branches: readonly Branch[];
    crowns: readonly Crown[];
    roots?: { count: number; reach: number; height: number; radius: number };
    groundLeaves?: number;
}

export function createTreeModel(definition: TreeDefinition) {
    const tree = new THREE.Group();
    tree.name = definition.id;
    const wood = new THREE.MeshStandardMaterial({ color: definition.colors.wood, roughness: 1, flatShading: true });
    const foliage = new THREE.MeshStandardMaterial({ color: definition.colors.foliage, roughness: 1, flatShading: true });
    const stone = new THREE.MeshStandardMaterial({ color: '#bdb6a5', roughness: 1, flatShading: true });
    const geometries = new Set<THREE.BufferGeometry>();

    function mesh(geometry: THREE.BufferGeometry, material: THREE.Material) {
        geometries.add(geometry);
        const part = new THREE.Mesh(geometry, material);
        tree.add(part);
        return part;
    }

    // Shared stage dimensions match the falling-leaf landing area.
    const base = mesh(new THREE.CylinderGeometry(2.65, 2.8, 0.18, 10), stone);
    base.position.y = 0.09;
    mesh(createWoodGeometry(definition), wood);

    const crownGeometries = new Map<CrownShape, THREE.BufferGeometry>();
    const canopies = definition.crowns.map(([position, scale, rotation, shape = 'cluster'], index) => {
        let crownGeometry = crownGeometries.get(shape);
        if (!crownGeometry) {
            crownGeometry = createCrownGeometry(shape);
            crownGeometries.set(shape, crownGeometry);
        }
        const crown = mesh(crownGeometry, foliage);
        crown.position.set(...position);
        crown.scale.set(...scale);
        crown.rotation.set(...(rotation ?? (shape === 'cluster' ? [0.13 * index, 0.7 * index, 0.17 * index] : [0, 0, 0])));
        return crown;
    });
    // Track the shared petal geometry even when a model has no ground leaves.
    const petalGeometry = new THREE.IcosahedronGeometry(0.11, 0);
    geometries.add(petalGeometry);
    for (let i = 0; i < (definition.groundLeaves ?? 16); i++) {
        const angle = i * 2.4;
        const radius = 0.9 + (i % 4) * 0.4;
        const petal = mesh(petalGeometry, foliage);
        petal.position.set(Math.cos(angle) * radius, 0.23, Math.sin(angle) * radius);
        petal.scale.set(1, 0.3, 0.7);
        petal.rotation.y = angle;
    }

    return {
        tree, wood, foliage, canopies,
        dispose() {
            for (const geometry of geometries) {geometry.dispose();}
            wood.dispose();
            foliage.dispose();
            stone.dispose();
            tree.clear();
        },
    };
}

export type TreeModel = ReturnType<typeof createTreeModel>;
