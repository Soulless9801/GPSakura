import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Branch, TreeDefinition } from './TreeTemplate';

const SIDES = 8;
const STEPS_PER_SEGMENT = 6;

/** Sweep shared rings along a bent centerline; only the two ends have caps. */
function taperedTube(points: THREE.Vector3[], radii: number[], ground?: number) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const steps = (points.length - 1) * STEPS_PER_SEGMENT;
    const positions: number[] = [];
    const indices: number[] = [];
    let previousTangent = curve.getTangent(0);
    const reference = Math.abs(previousTangent.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const radial = new THREE.Vector3().crossVectors(previousTangent, reference).normalize();
    const rotation = new THREE.Quaternion();
    const cross = new THREE.Vector3();
    const vertex = new THREE.Vector3();

    for (let ring = 0; ring <= steps; ring++) {
        const t = ring / steps;
        const center = curve.getPoint(t);
        const tangent = curve.getTangent(t);
        // Parallel transport prevents the cross-section from twisting at a bend.
        rotation.setFromUnitVectors(previousTangent, tangent);
        radial.applyQuaternion(rotation).normalize();
        cross.crossVectors(tangent, radial).normalize();
        previousTangent = tangent;
        const segment = Math.min(Math.floor(t * (points.length - 1)), points.length - 2);
        const fraction = t * (points.length - 1) - segment;
        const radius = THREE.MathUtils.lerp(radii[segment], radii[segment + 1], fraction);
        for (let side = 0; side < SIDES; side++) {
            const angle = side / SIDES * Math.PI * 2;
            vertex.copy(center).addScaledVector(radial, Math.cos(angle) * radius)
                .addScaledVector(cross, Math.sin(angle) * radius);
            if (ground !== undefined) {
                // Broad, low roots settle into the stage instead of looking like spokes.
                vertex.y = Math.max(ground, center.y + (vertex.y - center.y) * (1 - t * 0.55));
            }
            positions.push(vertex.x, vertex.y, vertex.z);
            if (ring > 0) {
                const a = (ring - 1) * SIDES + side;
                const b = (ring - 1) * SIDES + (side + 1) % SIDES;
                indices.push(a, b, a + SIDES, b, b + SIDES, a + SIDES);
            }
        }
    }
    for (const end of [0, 1]) {
        const center = points[end === 0 ? 0 : points.length - 1];
        const index = positions.length / 3;
        positions.push(center.x, center.y, center.z);
        const offset = end * steps * SIDES;
        for (let side = 0; side < SIDES; side++) {
            const a = offset + side;
            const b = offset + (side + 1) % SIDES;
            indices.push(...(end === 0 ? [index, b, a] : [index, a, b]));
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

/** Connect the thickest continuation at each fork, then grow side limbs from inside it. */
export function createWoodGeometry(definition: TreeDefinition) {
    const remaining = new Set(definition.branches);
    const pieces: THREE.BufferGeometry[] = [];
    const samePoint = (a: Branch[0], b: Branch[0]) => a.every((value, axis) => Math.abs(value - b[axis]) < 1e-5);
    const ordered = [...definition.branches].sort((a, b) => a[0][1] - b[0][1] || b[2] - a[2]);
    for (const first of ordered) {
        if (!remaining.has(first)) {continue;}
        let branch: Branch | undefined = first;
        const points = [new THREE.Vector3(...first[0])];
        const radii = [first[2]];
        while (branch) {
            remaining.delete(branch);
            points.push(new THREE.Vector3(...branch[1]));
            const end = branch[1];
            const next = [...remaining].filter(candidate => samePoint(end, candidate[0]))
                .sort((a, b) => b[2] - a[2])[0] as Branch | undefined;
            radii.push(Math.max(branch[3], next?.[2] ?? 0));
            branch = next;
        }
        if (pieces.length > 0) {
            // Bury the side-limb cap inside its parent, widening before it emerges.
            // A full-width tilted cap can otherwise peek through the trunk's facets.
            const collar = points[0].clone().lerp(points[1],
                Math.min(0.4, first[2] * 0.75 / points[0].distanceTo(points[1])));
            points.splice(1, 0, collar);
            radii[0] *= 0.25;
            radii.splice(1, 0, first[2]);
        }
        pieces.push(taperedTube(points, radii));
    }

    const roots = definition.roots ?? { count: 5, reach: 0.75, height: 0.55, radius: 0.18 };
    const trunk = ordered[0] as Branch | undefined;
    if (trunk) {
        const base = new THREE.Vector3(...trunk[0]);
        const ground = base.y;
        const trunkEnd = new THREE.Vector3(...trunk[1]);
        const height = Math.max(0.05, roots.height - ground);
        const anchor = base.clone().lerp(trunkEnd, THREE.MathUtils.clamp(height / Math.max(trunkEnd.y - ground, 0.01), 0, 1));
        for (let i = 0; i < roots.count; i++) {
            const angle = i / roots.count * Math.PI * 2 + Math.sin(i * 2.4) * 0.12;
            const reach = Math.max(trunk[2] * 1.6, roots.reach * (1.25 + 0.15 * Math.sin(i * 1.7)));
            const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
            const bend = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(Math.sin(i * 2.1) * reach * 0.12);
            const middle = base.clone().addScaledVector(direction, reach * 0.45).addScaledVector(bend, 0.5);
            middle.y = ground + height * 0.28;
            const low = base.clone().addScaledVector(direction, reach * 0.78).add(bend);
            low.y = ground + 0.035;
            const tip = base.clone().addScaledVector(direction, reach).add(bend);
            tip.y = ground + 0.006;
            pieces.push(taperedTube([anchor.clone(), middle, low, tip],
                [roots.radius * 1.25, roots.radius * 0.8, roots.radius * 0.3, 0.008], ground));
        }
    }
    const geometry = pieces.length ? mergeGeometries(pieces) : new THREE.BufferGeometry();
    for (const piece of pieces) {piece.dispose();}
    return geometry;
}
