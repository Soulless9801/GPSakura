import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { useEffect, useRef } from 'react';

export default function ThreeD({}) {

    const attractor = {
        dims: 3,
        params: { sigma: 10, rho: 28, beta: 8 / 3 },
        step: (x, y, z, p) => {
            const dx = p.sigma * (y - x);
            const dy = x * (p.rho - z) - y;
            const dz = x * y - p.beta * z;
            return [dx, dy, dz];
        },
        speedFactor: 5000,
        scaleFactor: 5,
        start: { x: 0.1, y: 0.1, z: 0.1 },
    }

    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        const scene = new THREE.Scene();

        const renderer = new THREE.WebGLRenderer({ canvas });
        renderer.setPixelRatio(window.devicePixelRatio);

        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        scene.add(camera);

        function handleResize() {

            const width = Math.max(1, canvas.clientWidth);
            const height = Math.max(1, canvas.clientHeight);

            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }

        handleResize();
        window.addEventListener('resize', handleResize);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        const state = { ...attractor.start };
        const max_points = 500;
        const positions = new Float32Array(max_points * 3);
        const colors = new Float32Array(max_points * 3);
        positions.set([state.x, state.y, state.z], 0);

        const start_color = new THREE.Color(0x0000ff);
        const end_color = new THREE.Color(0xff0000);
        const current_color = new THREE.Color();
        current_color.copy(start_color);
        colors.set([current_color.r, current_color.g, current_color.b], 0);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setDrawRange(0, 1);
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;

        const material = new THREE.LineBasicMaterial({ vertexColors: true });
        const line = new THREE.Line(geometry, material);
        scene.add(line);

        camera.position.set(-50, 50, 50);
        camera.lookAt(0, 0, 0);

        let frame;
        let count_points = 1;
        let total_points = 1;

        function advanceAttractorOnce() {
            const { x, y, z } = state;
            const [dx, dy, dz] = attractor.step(x, y, z, attractor.params);
            const step = 0.01;

            state.x = x + dx * step;
            state.y = y + dy * step;
            state.z = z + dz * step;

            const idx = count_points * 3;
            const m = total_points % (2 * max_points);
            const colorT = m < max_points ? m / max_points : 1 - (m - max_points) / max_points;
            current_color.copy(start_color).lerp(end_color, colorT);

            if (idx >= positions.length) {
                positions.copyWithin(0, 3);
                colors.copyWithin(0, 3);
                positions.set(
                    [state.x, state.y, state.z],
                    positions.length - 3,
                );
                colors.set(
                    [current_color.r, current_color.g, current_color.b],
                    colors.length - 3,
                );
            } else {
                positions.set(
                    [state.x, state.y, state.z],
                    idx,
                );
                colors.set(
                    [current_color.r, current_color.g, current_color.b],
                    idx,
                );
                count_points += 1;
            }

            total_points += 1;

            geometry.setDrawRange(0, Math.min(count_points, max_points));
            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.color.needsUpdate = true;
        }

        function animate() {
            frame = requestAnimationFrame(animate);

            advanceAttractorOnce();

            controls.update();
            renderer.render(scene, camera);
        }

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(frame);
            controls.dispose();
            geometry.dispose();
            material.dispose();
            renderer.dispose();
        };
    }, []);

    return (
        <canvas ref={canvasRef}/>
    );
}