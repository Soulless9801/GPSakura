import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useState, useEffect, useRef } from 'react';

import './ThreeD.css';

import ColorSelector from '/src/components/tools/ColorSelector/ColorSelector';
import DemoFrame from '/src/components/tools/DemoFrame/DemoFrame';
import { observeElementSize } from '/src/utils/resize';
import { createSakuraTree, DEFAULT_BLOSSOM_COLOR, DEFAULT_WOOD_COLOR } from './sakuraTree';
import { syncViewport } from './viewport';
import type { ChaosAttractor } from '/src/components/experiments/Chaos/Chaos';

interface Chaos3DProps {
    attractor: ChaosAttractor;
    width?: number | string;
    height?: number | string;
    refresh?: boolean;
    speed?: number;
    maxdepth?: number;
    startColor?: string;
    endColor?: string;
}

export default function ThreeD() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const treeRef = useRef<ReturnType<typeof createSakuraTree> | null>(null);
    const resetViewRef = useRef<(() => void) | null>(null);
    const [blossomColor, setBlossomColor] = useState(DEFAULT_BLOSSOM_COLOR);
    const [woodColor, setWoodColor] = useState(DEFAULT_WOOD_COLOR);

    useEffect(() => {
        const canvas = canvasRef.current;
        const stage = canvas?.parentElement;
        if (!canvas || !stage) {return;}
        const display = stage;

        const scene = new THREE.Scene();
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        const sakura = createSakuraTree();
        treeRef.current = sakura;
        scene.add(sakura.tree);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x807080, 2));
        const sunlight = new THREE.DirectionalLight(0xffffff, 3);
        sunlight.position.set(-3, 7, 5);
        scene.add(sunlight);

        const controls = new OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.minDistance = 4;
        controls.maxDistance = 30;
        controls.maxPolarAngle = Math.PI / 2;
        const bounds = new THREE.Box3().setFromObject(sakura.tree).getBoundingSphere(new THREE.Sphere());
        controls.target.copy(bounds.center);

        function resetView() {
            const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
            const limitingFov = Math.min(halfFov, Math.atan(Math.tan(halfFov) * camera.aspect));
            const distance = bounds.radius / Math.sin(limitingFov) * 1.08;
            // Flush any orbit damping before restoring the default view.
            controls.enableDamping = false;
            controls.reset();
            controls.target.copy(bounds.center);
            camera.position.copy(bounds.center).add(new THREE.Vector3(0.8, 0.45, 1).normalize().multiplyScalar(distance));
            camera.lookAt(bounds.center);
            controls.update();
            controls.enableDamping = true;
        }
        resetViewRef.current = resetView;
        syncViewport(renderer, camera, stage);
        resetView();

        function resize() {
            const oldAspect = camera.aspect;
            syncViewport(renderer, camera, display);
            // Preserve the user's orbit/zoom while keeping the same horizontal
            // framing when a narrow viewport becomes the limiting dimension.
            const scale = Math.max(1, 1 / camera.aspect) / Math.max(1, 1 / oldAspect);
            camera.position.sub(controls.target).multiplyScalar(scale).add(controls.target);
        }
        const stopObserving = observeElementSize(display, () => {
            resize();
            controls.update();
            renderer.render(scene, camera);
        });
        window.addEventListener('resize', resize);

        let frame = 0;
        function animate() {
            frame = window.requestAnimationFrame(animate);
            resize();
            controls.update();
            renderer.render(scene, camera);
        }
        animate();

        return () => {
            stopObserving();
            window.removeEventListener('resize', resize);
            window.cancelAnimationFrame(frame);
            controls.dispose();
            sakura.dispose();
            renderer.dispose();
            treeRef.current = null;
            resetViewRef.current = null;
        };
    }, []);

    useEffect(() => { treeRef.current?.blossoms.color.set(blossomColor); }, [blossomColor]);
    useEffect(() => { treeRef.current?.wood.color.set(woodColor); }, [woodColor]);

    return (
        <section className="demo-layout threed-container">
            <DemoFrame>
                <canvas ref={canvasRef} className="threed-canvas" aria-label="Interactive geometric sakura tree" />
            </DemoFrame>
            <div className="ui-stack threed-controls">
                <ColorSelector label="Leaves & blossoms" value={blossomColor} onChange={setBlossomColor} />
                <ColorSelector label="Wood" value={woodColor} onChange={setWoodColor} />
                <section className="ui-panel ui-stack threed-guide">
                    <h2>Sakura tree</h2>
                    <p>Drag to orbit. Scroll or pinch to zoom.</p>
                    <button type="button" onClick={() => { resetViewRef.current?.(); }}>Reset view</button>
                </section>
            </div>
        </section>
    );
}

export function Chaos3D({
    attractor,
    width,
    height,
    refresh,
    speed = 0.001,
    maxdepth = 10000,
    startColor = "#0000ff",
    endColor = "#ff0000",
}: Chaos3DProps) {

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const startColorRef = useRef<THREE.Color | null>(null);
    const endColorRef = useRef<THREE.Color | null>(null);
    const startColorValueRef = useRef(startColor);
    const endColorValueRef = useRef(endColor);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {return;}
        const canvasElement = canvas;

        const scene = new THREE.Scene();

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        scene.add(camera);

        const renderer_size = new THREE.Vector2();

        function syncRendererSize() {
            const nextWidth = Math.max(1, Math.floor(canvasElement.clientWidth));
            const nextHeight = Math.max(1, Math.floor(canvasElement.clientHeight));

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

        const start_color = new THREE.Color(startColorValueRef.current);
        const end_color = new THREE.Color(endColorValueRef.current);
        startColorRef.current = start_color;
        endColorRef.current = end_color;
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

        let frame: number | null = null;
        let count_points = 1;
        let total_points = 1;
        let write_idx = 1 % max_points;

        function drawA(): void {
            const active = Math.min(count_points, max_points);
            if (active <= 0) {return;}

            if (active < max_points) {
                geometry_a.setDrawRange(0, active);
            } else {
                const start_pos = write_idx;
                const start_count = max_points - start_pos;
                geometry_a.setDrawRange(start_pos, start_count);
            }
        }

        function drawB(): void {
            const active = Math.min(count_points, max_points);
            if (active <= 0) {return;}

            if (active < max_points) {
                geometry_b.setDrawRange(0, 0);
            } else {
                geometry_b.setDrawRange(0, write_idx);
            }
        }

        function advanceAttractor(): void {
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
            if (count_points < max_points) {count_points += 1;}

            total_points += 1;
        }

        function animate(): void {
            frame = window.requestAnimationFrame(animate);

            const steps_per_frame = Math.max(1, Math.floor(1000 * speed));
            for (let i = 0; i < steps_per_frame; i += 1) {advanceAttractor();}

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
            if (frame !== null) {window.cancelAnimationFrame(frame);}
            controls.dispose();
            geometry_a.dispose();
            geometry_b.dispose();
            material.dispose();
            renderer.dispose();
            startColorRef.current = null;
            endColorRef.current = null;
        };
    }, [speed, width, height, refresh, attractor, maxdepth]);

    useEffect(() => {
        startColorValueRef.current = startColor;
        if (!startColorRef.current) {return;}
        startColorRef.current.set(startColor);
    }, [startColor]);

    useEffect(() => {
        endColorValueRef.current = endColor;
        if (!endColorRef.current) {return;}
        endColorRef.current.set(endColor);
    }, [endColor]);

    return (
        <div style={{ width, height }}>
            <canvas ref={canvasRef} className="threed-canvas" />
        </div>
    );
}
