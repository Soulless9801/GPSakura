import { useRef, useEffect, useState, useCallback } from "react";

function hexToRGB(hex) {
    const parsed = hex.replace("#", "");
    const bigint = parseInt(parsed, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
}

function rgbToCss(rgb) {
    const [r, g, b] = rgb.map(v => Math.round(Math.max(0, Math.min(255, v))));
    return `rgb(${r}, ${g}, ${b})`;
}

export default function ParticleNetwork({
    numParticles = 100,
    particleRadius = 2,
    maxAccel = 120,
    width = "100vw",
    height = "100vh",
    connectionDistance = 120,
    speed = 0.5,
    mouseRadius = 60,
    mouseStrength = 0.3,
    interactive = false,
    pointerEvents = false,
    colorTransition = 0.3,
    style = {},
    className = "",
}) {
    const wrapperRef = useRef(null);
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const rafRef = useRef(null);
    const mouseRef = useRef({ x: 0, y: 0, active: false });
    const mouseDown = useRef(false);

    const currentColorRef = useRef([0, 0, 0]);
    const targetColorRef = useRef([0, 0, 0]);
    const transitionProgressRef = useRef(1);

    const readPrimaryColor = useCallback(
        () => getComputedStyle(document.documentElement).getPropertyValue("--primary-color").trim(), []
    );

    useEffect(() => {
        const initial = readPrimaryColor();
        const parsed = hexToRGB(initial);
        currentColorRef.current = parsed.slice();
        targetColorRef.current = parsed.slice();
        transitionProgressRef.current = 1;
    }, [readPrimaryColor]);

    useEffect(() => {
        const onStorage = () => {
            const newCol = readPrimaryColor();
            const rgb = hexToRGB(newCol);
            targetColorRef.current = rgb;
            transitionProgressRef.current = 0;
        };
        window.addEventListener("themeStorage", onStorage);
        return () => window.removeEventListener("themeStorage", onStorage);
    }, []);

    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper) return;
        if (width) wrapper.style.width = typeof width === "number" ? `${width}px` : width;
        if (height) wrapper.style.height = typeof height === "number" ? `${height}px` : height;

        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth || wrapper.clientWidth;
        const cssH = canvas.clientHeight || wrapper.clientHeight;
        canvas.width = Math.max(1, Math.floor(cssW * dpr));
        canvas.height = Math.max(1, Math.floor(cssH * dpr));
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }, [width, height]);

    const freezeTimer = 300;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.clientWidth;
                this.y = Math.random() * canvas.clientHeight;
                this.s = Math.random() * speed;
                const angle = Math.random() * Math.PI * 2;
                this.vx = Math.cos(angle) * this.s;
                this.vy = Math.sin(angle) * this.s;
                this.radius = particleRadius;
                this.freeze = Date.now() + freezeTimer;
            }
            adjustSpeed(){
                if (Math.abs(this.vx) == 0) {
                    this.vx = Math.random() * speed;
                }
                const factor = Math.sqrt(this.s / Math.sqrt(this.vx ** 2 + this.vy ** 2));
                this.vx *= factor;
                this.vy *= factor;
            }
            move(dt) {
                if (this.freeze > Date.now()) return;
                this.x += this.vx * dt * 60;
                this.y += this.vy * dt * 60;
                if (this.x <= particleRadius) {
                    //this.x = particleRadius;
                    this.vx *= -1;
                } else if (this.x >= canvas.clientWidth - particleRadius) {
                    //this.x = canvas.clientWidth - particleRadius;
                    this.vx *= -1;
                }
                if (this.y <= particleRadius) {
                    //this.y = particleRadius;
                    this.vy *= -1;
                } else if (this.y >= canvas.clientHeight - particleRadius) {
                    //this.y = canvas.clientHeight - particleRadius;
                    this.vy *= -1;
                }

                this.adjustSpeed();

            }
            draw(ctx, fillCss) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = fillCss;
                ctx.fill();
            }
        }
        const desired = Math.max(0, Math.floor(numParticles));
        const current = particlesRef.current.length;
        for (let p of particlesRef.current) {
            p.freeze = Date.now() + freezeTimer;
            p.radius = particleRadius;
            p.s = Math.random() * speed;
            const oldSpeed = Math.sqrt(p.vx ** 2 + p.vy ** 2);
            p.vx = p.vx * p.s / oldSpeed;
            p.vy = p.vy * p.s / oldSpeed;
        }
        for (let i = 0; i < desired - current; i++) {
            particlesRef.current.push(new Particle());
        }
        particlesRef.current.length = desired;
    }, [numParticles, particleRadius, speed, connectionDistance]);

    useEffect(() => {
        for (let p of particlesRef.current) {
            p.freeze = Date.now() + freezeTimer;
        }
    }, [mouseRadius, mouseStrength]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper) return;

        canvas.style.pointerEvents = pointerEvents ? "auto" : "none";
        canvas.setAttribute("aria-hidden", "true");
        canvas.setAttribute("role", "presentation");

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        
        const handlePointerMove = (ev) => {
        if (!interactive) return;
            const rect = wrapper.getBoundingClientRect();
            mouseRef.current.x = ev.clientX - rect.left;
            mouseRef.current.y = ev.clientY - rect.top;
            mouseRef.current.active = true;
        };

        const handlePointerLeave = () => {
            mouseRef.current.active = false;
        };

        wrapper.addEventListener("pointermove", handlePointerMove);
        wrapper.addEventListener("mousemove", handlePointerMove);
        wrapper.addEventListener("pointerleave", handlePointerLeave);
        wrapper.addEventListener("mouseleave", handlePointerLeave);

        const handleMouseDown = () => mouseDown.current = true;
        const handleMouseUp = () => mouseDown.current = false;
        wrapper.addEventListener('mousedown', handleMouseDown);
        wrapper.addEventListener('mouseup', handleMouseUp);

        const handleTouchMove = (e) => {
            if (!interactive) return;
            const t = e.touches[0];
            if (!t) return;
            const rect = wrapper.getBoundingClientRect();
            mouseRef.current.x = t.clientX - rect.left;
            mouseRef.current.y = t.clientY - rect.top;
            mouseRef.current.active = true;
        };

        const handleTouchEnd = () => {
            mouseRef.current.active = false;
        };

        wrapper.addEventListener("touchmove", handleTouchMove, { passive: true });
        wrapper.addEventListener("touchend", handleTouchEnd);

        const ctx = canvas.getContext("2d");

        const localMouse = mouseRef;
        const localParticles = particlesRef;
        const localTarget = targetColorRef;

        const maxVel = Math.abs(speed) * 2;
        
        const lastTimeRef = { current: performance.now() };

        function step(dt) {

            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            ctx.clearRect(0, 0, w, h);

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

            for (const p of localParticles.current) {
                if (interactive && localMouse.current.active) {
                    const mx = localMouse.current.x;
                    const my = localMouse.current.y;
                    const dx = p.x - mx;
                    const dy = p.y - my;
                    const dist = Math.hypot(dx, dy);
                    if (dist > 0 && dist < mouseRadius) {
                        const nx = dx / dist;
                        const ny = dy / dist;
                        const t = Math.min(0.8, 1 - dist / mouseRadius);
                        const strength = mouseStrength * (t * t);
                        const ax = nx * strength * maxAccel * dt;
                        const ay = ny * strength * maxAccel * dt;
                        p.vx += (mouseDown.current ? ax : -ax);
                        p.vy += (mouseDown.current ? ay : -ay);
                    }
                }

                const vmag = Math.hypot(p.vx, p.vy);
                if (vmag > maxVel) {
                    const scale = maxVel / vmag;
                    p.vx = p.vx * scale;
                    p.vy = p.vy * scale;
                }

                p.move(dt);
                p.draw(ctx, fillCss);
            }

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
            const dt = Math.min((now - last) / 1000, 0.05);
            lastTimeRef.current = now;
            step(dt);
            rafRef.current = requestAnimationFrame(run);
        }

        rafRef.current = requestAnimationFrame(run);

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            wrapper.removeEventListener("pointermove", handlePointerMove);
            wrapper.removeEventListener("mousemove", handlePointerMove);
            wrapper.removeEventListener("pointerleave", handlePointerLeave);
            wrapper.removeEventListener("mouseleave", handlePointerLeave);
            wrapper.removeEventListener('mousedown', handleMouseDown);
            wrapper.removeEventListener('mouseup', handleMouseUp);
            wrapper.removeEventListener("touchmove", handleTouchMove);
            wrapper.removeEventListener("touchend", handleTouchEnd);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [
        resizeCanvas,
        interactive,
        pointerEvents,
        colorTransition,
        connectionDistance,
        mouseRadius,
        mouseStrength,
        particleRadius,
        numParticles,
        speed,
        maxAccel,
    ]);

    return (
        <div ref={wrapperRef} className={`relative overflow-hidden ${className}`} style={{ ...style, width, height, marginLeft: "auto", marginRight: "auto", minWidth: "200px"}}>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ display: "block", width: "100%", height: "100%" }}  />
        </div>
    );
}
