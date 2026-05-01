import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { useState, useEffect, useRef } from 'react';

import './ThreeD.css';

import ColorSelector from '/src/components/tools/ColorSelector/ColorSelector.jsx';

export default function ThreeD() {

    const canvasRef = useRef(null);
    const materialRef = useRef(null);

    const [color, setColor] = useState("#3b82f6");

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const scene = new THREE.Scene();
        
        const renderer = new THREE.WebGLRenderer({ canvas });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        scene.add(camera);

        const renderer_size = new THREE.Vector2();

        function syncRendererSize() {
            const nextWidth = Math.max(1, Math.floor(canvas.clientWidth));
            const nextHeight = Math.max(1, Math.floor(canvas.clientHeight));

            renderer.getSize(renderer_size);

            if (renderer_size.x !== nextWidth || renderer_size.y !== nextHeight) {
                renderer.setSize(nextWidth, nextHeight, false);
                renderer.setViewport(0, 0, nextWidth, nextHeight);
                camera.aspect = nextWidth / nextHeight;
                camera.updateProjectionMatrix();
            }
        }

        syncRendererSize();
        window.addEventListener('resize', syncRendererSize);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ color });
        materialRef.current = material;
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        camera.position.set(0, 0, 5);
        
        camera.lookAt(0, 0, 0);

        let frame;

        function animate() {
            frame = requestAnimationFrame(animate);
            syncRendererSize();

            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;

            controls.update();
            renderer.render(scene, camera);
        }

        animate();

        return () => {
            window.removeEventListener('resize', syncRendererSize);
            cancelAnimationFrame(frame);
            controls.dispose();
            geometry.dispose();
            material.dispose();
            renderer.dispose();
            materialRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!materialRef.current) return;
        materialRef.current.color.set(color);
    }, [color]);

    return (
        <div className="threed-container d-flex flex-column flex-md-row align-items-center align-items-md-start gap-3">
            <canvas ref={canvasRef} className="threed-canvas" />
            <ColorSelector value={color} onChange={(newColor) => setColor(newColor)} />
        </div>
    );
}

export function Chaos3D({
    attractor,
    width,
    height,
    refresh,
    speed = 0.001,
    maxdepth = 10000,
}) {

    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas || !attractor) return;

        const scene = new THREE.Scene();

        const renderer = new THREE.WebGLRenderer({ canvas });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        scene.add(camera);

        const renderer_size = new THREE.Vector2();

        function syncRendererSize() {
            const nextWidth = Math.max(1, Math.floor(canvas.clientWidth));
            const nextHeight = Math.max(1, Math.floor(canvas.clientHeight));

            renderer.getSize(renderer_size);

            if (renderer_size.x !== nextWidth || renderer_size.y !== nextHeight) {
                renderer.setSize(nextWidth, nextHeight, false);
                renderer.setViewport(0, 0, nextWidth, nextHeight);
                camera.aspect = nextWidth / nextHeight;
                camera.updateProjectionMatrix();
            }
        }

        syncRendererSize();
        window.addEventListener('resize', syncRendererSize);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        const state = { ...attractor.start };
        const max_points = Math.min(50000, maxdepth);
        const pos = new Float32Array(max_points * 3);
        const colors = new Float32Array(max_points * 3);
        pos.set([state.x, state.y, state.z], 0);

        const start_color = new THREE.Color(0x0000ff);
        const end_color = new THREE.Color(0xff0000);
        const current_color = new THREE.Color();
        current_color.copy(start_color);
        colors.set([current_color.r, current_color.g, current_color.b], 0);

        const position_attr = new THREE.BufferAttribute(pos, 3);
        const color_attr = new THREE.BufferAttribute(colors, 3);

        const geometry_a = new THREE.BufferGeometry();
        geometry_a.setAttribute('position', position_attr);
        geometry_a.setAttribute('color', color_attr);
        geometry_a.setDrawRange(0, 1);

        const geometry_b = new THREE.BufferGeometry();
        geometry_b.setAttribute('position', position_attr);
        geometry_b.setAttribute('color', color_attr);
        geometry_b.setDrawRange(0, 0);

        position_attr.needsUpdate = true;
        color_attr.needsUpdate = true;

        const material = new THREE.LineBasicMaterial({ vertexColors: true });
        const line_a = new THREE.Line(geometry_a, material);
        const line_b = new THREE.Line(geometry_b, material);
        scene.add(line_a);
        scene.add(line_b);

        camera.position.set(attractor.view.x, attractor.view.y, attractor.view.z);
        
        camera.lookAt(0, 0, 0);

        let frame;
        let count_points = 1;
        let total_points = 1;
        let write_idx = 1 % max_points;

        function drawA() {
            const active = Math.min(count_points, max_points);
            if (active <= 0) return;

            if (active < max_points) {
                geometry_a.setDrawRange(0, active);
            } else {
                const start_pos = write_idx;
                const start_count = max_points - start_pos;
                geometry_a.setDrawRange(start_pos, start_count);
            }
        }

        function drawB() {
            const active = Math.min(count_points, max_points);
            if (active <= 0) return;

            if (active < max_points) {
                geometry_b.setDrawRange(0, 0);
            } else {
                geometry_b.setDrawRange(0, write_idx);
            }
        }

        function advanceAttractor() {
            const { x, y, z } = state;
            const [dx, dy, dz] = attractor.step(x, y, z, attractor.params);

            state.x = x + dx * 0.001;
            state.y = y + dy * 0.001;
            state.z = z + dz * 0.001;

            total_points %= (2 * max_points);
            const colorT = total_points < max_points ? total_points / max_points : 1 - (total_points - max_points) / max_points;
            current_color.copy(start_color).lerp(end_color, colorT);

            const write_offset = write_idx * 3;
            pos.set([state.x, state.y, state.z], write_offset);
            colors.set([current_color.r, current_color.g, current_color.b], write_offset);

            write_idx = (write_idx + 1) % max_points;
            if (count_points < max_points) count_points += 1;

            total_points += 1;
        }

        function animate() {
            frame = requestAnimationFrame(animate);

            const steps_per_frame = Math.max(1, Math.floor(1000 * speed));
            for (let i = 0; i < steps_per_frame; i += 1) advanceAttractor();

            position_attr.needsUpdate = true;
            color_attr.needsUpdate = true;
            drawA();
            drawB();
            syncRendererSize();
            
            controls.update();
            renderer.render(scene, camera);
        }

        animate();

        return () => {
            window.removeEventListener('resize', syncRendererSize);
            cancelAnimationFrame(frame);
            controls.dispose();
            geometry_a.dispose();
            geometry_b.dispose();
            material.dispose();
            renderer.dispose();
        };
    }, [speed, width, height, refresh, attractor, maxdepth]);

    return (
        <div style={{ width, height }}>
            <canvas ref={canvasRef} className="threed-canvas" />
        </div>
    );
}