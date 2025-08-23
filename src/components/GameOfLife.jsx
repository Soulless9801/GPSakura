import React, { useRef, useEffect, useCallback, useState } from "react";

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

export default function GameOfLife({
	width = 800,
	height = 600,
	cellSize = 20,
	running = true,
	speed = 8,
	wrap = true,
	showGrid = true,
	initialRandom = false,
	randomProbability = 0.18,
	colorTransition = 300,
}) {

	const currentPrimary = useRef([0, 0, 0]);
	const targetPrimary = useRef([0, 0, 0]);
	const currentSecondary = useRef([0, 0, 0]);
	const targetSecondary = useRef([0, 0, 0]);
	const transitionProgressRef = useRef(1);

	const readColor = useCallback(
		//return both colors
		() => {
			return [
				getComputedStyle(document.documentElement).getPropertyValue("--primary-color").trim(),
				getComputedStyle(document.documentElement).getPropertyValue("--secondary-color").trim()
			];
		},
		[]
	);

	useEffect(() => {
		const initial = readColor();
		const parsed = [hexToRGB(initial[0]), hexToRGB(initial[1])];
		currentPrimary.current = parsed[0].slice();
		targetPrimary.current = parsed[0].slice();
		currentSecondary.current = parsed[1].slice();
		targetSecondary.current = parsed[1].slice();
		transitionProgressRef.current = 1;
	}, [readColor]);

	useEffect(() => {
		const onStorage = () => {
			const newCol = readColor();
			const rgb = [hexToRGB(newCol[0]), hexToRGB(newCol[1])];
			targetPrimary.current = rgb[0];
			targetSecondary.current = rgb[1];
			transitionProgressRef.current = 0;
			console.log(rgb);
		};
		window.addEventListener("themeStorage", onStorage);
		return () => window.removeEventListener("themeStorage", onStorage);
	}, []);

	const canvasRef = useRef(null);
	const rafRef = useRef(null);
	const lastTimeRef = useRef(performance.now());
	const accRef = useRef(0);
	const runningRef = useRef(running);
	const pointerDownRef = useRef(false);

	const [cols, setCols] = useState(Math.floor(width / cellSize));
	const [rows, setRows] = useState(Math.floor(height / cellSize));

	const [grid, setGrid] = useState(
		() => new Uint8Array(Math.floor(height / cellSize) * Math.floor(width / cellSize))
	);
	const gridRef = useRef(grid);
	gridRef.current = grid;

	const [isRunning, setIsRunning] = useState(running);

	const clearGrid = useCallback(() => {
		const g = new Uint8Array(rows * cols);
		setGrid(g);
	}, [rows, cols]);

	const randomizeGrid = useCallback(
		(prob = randomProbability) => {
			const g = new Uint8Array(rows * cols);
			for (let i = 0; i < g.length; i++) {
				g[i] = Math.random() < prob ? 1 : 0;
			}
			setGrid(g);
		},
		[rows, cols, randomProbability]
	);

	const stepGeneration = useCallback((srcGrid, rCount, cCount, wrapFlag) => {
		const out = new Uint8Array(rCount * cCount);
		for (let r = 0; r < rCount; r++) {
			for (let c = 0; c < cCount; c++) {
				let n = 0;
				for (let dr = -1; dr <= 1; dr++) {
					for (let dc = -1; dc <= 1; dc++) {
						if (dr === 0 && dc === 0) continue;
						let rr = r + dr;
						let cc = c + dc;
						if (wrapFlag) {
							if (rr < 0) rr = rCount - 1;
							else if (rr >= rCount) rr = 0;
							if (cc < 0) cc = cCount - 1;
							else if (cc >= cCount) cc = 0;
						} else {
							if (rr < 0 || rr >= rCount || cc < 0 || cc >= cCount) continue;
						}
						n += srcGrid[rr * cCount + cc];
					}
				}
				const alive = srcGrid[r * cCount + c] === 1;
				out[r * cCount + c] = (alive && (n === 2 || n === 3)) || (!alive && n === 3) ? 1 : 0;
			}
		}
		return out;
	}, []);

	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const g = gridRef.current;
		ctx.fillStyle = rgbToCss(currentPrimary.current);
		console.log(ctx.fillStyle);
		for (let r = 0; r < rows; r++) {
			const y = r * cellSize;
			for (let c = 0; c < cols; c++) {
				if (g[r * cols + c]) {
					ctx.fillRect(c * cellSize, y, cellSize, cellSize);
				}
			}
		}

		if (showGrid) {
			ctx.strokeStyle = rgbToCss(currentSecondary.current);
			ctx.lineWidth = 1;
			ctx.beginPath();
			for (let c = 0; c <= cols; c++) {
				const x = c * cellSize;
				ctx.moveTo(x, 0);
				ctx.lineTo(x, canvas.height);
			}
			for (let r = 0; r <= rows; r++) {
				const y = r * cellSize;
				ctx.moveTo(0, y);
				ctx.lineTo(canvas.width, y);
			}
			ctx.stroke();
		}
	}, [rows, cols, cellSize, showGrid]);

	useEffect(() => {
		const stepInterval = speed > 0 ? 1000 / speed : Infinity; //updates per second
		lastTimeRef.current = performance.now();
		accRef.current = 0;

		function loop(now) {
			const last = lastTimeRef.current || now;
			const dt = now - last;
			lastTimeRef.current = now;

			if (runningRef.current) {
				accRef.current += dt;
				while (accRef.current >= stepInterval) {
					setGrid((prev) => stepGeneration(prev, rows, cols, wrap));
					accRef.current -= stepInterval;
				}
			}

			if (transitionProgressRef.current < 1) {
                const inc = colorTransition > 0 ? dt / colorTransition : 1;
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
	}, [speed, rows, cols, stepGeneration, draw, wrap]);

	const toggleCellAt = useCallback(
		(clientX, clientY, isSet = null) => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const rect = canvas.getBoundingClientRect();
			const x = clientX - rect.left;
			const y = clientY - rect.top;
			const c = Math.floor(x / cellSize);
			const r = Math.floor(y / cellSize);
			if (r < 0 || r >= rows || c < 0 || c >= cols) return;
			setGrid((prev) => {
				const next = new Uint8Array(prev);
				if (isSet === null) next[r * cols + c] = 1 - next[r * cols + c];
				else next[r * cols + c] = isSet ? 1 : 0;
				return next;
			});
		},
		[rows, cols, cellSize]
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
		return () => {
			canvas.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [toggleCellAt]);

	useEffect(() => {
		setCols(Math.floor(width / cellSize));
		setRows(Math.floor(height / cellSize));
	}, [width, height, cellSize]);

	useEffect(() => {
		if (initialRandom) randomizeGrid(randomProbability);
		else clearGrid();
	}, [rows, cols, initialRandom, randomProbability, clearGrid, randomizeGrid]);

	useEffect(() => {
		gridRef.current = grid;
		draw();
	}, [grid, draw]);

	const start = useCallback(() => {
		runningRef.current = true;
		setIsRunning(true);
	}, []);
	const stop = useCallback(() => {
		runningRef.current = false;
		setIsRunning(false);
	}, []);
	const stepOnce = useCallback(() => {
		setGrid((prev) => stepGeneration(prev, rows, cols, wrap));
	}, [stepGeneration, rows, cols, wrap]);

	return (
		<div style={{ userSelect: "none", width: "100%" }}>
			<div style={{ marginBottom: 8 }}>
				<button onClick={isRunning ? stop : start}>
					{isRunning ? "Pause" : "Start"}
				</button>
				<button onClick={stepOnce}>Step</button>
				<button onClick={() => randomizeGrid(randomProbability)}>Random</button>
				<button onClick={clearGrid}>Clear</button>
			</div>
			<canvas
				ref={canvasRef}
				width={width}
				height={height}
				style={{ border: "1px solid rgba(0,0,0,0.2)" }}
			/>
		</div>
	);
}
