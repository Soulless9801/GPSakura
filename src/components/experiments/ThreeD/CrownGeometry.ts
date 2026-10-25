import * as THREE from 'three';

export type CrownShape = 'cluster' | 'cone' | 'frond';
const shapes = new WeakMap<THREE.BufferGeometry, CrownShape>();

// A small closed, ridged blade. Its long axis is Z; the ends curve downward.
function createFrondGeometry() {
    const positions: number[] = [];
    const indices: number[] = [];
    const sections = 6;
    for (let i = 0; i <= sections; i++) {
        const z = i / sections * 2 - 1;
        const width = Math.max(0.008, Math.sin(i / sections * Math.PI) * 0.35);
        const y = -0.28 * z * z;
        const ridge = width * 0.2;
        positions.push(0, y + ridge, z, width, y, z, 0, y - ridge, z, -width, y, z);
        if (i > 0) {
            for (let side = 0; side < 4; side++) {
                const a = (i - 1) * 4 + side;
                const b = (i - 1) * 4 + (side + 1) % 4;
                indices.push(a, a + 4, b, b, a + 4, b + 4);
            }
        }
    }
    indices.push(0, 1, 2, 0, 2, 3);
    const end = sections * 4;
    indices.push(end, end + 2, end + 1, end, end + 3, end + 2);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

export function createCrownGeometry(shape: CrownShape) {
    const geometry = shape === 'cone' ? new THREE.ConeGeometry(1, 2, 8)
        : shape === 'frond' ? createFrondGeometry() : new THREE.IcosahedronGeometry(1, 0);
    shapes.set(geometry, shape);
    return geometry;
}

/** Spawn inside each shape, including thin fronds, without allocating per particle. */
export function sampleCrownPoint(geometry: THREE.BufferGeometry, point: THREE.Vector3, random: () => number) {
    switch (shapes.get(geometry)) {
        case 'frond': {
            // Interpolate the same longitudinal sections used by the mesh.
            const position = 1 + random() * 4;
            const section = Math.min(4, Math.floor(position));
            const fraction = position - section;
            const z0 = section / 3 - 1;
            const z1 = (section + 1) / 3 - 1;
            const width = THREE.MathUtils.lerp(Math.sin(section / 6 * Math.PI), Math.sin((section + 1) / 6 * Math.PI), fraction) * 0.35;
            point.set((random() - 0.5) * width, THREE.MathUtils.lerp(-0.28 * z0 * z0, -0.28 * z1 * z1, fraction), THREE.MathUtils.lerp(z0, z1, fraction));
            return;
        }
        case 'cone': {
            const y = (random() - 0.5) * 1.2;
            const angle = random() * Math.PI * 2;
            const radius = Math.sqrt(random()) * (1 - y) * 0.3;
            point.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
            return;
        }
        default:
            point.set((random() - 0.5) * 0.6, (random() - 0.5) * 0.6, (random() - 0.5) * 0.6);
    }
}
