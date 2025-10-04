import { useRef, useEffect, useCallback } from "react";
import { rgbToCss, readColor } from "/src/utils/colors.js";

export default function Fractal({
	type,
	width,
	height,
	depth,
	speed,
	lineWidth = 1,
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
	const lastTimeRef = useRef(performance.now());

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
	const drawKoch = useCallback(() => {

		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");

		const W = ctx.canvas.clientWidth;
		const H = ctx.canvas.clientHeight;

		ctx.clearRect(0, 0, W, H);

		ctx.fillStyle = rgbToCss(currentColorRef.current);

		const size = Math.min(W, H) * 0.8;
		const cx = W / 2;
		const cy = H / 2 + size / 12;

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
		segment(p0, p1, depth);
		segment(p1, p2, depth);
		segment(p2, p0, depth);
		ctx.stroke();

		fillFractal();

	}, [depth, lineWidth]);

	const drawSierpinski = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");

		const W = ctx.canvas.clientWidth;
		const H = ctx.canvas.clientHeight;

		ctx.clearRect(0, 0, W, H);

		ctx.fillStyle = rgbToCss(currentColorRef.current);

		const size = Math.min(W, H) * 0.8;
		const cx = W / 2;
		const cy = H / 2 + size / 12;

		const A = { x: cx - size / 2, y: cy + (Math.sqrt(3) / 6) * size };
		const B = { x: cx + size / 2, y: cy + (Math.sqrt(3) / 6) * size };
		const C = { x: cx, y: cy - (Math.sqrt(3) / 3) * size };

		let p = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };

		const pointsPerFrame = speed;
		const pointSize = lineWidth;

		const step = () => {
			ctx.beginPath();
			for (let i = 0; i < pointsPerFrame; i++) {
				const r = Math.random();
				const target = r < 1 / 3 ? A : r < 2 / 3 ? B : C;
				p.x = (p.x + target.x) / 2;
				p.y = (p.y + target.y) / 2;
				ctx.rect(p.x, p.y, pointSize, pointSize);
			}
			ctx.fill();
			rafRef.current = requestAnimationFrame(step);
		};

		rafRef.current = requestAnimationFrame(step);

	}, [speed, lineWidth])

	const drawFern = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");

		const W = ctx.canvas.clientWidth;
		const H = ctx.canvas.clientHeight;

		ctx.clearRect(0, 0, W, H);

		ctx.fillStyle = rgbToCss(currentColorRef.current);

		const size = Math.min(W, H) * 0.8;

		const world = { minX: -2.1820, maxX: 2.6558, minY: 0, maxY: 9.9983 };

		const worldWidth = world.maxX - world.minX;
		const worldHeight = world.maxY - world.minY;

		const scaleX = size / worldWidth;
		const scaleY = size / worldHeight;

		// Compute offsets to center
		const offsetX = (W - worldWidth * scaleX) / 2;
		const offsetY = (H - worldHeight * scaleY) / 2;

		// Mapping functions
		const sx = x => (x - world.minX) * scaleX + offsetX;
		const sy = y => H - ((y - world.minY) * scaleY + offsetY);

		let x = 0, y = 0;

		const pointsPerFrame = speed;
		const pointSize = lineWidth;

		const step = () => {
			ctx.beginPath();
			for (let i = 0; i < pointsPerFrame; i++) {
				const r = Math.random() * 100;
				let xNew, yNew;
				if (r < 1) {
					xNew = 0; yNew = 0.16 * y;
				} else if (r < 86) {
					xNew = 0.85 * x + 0.04 * y; yNew = -0.04 * x + 0.85 * y + 1.6;
				} else if (r < 93) {
					xNew = 0.2 * x - 0.26 * y; yNew = 0.23 * x + 0.22 * y + 1.6;
				} else {
					xNew = -0.15 * x + 0.28 * y; yNew = 0.26 * x + 0.24 * y + 0.44;
				}
				x = xNew; y = yNew;
				ctx.rect(sx(x), sy(y), pointSize, pointSize);
			}
			ctx.fill();
			rafRef.current = requestAnimationFrame(step);
		};

		rafRef.current = requestAnimationFrame(step);
	}, [speed, lineWidth]);

	useEffect(() => {
		const cut = () => {

			if (rafRef.current) cancelAnimationFrame(rafRef.current);

			switch (type) {
				case "koch": {
					drawKoch();
					break;
				}
				case "sierpinski": {
					//drawSierpinski();
					drawSierpinski();
					break;
				}
				case "fern": {
					drawFern();
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

	}, [type, depth, speed, lineWidth, resizeCanvas]);

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
