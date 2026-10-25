import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createCrownGeometry, sampleCrownPoint, type CrownShape } from './CrownGeometry';

describe('shared crown shapes', () => {
    it.each<CrownShape>(['cluster', 'cone', 'frond'])('spawns particles inside the closed %s surface', shape => {
        const geometry = createCrownGeometry(shape);
        const material = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.updateMatrixWorld(true);
        const point = new THREE.Vector3();
        const ray = new THREE.Raycaster();
        let seed = 17;
        const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < 100; i++) {
            sampleCrownPoint(geometry, point, random);
            for (const direction of [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0)]) {
                ray.set(point, direction);
                const hits = ray.intersectObject(mesh);
                expect(hits.length).toBeGreaterThan(0);
                expect(hits[0].distance).toBeGreaterThan(0);
            }
        }
        geometry.dispose();
        material.dispose();
    });
});
