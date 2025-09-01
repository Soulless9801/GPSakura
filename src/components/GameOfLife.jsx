import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from "react";

// Helper Functions

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

function readColor() {
	return [
		hexToRGB(getComputedStyle(document.documentElement).getPropertyValue("--primary-color").trim()),
		hexToRGB(getComputedStyle(document.documentElement).getPropertyValue("--secondary-color").trim())
	];
}

// Component

export default forwardRef(function GameOfLife(
	{
		width,
		height,
		speed,
		zoom,
		rules = {
			survive: [2, 3],
			birth: [3]
		},
		initCellSize = 20,
		running = true,
		wrap = true,
		showGrid = true,
		interactive = true,
		initialRandom = false,
		randomProbability = 0.18,
		colorTransition = 300,
		style = {},
		className = "",
	},
	ref
) {

	// Wrapper

	const wrapperRef = useRef(null);

	// Canvas

	const canvasRef = useRef(null);

	// Sizing

	const [calcWidth, setCalcWidth] = useState(width);
	const [calcHeight, setCalcHeight] = useState(height);

	const [cellSize, setCellSize] = useState(initCellSize);

	const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper) return;
        if (width) wrapper.style.width = typeof width === "number" ? `${width}px` : width;
        if (height) wrapper.style.height = typeof height === "number" ? `${height}px` : height;

		const rect = wrapper.getBoundingClientRect();

		let cssW = rect.width;
		let cssH = rect.height;

		cssW = Math.floor(cssW / cellSize) * cellSize;
		cssH = Math.floor(cssH / cellSize) * cellSize;

		setCalcWidth(cssW);
		setCalcHeight(cssH);

		cssW = cssW + borderWidth.current;
		cssH = cssH + borderWidth.current;

		const dpr = window.devicePixelRatio || 1;
		canvas.width = cssW * dpr;
		canvas.height = cssH * dpr;
		canvas.style.width = cssW + "px";
		canvas.style.height = cssH + "px";
        const ctx = canvas.getContext("2d");
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }, [width, height, cellSize]);

	useEffect(() => {
		resizeCanvas();
	}, [cellSize])

	// Color Refs

	const currentPrimary = useRef([0, 0, 0]);
	const targetPrimary = useRef([0, 0, 0]);
	const currentSecondary = useRef([0, 0, 0]);
	const targetSecondary = useRef([0, 0, 0]);

	const transitionProgressRef = useRef(1);
	const opacityProgressRef = useRef(1);

	const borderWidth = useRef(1);

	useEffect(() => {
		const rgb = readColor();
		currentPrimary.current = rgb[0];
		targetPrimary.current = rgb[0];
		currentSecondary.current = rgb[1];
		targetSecondary.current = rgb[1];
		transitionProgressRef.current = 1;

		const onStorage = () => {
			const rgb = readColor();
			targetPrimary.current = rgb[0];
			targetSecondary.current = rgb[1];
			transitionProgressRef.current = 0;
		};
		window.addEventListener("themeStorage", onStorage);
		return () => window.removeEventListener("themeStorage", onStorage);

	}, [readColor]);


	// Render Refs

	const rafRef = useRef(null);
	const lastTimeRef = useRef(performance.now());
	const accRef = useRef(0);

	const pointerDownRef = useRef(false);

	const runningRef = useRef(running);

	useEffect(() => {
		runningRef.current = running;
	}, [running])

	// Display + Grid

	const MAX = 200; // lmao

	const [cols, setCols] = useState(Math.floor(calcWidth / cellSize));
	const [rows, setRows] = useState(Math.floor(calcHeight / cellSize));

	const [grid, setGrid] = useState(
		() => new Uint8Array(MAX * MAX)
	);
	const gridRef = useRef(grid);
	gridRef.current = grid;

	const [display, setDisplay] = useState(
		() => new Uint8Array(rows * cols)
	);
	const displayRef = useRef(display);
	displayRef.current = display;

	useEffect(() => {
		const newDisplay = new Uint8Array(rows * cols);
		const xDiff = Math.floor((MAX - cols) / 2);
		const yDiff = Math.floor((MAX - rows) / 2);
		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				newDisplay[i * cols + j] = grid[(i + yDiff) * MAX + (j + xDiff)];
			}
		}
		setDisplay(newDisplay);
	}, [grid, rows, cols]);

	// Step Generation

	const stepGeneration = useCallback(() => {
		const out = new Uint8Array(MAX * MAX);
		for (let r = 0; r < MAX; r++) {
			for (let c = 0; c < MAX; c++) {
				let n = 0;
				for (let dr = -1; dr <= 1; dr++) {
					for (let dc = -1; dc <= 1; dc++) {
						if (dr === 0 && dc === 0) continue;
						let rr = r + dr;
						let cc = c + dc;
						if (rr < 0 || rr >= MAX || cc < 0 || cc >= MAX) continue;
						n += grid[rr * MAX + cc];
					}
				}
				const alive = grid[r * MAX + c] === 1;
				out[r * MAX + c] = (alive && rules.survive.includes(n)) || (!alive && rules.birth.includes(n)) ? 1 : 0;
			}
		}
		return out;
	}, [grid, rules]);

	// Draw Function

	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");

		ctx.clearRect(0, 0, canvas.clientWidth + borderWidth.current, canvas.clientHeight + borderWidth.current);

		ctx.fillStyle = rgbToCss(currentPrimary.current);

		const g = displayRef.current;

		for (let r = 0; r < rows; r++) {
			const y = r * cellSize;
			for (let c = 0; c < cols; c++) {
				if (g[r * cols + c]) {
					ctx.fillRect(c * cellSize, y, cellSize, cellSize);
				}
			}
		}

		ctx.save();

		ctx.globalAlpha = Math.max(0, opacityProgressRef.current);

		ctx.strokeStyle = rgbToCss(currentSecondary.current); 
		ctx.lineWidth = borderWidth.current;
		ctx.beginPath();
		for (let c = 0; c <= cols; c++) {
			const x = c * cellSize + 0.5;
			ctx.moveTo(x, 0);
			ctx.lineTo(x, canvas.height + 1);
		}
		for (let r = 0; r <= rows; r++) {
			const y = r * cellSize + 0.5;
			ctx.moveTo(0, y);
			ctx.lineTo(canvas.width + 1, y);
		}
		ctx.stroke();
		ctx.restore();
	}, [rows, cols, cellSize]);

	// Render + Transition Loop

	useEffect(() => {
		const stepInterval = speed > 0 ? 1000 / speed : Infinity; //updates per second
		lastTimeRef.current = performance.now();
		accRef.current = 0;

		function loop(now) {
			const last = lastTimeRef.current || now;
			const dt = Math.min(now - last, stepInterval); // stop lag
			lastTimeRef.current = now;

			if (runningRef.current) {
				accRef.current += dt;
				while (accRef.current >= stepInterval) {
					setGrid(stepGeneration());
					accRef.current -= stepInterval;
				}
			}

			const inc = colorTransition > 0 ? dt / colorTransition : 1;

			if (opacityProgressRef.current < 1 && showGrid) {
				opacityProgressRef.current = Math.min(1, opacityProgressRef.current + inc);
			}
			
			if (opacityProgressRef.current > 0 && !showGrid) {
				opacityProgressRef.current = Math.max(0, opacityProgressRef.current - inc);
			}

			if (transitionProgressRef.current < 1) {
                transitionProgressRef.current = Math.min(1, transitionProgressRef.current + inc);
                const t = transitionProgressRef.current;
                const aP = currentPrimary.current;
                const bP = targetPrimary.current;
				const aS = currentSecondary.current;
				const bS = targetSecondary.current;
                currentPrimary.current = [
                    aP[0] + (bP[0] - aP[0]) * t,
                    aP[1] + (bP[1] - aP[1]) * t,
                    aP[2] + (bP[2] - aP[2]) * t,
                ];
				currentSecondary.current = [
					aS[0] + (bS[0] - aS[0]) * t,
					aS[1] + (bS[1] - aS[1]) * t,
					aS[2] + (bS[2] - aS[2]) * t,
				];
            }

			draw();
			rafRef.current = requestAnimationFrame(loop);
		}

		if (rafRef.current) cancelAnimationFrame(rafRef.current);
		rafRef.current = requestAnimationFrame(loop);

		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		};
	}, [speed, showGrid, stepGeneration, draw]);

	useEffect(() => {
		displayRef.current = display;
		draw();
	}, [display, draw]);

	// Interaction

	const toggleCellAt = useCallback(
		(clientX, clientY, isSet = null) => {
			if (!interactive) return;
			const canvas = canvasRef.current;
			if (!canvas) return;
			const rect = canvas.getBoundingClientRect();
			const scaleX = rect.width / cols;
			const scaleY = rect.height / rows;
			const x = clientX - rect.left;
			const y = clientY - rect.top;
			const c = Math.floor(x / scaleX);
			const r = Math.floor(y / scaleY);
			if (r < 0 || r >= rows || c < 0 || c >= cols) return;
			const xDiff = Math.floor((MAX - cols) / 2);
			const yDiff = Math.floor((MAX - rows) / 2);
			setGrid((prev) => {
				const next = new Uint8Array(prev);
				const coord = (r + yDiff) * MAX + (c + xDiff);
				if (isSet === null) next[coord] = 1 - next[coord];
				else next[coord] = isSet ? 1 : 0;
				return next;
			});
		},
		[rows, cols, cellSize, interactive]
	);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const handlePointerDown = (e) => {
			pointerDownRef.current = true;
			toggleCellAt(e.clientX, e.clientY, null);
		};

		const handlePointerMove = (e) => {
			if (!pointerDownRef.current) return;
			toggleCellAt(e.clientX, e.clientY, true);
		};
		const handlePointerUp = () => {
			pointerDownRef.current = false;
		};

		canvas.addEventListener("pointerdown", handlePointerDown);
		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);
		window.addEventListener("resize", resizeCanvas);
		return () => {
			canvas.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
			window.removeEventListener("resize", resizeCanvas);
		};
	}, [toggleCellAt]);

	// Grid Functions

	const clearGrid = useCallback(() => {
		const g = new Uint8Array(MAX * MAX);
		setGrid(g);
	}, []);

	const randomizeGrid = useCallback((prob = randomProbability) => {
		const g = new Uint8Array(MAX * MAX);
		for (let i = 0; i < g.length; i++) {
			g[i] = Math.random() < prob ? 1 : 0;
		}
		setGrid(g);
	}, [randomProbability]);

	useEffect(() => {
		setCellSize(Math.floor(initCellSize * zoom / 100));
	}, [zoom]);

	useEffect(() => {
		const newCols = Math.floor(calcWidth / cellSize);
		const newRows = Math.floor(calcHeight / cellSize);

		setCols(newCols);
		setRows(newRows);

	}, [calcWidth, calcHeight, cellSize]);

	useEffect(() => {
		if (initialRandom) randomizeGrid(randomProbability);
	}, [initialRandom, randomProbability, randomizeGrid]);

	// Exposed Functions

	useImperativeHandle(ref, () => {
		return {
			clear() {
				clearGrid();
			},
			step() {
				setGrid(stepGeneration());
			},
			randomize() {
				randomizeGrid(randomProbability);
			}
		}
	}, [clearGrid, stepGeneration]);

	// Return

	return (
		<div ref={wrapperRef} className={`relative ${className}`} style={{ ...style, display: 'flex', justifyContent: 'center', alignItems: 'center', touchAction: interactive ? 'none' : 'auto' }}>
			<canvas
				ref={canvasRef}
				style={{ display: 'block' }}
			/>
		</div>
	);
});
