import * as THREE from 'three';
import { sampleCrownPoint } from './CrownGeometry';
import { seededRandom } from '/src/utils/random';

export const DEFAULT_LEAF_COUNT = 10;
export const MAX_LEAF_COUNT = 200;
const GROUND_HEIGHT = 0.205;
const GROUND_HOLD = 1;
const FADE_DURATION = 3;

type Leaf = {
    mesh: THREE.Mesh<THREE.OctahedronGeometry, THREE.MeshStandardMaterial>;
    origin: THREE.Vector3;
    landing: THREE.Vector3;
    age: number;
    fallDuration: number;
    phase: number;
    random: () => number;
};

// One bounded pool: a leaf's geometry, material and mesh survive every respawn.
export function createFallingLeaves(canopies: readonly THREE.Mesh[], color: string, seed: string | number | (() => number) = 'tree-leaves') {
    const group = new THREE.Group();
    const geometry = new THREE.OctahedronGeometry(1, 0);
    const leaves: Leaf[] = [];
    let count = 0;

    function respawn(leaf: Leaf) {
        const random = leaf.random;
        const canopy = canopies[Math.floor(random() * canopies.length)];
        sampleCrownPoint(canopy.geometry, leaf.origin, random);
        canopy.localToWorld(leaf.origin);
        leaf.landing.copy(leaf.origin);
        leaf.landing.x += (random() - 0.5) * 0.6;
        leaf.landing.z += (random() - 0.5) * 0.6;
        leaf.landing.y = 0;
        // Stay within the stone platform, including its polygonal edges.
        if (leaf.landing.length() > 2.4) {leaf.landing.setLength(2.4);}
        leaf.landing.y = GROUND_HEIGHT;
        leaf.fallDuration = 7 + random() * 5;
        leaf.phase = random() * Math.PI * 2;
        leaf.age = 0;
    }

    function draw(leaf: Leaf) {
        const t = Math.min(leaf.age / leaf.fallDuration, 1);
        const sway = Math.sin(Math.PI * t);
        leaf.mesh.position.lerpVectors(leaf.origin, leaf.landing, t);
        if (t === 1) {leaf.mesh.position.copy(leaf.landing);}
        leaf.mesh.position.x += Math.sin(leaf.age * 1.7 + leaf.phase) * 0.22 * sway;
        leaf.mesh.position.z += Math.cos(leaf.age * 1.3 + leaf.phase) * 0.18 * sway;
        const flutter = Math.min((1 - t) * 5, 1);
        leaf.mesh.rotation.set(
            Math.sin(leaf.age * 2.2 + leaf.phase) * 0.7 * flutter,
            leaf.phase + Math.min(leaf.age, leaf.fallDuration) * 0.5,
            Math.cos(leaf.age * 1.8 + leaf.phase) * 0.5 * flutter,
        );
        const fadeAge = Math.max(0, leaf.age - leaf.fallDuration - GROUND_HOLD);
        leaf.mesh.material.opacity = Math.min(1, leaf.age / 0.4) * Math.max(0, 1 - fadeAge / FADE_DURATION);
    }

    for (let i = 0; i < MAX_LEAF_COUNT; i++) {
        const material = new THREE.MeshStandardMaterial({
            color, roughness: 1, flatShading: true, transparent: true, depthWrite: false,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(0.065, 0.014, 0.12);
        mesh.visible = false;
        group.add(mesh);
        // Separate streams keep one leaf's respawn independent of frame rate and pool size.
        const random = typeof seed === 'function' ? seed : seededRandom(`${String(seed)}:leaf:${String(i)}`);
        leaves.push({ mesh, origin: new THREE.Vector3(), landing: new THREE.Vector3(), age: 0, fallDuration: 7, phase: 0, random });
    }

    return {
        group,
        setCount(value: number) {
            const next = canopies.length && Number.isFinite(value) ? Math.max(0, Math.min(MAX_LEAF_COUNT, Math.round(value))) : 0;
            for (let i = 0; i < MAX_LEAF_COUNT; i++) {
                const leaf = leaves[i];
                leaf.mesh.visible = i < next;
                if (i >= count && i < next) {
                    respawn(leaf);
                    // Start at different stages, so the scene never releases a batch at once.
                    leaf.age = leaf.random() * (leaf.fallDuration + GROUND_HOLD + FADE_DURATION);
                    draw(leaf);
                }
            }
            count = next;
        },
        update(seconds: number) {
            if (!Number.isFinite(seconds) || seconds <= 0) {return;}
            for (let i = 0; i < count; i++) {
                const leaf = leaves[i];
                leaf.age += seconds;
                while (leaf.age >= leaf.fallDuration + GROUND_HOLD + FADE_DURATION) {
                    const remainder = leaf.age - leaf.fallDuration - GROUND_HOLD - FADE_DURATION;
                    respawn(leaf);
                    leaf.age = remainder;
                }
                draw(leaf);
            }
        },
        setColor(value: string) {
            for (const leaf of leaves) {leaf.mesh.material.color.set(value);}
        },
        dispose() {
            geometry.dispose();
            for (const leaf of leaves) {leaf.mesh.material.dispose();}
            group.clear();
        },
    };
}
