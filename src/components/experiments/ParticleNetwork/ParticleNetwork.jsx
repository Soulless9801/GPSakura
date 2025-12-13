import { useRef, useEffect, useCallback } from "react";
import { rgbToCss, readColor } from "/src/utils/colors.js";
import { Particle } from "/src/entities/particle.js";

export default function ParticleNetwork({
    numParticles,
    connectionDistance,
    width,
    height,
    particleRadius = 2,
    speed = 0.5,
    pointerRadius = 60,
    pointerStrength = 0.3,
    interactive = false,
    maxAccel = 0.12,
    pointerEvents = false,
    colorTransition = 300,
    style = {},
    className = "",
}) {

    // Wrapper

    const wrapperRef = useRef(null);

    // Canvas 

    const canvasRef = useRef(null);

    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper) return;
        if (width) wrapper.style.width = typeof width === "number" ? `${width}px` : width;
        if (height) wrapper.style.height = typeof height === "number" ? `${height}px` : height;

        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth || wrapper.clientWidth;
        const cssH = canvas.clientHeight || wrapper.clientHeight;
        canvas.width = Math.floor(cssW * dpr);
        canvas.height = Math.floor(cssH * dpr);
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }, [width, height]);

    useEffect(() => {
        resizeCanvas();
    }, []);

    // Render Refs

    const particlesRef = useRef([]);
    const rafRef = useRef(null);
    const pointerRef = useRef({ x: 0, y: 0, active: false });
    const pointerDown = useRef(false);

    // Color Refs

    const currentColorRef = useRef([0, 0, 0]);
    const targetColorRef = useRef([0, 0, 0]);
    const transitionProgressRef = useRef(1);

    // Theme

    useEffect(() => {
        const rgb = readColor();
        currentColorRef.current = rgb[0];
        targetColorRef.current = rgb[0];
        transitionProgressRef.current = 1;
    }, [readColor]);

    useEffect(() => {
        const onStorage = () => {
            const rgb = readColor();
            targetColorRef.current = rgb[0];
            transitionProgressRef.current = 0;
        };
        window.addEventListener("themeStorage", onStorage);
        return () => window.removeEventListener("themeStorage", onStorage);
    }, []);

    // Update Particle

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const desired = Math.max(0, Math.floor(numParticles));
        const current = particlesRef.current.length;
        for (let p of particlesRef.current) {
            p.addFreeze();
            p.radius = particleRadius;
            p.s = Math.random() * speed;
            const oldSpeed = Math.sqrt(p.vx ** 2 + p.vy ** 2);
            p.vx = p.vx * p.s / oldSpeed;
            p.vy = p.vy * p.s / oldSpeed;
        }
        for (let i = 0; i < desired - current; i++) {
            particlesRef.current.push(new Particle(canvas, speed, particleRadius));
        }
        // console.log(desired);
        particlesRef.current.length = desired;
    }, [numParticles, particleRadius, speed, connectionDistance]);

    // Freeze Period

    useEffect(() => {
        for (let p of particlesRef.current) p.addFreeze();
    }, [pointerRadius, pointerStrength]);

    // Listeners

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper) return;

        canvas.style.pointerEvents = pointerEvents ? "auto" : "none";
        canvas.setAttribute("aria-hidden", "true");
        canvas.setAttribute("role", "presentation");

        resizeCanvas();
        
        const handlePointerMove = (ev) => {
        if (!interactive) return;
            const rect = wrapper.getBoundingClientRect();
            pointerRef.current.x = ev.clientX - rect.left;
            pointerRef.current.y = ev.clientY - rect.top;
            pointerRef.current.active = true;
        };

        const handlePointerLeave = () => {
            pointerRef.current.active = false;
        };

        const handlePointerDown = () => pointerDown.current = true;
        const handlePointerUp = () => pointerDown.current = false;

        window.addEventListener("resize", resizeCanvas);
        wrapper.addEventListener("pointermove", handlePointerMove);
        wrapper.addEventListener("pointerleave", handlePointerLeave);
        wrapper.addEventListener('pointerdown', handlePointerDown);
        wrapper.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            wrapper.removeEventListener("pointerdown", handlePointerDown);
            wrapper.removeEventListener("pointermove", handlePointerMove);
            wrapper.removeEventListener("pointerup", handlePointerUp);
            wrapper.removeEventListener("pointerleave", handlePointerLeave);
        };
    }, [resizeCanvas]);

    // Color + Draw Loop

    useEffect(() =>{

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");

        const localPointer = pointerRef;
        const localParticles = particlesRef;
        const localTarget = targetColorRef;

        const maxVel = Math.abs(speed) * 2;
        
        const lastTimeRef = { current: performance.now() };

        function step(dt) {

            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            ctx.clearRect(0, 0, w, h);

            // Transition Color

            if (transitionProgressRef.current < 1) {
                const inc = colorTransition > 0 ? dt / colorTransition : 1;
                transitionProgressRef.current = Math.min(1, transitionProgressRef.current + inc);
                const t = transitionProgressRef.current;
                const a = currentColorRef.current;
                const b = localTarget.current;
                currentColorRef.current = [
                    a[0] + (b[0] - a[0]) * t,
                    a[1] + (b[1] - a[1]) * t,
                    a[2] + (b[2] - a[2]) * t,
                ];
            }

            const fillCss = rgbToCss(currentColorRef.current);
            const strokeRgb = currentColorRef.current.map(v => Math.round(v)).join(",");

            // Draw Particles

            for (const p of localParticles.current) {
                if (interactive && localPointer.current.active) {
                    const mx = localPointer.current.x;
                    const my = localPointer.current.y;
                    const dx = p.x - mx;
                    const dy = p.y - my;
                    const dist = Math.hypot(dx, dy);
                    if (dist > 0 && dist < pointerRadius) {
                        const nx = dx / dist;
                        const ny = dy / dist;
                        const t = Math.min(0.8, 1 - dist / pointerRadius);
                        const strength = pointerStrength * (t * t);
                        const ax = nx * strength * maxAccel * dt;
                        const ay = ny * strength * maxAccel * dt;
                        p.vx += (pointerDown.current ? ax : -ax);
                        p.vy += (pointerDown.current ? ay : -ay);
                    }
                }

                const vmag = Math.hypot(p.vx, p.vy);
                if (vmag > maxVel) {
                    const scale = maxVel / vmag;
                    p.vx = p.vx * scale;
                    p.vy = p.vy * scale;
                }

                p.move(dt, canvas);
                p.draw(ctx, fillCss);
            }

            // Draw Edges

            for (let i = 0; i < localParticles.current.length; i++) {
                for (let j = i + 1; j < localParticles.current.length; j++) {
                    const a = localParticles.current[i];
                    const b = localParticles.current[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < connectionDistance) {
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        const alpha = 1 - dist / connectionDistance;
                        ctx.strokeStyle = `rgba(${strokeRgb}, ${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
        }

        function run(now) {
            const last = lastTimeRef.current || now;
            const dt = now - last;
            lastTimeRef.current = now;
            step(dt);
            rafRef.current = requestAnimationFrame(run);
        }

        rafRef.current = requestAnimationFrame(run);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [interactive, pointerEvents, colorTransition, connectionDistance, pointerRadius, pointerStrength, particleRadius, numParticles, speed, maxAccel]);

    return (
        <div ref={wrapperRef} className={`relative ${className}`} style={{ ...style, display: 'flex', justifyContent: 'center', alignItems: 'center', touchAction: interactive ? 'none' : 'auto'  }}>
            <canvas ref={canvasRef} style={{ display: "block" , width: "100%", height: "100%"}}  />
        </div>
    );
}
