import * as THREE from 'three';

type Point = [number, number, number];

export const DEFAULT_BLOSSOM_COLOR = '#ef9fbc';
export const DEFAULT_WOOD_COLOR = '#735044';

export function createSakuraTree() {
    const tree = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: DEFAULT_WOOD_COLOR, roughness: 1, flatShading: true });
    const blossoms = new THREE.MeshStandardMaterial({ color: DEFAULT_BLOSSOM_COLOR, roughness: 1, flatShading: true });
    const stone = new THREE.MeshStandardMaterial({ color: '#bdb6a5', roughness: 1, flatShading: true });
    const geometries = new Set<THREE.BufferGeometry>();

    function mesh(geometry: THREE.BufferGeometry, material: THREE.Material) {
        geometries.add(geometry);
        const part = new THREE.Mesh(geometry, material);
        tree.add(part);
        return part;
    }

    function branch(from: Point, to: Point, bottom: number, top: number) {
        const start = new THREE.Vector3(...from);
        const end = new THREE.Vector3(...to);
        const direction = end.clone().sub(start);
        const part = mesh(new THREE.CylinderGeometry(top, bottom, direction.length(), 6), wood);
        part.position.copy(start.add(end).multiplyScalar(0.5));
        part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    }

    const base = mesh(new THREE.CylinderGeometry(2.65, 2.8, 0.18, 10), stone);
    base.position.y = 0.09;
    branch([0, 0.18, 0], [-0.2, 1.4, 0.05], 0.32, 0.24);
    branch([-0.2, 1.4, 0.05], [0.15, 2.6, 0], 0.24, 0.15);
    branch([0.15, 2.6, 0], [-0.1, 3.5, -0.15], 0.15, 0.055);

    // Exposed angular limbs support a broad, asymmetric canopy.
    const limbs: [Point, Point, Point][] = [
        [[-0.2, 1.4, 0.05], [-1.05, 2.25, 0.1], [-1.9, 2.9, 0.2]],
        [[0, 2, 0], [0.95, 2.65, 0.2], [1.8, 3.15, 0.25]],
        [[0.1, 2.5, 0], [-0.55, 3.1, -0.8], [-0.9, 3.6, -1.1]],
        [[-0.1, 1.9, 0], [-0.5, 2.5, 0.85], [-0.7, 3.1, 1.2]],
        [[0.15, 2.6, 0], [0.6, 3.2, -0.65], [1.05, 3.65, -0.9]],
    ];
    for (const [start, elbow, tip] of limbs) {
        branch(start, elbow, 0.14, 0.09);
        branch(elbow, tip, 0.09, 0.035);
    }
    for (let i = 0; i < 5; i++) {
        const angle = i * Math.PI * 2 / 5;
        branch([Math.cos(angle) * 0.75, 0.2, Math.sin(angle) * 0.75], [0, 0.55, 0], 0.035, 0.18);
    }

    const crownGeometry = new THREE.IcosahedronGeometry(1, 1);
    const crowns: [Point, Point][] = [
        [[-1.85, 3.05, 0.2], [0.85, 0.65, 0.85]],
        [[-1.2, 3.5, 0.1], [1, 0.65, 0.9]],
        [[-0.35, 3.95, -0.1], [1, 0.7, 0.9]],
        [[0.65, 3.95, -0.4], [0.9, 0.6, 0.85]],
        [[1.65, 3.4, 0.15], [0.95, 0.7, 0.8]],
        [[0.7, 3.5, 0.6], [0.9, 0.6, 0.9]],
        [[-0.6, 3.35, 1.15], [0.9, 0.55, 0.8]],
        [[-0.9, 3.65, -1], [0.85, 0.65, 0.8]],
        [[1.05, 3.75, -1], [0.75, 0.55, 0.75]],
    ];
    crowns.forEach(([position, scale], index) => {
        const crown = mesh(crownGeometry, blossoms);
        crown.position.set(...position);
        crown.scale.set(...scale);
        crown.rotation.set(0.13 * index, 0.7 * index, 0.17 * index);
    });

    const petalGeometry = new THREE.IcosahedronGeometry(0.11, 0);
    for (let i = 0; i < 16; i++) {
        const angle = i * 2.4;
        const radius = 0.9 + (i % 4) * 0.4;
        const petal = mesh(petalGeometry, blossoms);
        petal.position.set(Math.cos(angle) * radius, 0.23, Math.sin(angle) * radius);
        petal.scale.set(1, 0.3, 0.7);
        petal.rotation.y = angle;
    }

    return {
        tree,
        wood,
        blossoms,
        dispose() {
            for (const geometry of geometries) {geometry.dispose();}
            wood.dispose();
            blossoms.dispose();
            stone.dispose();
        },
    };
}
