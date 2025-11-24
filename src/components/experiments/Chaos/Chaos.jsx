import { useRef, useEffect, useState, useCallback } from "react";
import { rgbToCss, readColor } from "/src/utils/colors.js"

export default function Chaos({
    attractor,
    width,
    height,
    speed = 1,        // dt time step
    scale = 10,           // visual scale factor
    lineWidth = 1,
    speedFactor = 5,
    colorTransition = 300,
    className = "",
    style = {},
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

    const rafRef = useRef(null);
    const lastColorTimeRef = useRef(performance.now());
    const lastChaosTimeRef = useRef(performance.now());

    // Color Refs

    const colorRafRef = useRef(null);

    const currentColorRef = useRef([0, 0, 0]);
    const targetColorRef = useRef([0, 0, 0]);
    const transitionProgressRef = useRef(1);

    useEffect(() => {
        const rgb = readColor();
        currentColorRef.current = rgb[0];
        targetColorRef.current = rgb[0];

        const onStorage = () => {
            const rgb = readColor();
            targetColorRef.current = rgb[0];
            transitionProgressRef.current = 0;
        };
        window.addEventListener("themeStorage", onStorage);
        return () => window.removeEventListener("themeStorage", onStorage);

    }, [readColor]);

    // Position Ref

    const pointRef = useRef({ x: 0.1, y: 0, z: 0 });

    const getCTX = () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const ctx = canvas.getContext("2d");

        const W = ctx.canvas.clientWidth;
        const H = ctx.canvas.clientHeight;

        return [ctx, W, H];
    }

    const fillChaos = () => {
        
        const [ctx, W, H] = getCTX();

        ctx.globalCompositeOperation = "source-in";

        ctx.fillStyle = rgbToCss(currentColorRef.current);
        ctx.fillRect(0, 0, W, H);

        ctx.globalCompositeOperation = "source-over";
    };

    const setupChaos = () => {
        
        const [ctx, W, H] = getCTX();

        ctx.clearRect(0, 0, W, H);

        ctx.fillStyle = rgbToCss(currentColorRef.current);

        return [ctx, W, H];
    };

    const drawChaos = useCallback(() => {

        const [ctx, W, H] = setupChaos();

        const params = attractor.params;
        const dims = attractor.dims;

        pointRef.current = { x: 0.1, y: 0, z: 0 };

        lastChaosTimeRef.current = performance.now();

        const step = (now) => {

            const dt = (now - lastChaosTimeRef.current) * speed;
            lastChaosTimeRef.current = now;

            let { x, y, z } = pointRef.current;

            ctx.strokeStyle = rgbToCss(currentColorRef.current);
            ctx.beginPath();

            const sx = W / 2 + x * scale;
            const sy = H / 2 + y * scale;

            ctx.moveTo(sx, sy);

            let d;
            if (dims === 3) d = attractor.step(x, y, z, params);
            else if (dims === 2) d = attractor.step(x, y, params);

            if (dims === 3) {
                x += d[0] * dt / 1000 * speedFactor;
                y += d[1] * dt / 1000 * speedFactor;
                z += d[2] * dt / 1000 * speedFactor;
            } else {
                x += d[0] * dt / 1000 * speedFactor;
                y += d[1] * dt / 1000 * speedFactor;
            }

            const ex = W / 2 + x * scale;
            const ey = H / 2 + y * scale;

            ctx.lineTo(ex, ey);

            ctx.stroke();

            pointRef.current = { x, y, z };

            rafRef.current = requestAnimationFrame(step);
        };

        rafRef.current = requestAnimationFrame(step);

    }, [attractor, speed, speedFactor, lineWidth, scale]);

    useEffect(() => {
        
        const cut = () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            drawChaos();
        };

        cut();

        const handleResize = () => {
			resizeCanvas();
            cut();
		};

		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
		};

	}, [drawChaos, resizeCanvas]);

    useEffect(() => {
    
        lastColorTimeRef.current = performance.now();

        const loop = (now) => {
            const last = lastColorTimeRef.current || now;
            const dt = now - last;
            lastColorTimeRef.current = now;

            if (transitionProgressRef.current < 1) {
                const inc = colorTransition > 0 ? dt / colorTransition : 1;
                transitionProgressRef.current = Math.min(1, transitionProgressRef.current + inc);

                const t = transitionProgressRef.current;
                const a = currentColorRef.current;
                const b = targetColorRef.current;

                currentColorRef.current = [
                    a[0] + (b[0] - a[0]) * t,
                    a[1] + (b[1] - a[1]) * t,
                    a[2] + (b[2] - a[2]) * t,
                ];

                fillChaos();
            }

            colorRafRef.current = requestAnimationFrame(loop);
        };

        colorRafRef.current = requestAnimationFrame(loop);

        return () => {
            if (colorRafRef.current) cancelAnimationFrame(colorRafRef.current);
        };

    }, [colorTransition]);

    return (
        <div ref={wrapperRef} className={`relative ${className}`} style={{ ...style, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
			<canvas ref={canvasRef} style={{ display: "block" , width: "100%", height: "100%"}}  />
		</div>
    );
}
