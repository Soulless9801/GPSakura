import { useState, useRef, useEffect, useCallback } from "react";

function hexToRGB(hex) {
	if (!hex) return [0,0,0];
	const h = hex.startsWith("#") ? hex.slice(1) : hex;
	const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToCss(rgb) {
    const [r, g, b] = rgb.map(v => Math.round(Math.max(0, Math.min(255, v))));
    return `rgb(${r}, ${g}, ${b})`;
}

function readColor() {
	return [
		hexToRGB(getComputedStyle(document.documentElement).getPropertyValue("--primary-color").trim()),
		hexToRGB(getComputedStyle(document.documentElement).getPropertyValue("--secondary-color").trim())
	];
}

export default function Fractal({
	type = "koch",
	width = 800,
	height = 500,
	lineWidth = 1,
	kochDepth = 2,
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
		canvas.width = cssW * dpr;
		canvas.height = cssH * dpr;
		canvas.style.width = cssW + "px";
		canvas.style.height = cssH + "px";
		const canvasCtx = canvas.getContext("2d");
		canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}, [width, height]);

	useEffect(() => {
		resizeCanvas();
	}, []);

	// Render Refs

	const rafRef = useRef(null);
	const lastTimeRef = useRef(performance.now());

	// Color Refs

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

	const fillFractal = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");

		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		ctx.globalCompositeOperation = "source-in";

		ctx.fillStyle = rgbToCss(currentColorRef.current);
		ctx.fillRect(0, 0, W, H);

		ctx.globalCompositeOperation = "source-over";
	}, []);

	// Koch Snowflake
	const drawKoch = useCallback((lineWidth) => {

		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");

		const W = ctx.canvas.clientWidth;
		const H = ctx.canvas.clientHeight;

		console.log("Canvas:", W, H);

		ctx.clearRect(0, 0, W, H);

		ctx.fillStyle = rgbToCss(currentColorRef.current);

		const size = Math.min(W, H) * 0.7;
		const cx = W / 2;
		const cy = H / 2 + size * 0.2;

		const p0 = { x: cx - size / 2, y: cy + (Math.sqrt(3) / 6) * size };
		const p1 = { x: cx + size / 2, y: cy + (Math.sqrt(3) / 6) * size };
		const p2 = { x: cx, y: cy - (Math.sqrt(3) / 3) * size };

		const segment = (a, b, iter) => {
			if (iter === 0) {
				ctx.moveTo(a.x, a.y);
				ctx.lineTo(b.x, b.y);
				return;
			}
			const dx = (b.x - a.x) / 3;
			const dy = (b.y - a.y) / 3;
			const pA = { x: a.x + dx, y: a.y + dy };
			const pB = { x: a.x + 2 * dx, y: a.y + 2 * dy };
			const angle = Math.atan2(dy, dx) - Math.PI / 3;
			const len = Math.hypot(dx, dy);
			const pC = { x: pA.x + Math.cos(angle) * len, y: pA.y + Math.sin(angle) * len };
			segment(a, pA, iter - 1);
			segment(pA, pC, iter - 1);
			segment(pC, pB, iter - 1);
			segment(pB, b, iter - 1);
		};

		ctx.lineWidth = lineWidth;
		ctx.beginPath();
		segment(p0, p1, kochDepth);
		segment(p1, p2, kochDepth);
		segment(p2, p0, kochDepth);
		ctx.stroke();

		fillFractal();
	}, [kochDepth]);

	useEffect(() => {
		fillFractal();
	}, []);

	useEffect(() => {
		const cut = () => {
			switch (type) {
				case "koch": {
					drawKoch(lineWidth);
					break;
				}
				default: {
					break;
				}
			}
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

	}, [type, lineWidth, resizeCanvas]);

	useEffect(() => {
		lastTimeRef.current = performance.now();

		const loop = (now) => {
			const last = lastTimeRef.current || now;
            const dt = now - last;
            lastTimeRef.current = now;

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

				fillFractal();
			}

			rafRef.current = requestAnimationFrame(loop);
		};

		rafRef.current = requestAnimationFrame(loop);

		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
		}, [colorTransition]);

	return (
		<div ref={wrapperRef} className={`relative ${className}`} style={{ ...style, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
			<canvas ref={canvasRef} style={{ display: "block" , width: "100%", height: "100%"}}  />
		</div>
	);
}
