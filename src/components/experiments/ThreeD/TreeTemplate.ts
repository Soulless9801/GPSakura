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

export type Point3 = readonly [number, number, number];
export type Branch = readonly [from: Point3, to: Point3, bottomRadius: number, topRadius: number];
export type Crown = readonly [position: Point3, scale: Point3, rotation?: Point3];

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

    function branch([from, to, bottom, top]: Branch) {
        const start = new THREE.Vector3(...from);
        const end = new THREE.Vector3(...to);
        const direction = end.clone().sub(start);
        const part = mesh(new THREE.CylinderGeometry(top, bottom, direction.length(), 6), wood);
        part.position.copy(start.add(end).multiplyScalar(0.5));
        part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    }

    // Shared stage dimensions match the falling-leaf landing area.
    const base = mesh(new THREE.CylinderGeometry(2.65, 2.8, 0.18, 10), stone);
    base.position.y = 0.09;
    definition.branches.forEach(branch);
    const roots = definition.roots ?? { count: 5, reach: 0.75, height: 0.55, radius: 0.18 };
    for (let i = 0; i < roots.count; i++) {
        const angle = i * Math.PI * 2 / roots.count;
        branch([[Math.cos(angle) * roots.reach, 0.2, Math.sin(angle) * roots.reach], [0, roots.height, 0], 0.035, roots.radius]);
    }

    const crownGeometry = new THREE.IcosahedronGeometry(1, 1);
    const canopies = definition.crowns.map(([position, scale, rotation], index) => {
        const crown = mesh(crownGeometry, foliage);
        crown.position.set(...position);
        crown.scale.set(...scale);
        crown.rotation.set(...(rotation ?? [0.13 * index, 0.7 * index, 0.17 * index]));
        return crown;
    });
    // Track shared geometries even when a model has no crowns or ground leaves.
    geometries.add(crownGeometry);
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
