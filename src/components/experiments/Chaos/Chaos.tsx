import { useRef, useEffect, useCallback, type CSSProperties } from "react";
import { rgbToCss, readColor, type RGB } from "/src/utils/colors"

export interface ChaosPoint {
    x: number;
    y: number;
    z: number;
}

export interface ChaosAttractor {
    dims: 3;
    params: Record<string, number>;
    step: (x: number, y: number, z: number, params: Record<string, number>) => [number, number, number];
    speedFactor: number;
    scaleFactor: number;
    start: ChaosPoint;
    view: ChaosPoint;
}

interface ChaosProps {
    attractor?: ChaosAttractor;
    width?: number | string;
    height?: number | string;
    pitch?: number;
    yaw?: number;
    speed?: number;
    lineWidth?: number;
    colorTransition?: number;
    refresh?: boolean;
    className?: string;
    style?: CSSProperties;
}

interface CanvasState { ctx: CanvasRenderingContext2D; width: number; height: number; }

export default function Chaos({
    attractor,
    width,
    height,
    pitch = 0,
    yaw = 0,
    speed = 1,
    lineWidth = 1,
    colorTransition = 300,
    className = "",
    style = {},
}: ChaosProps) {

    // Wrapper
    
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Canvas

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper) {return;}
        if (width) {wrapper.style.width = typeof width === "number" ? `${width}px` : width;}
        if (height) {wrapper.style.height = typeof height === "number" ? `${height}px` : height;}

        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth || wrapper.clientWidth;
        const cssH = canvas.clientHeight || wrapper.clientHeight;
        canvas.width = Math.floor(cssW * dpr);
        canvas.height = Math.floor(cssH * dpr);
        const ctx = canvas.getContext("2d");
        ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }, [width, height]);

    useEffect(() => {
        resizeCanvas();
    }, []);

    // Render Refs

    const rafRef = useRef<number | null>(null);
    const lastColorTimeRef = useRef(performance.now());
    const lastChaosTimeRef = useRef(performance.now());

    // Color Refs

    const colorRafRef = useRef<number | null>(null);

    const currentColorRef = useRef<RGB>([0, 0, 0]);
    const targetColorRef = useRef<RGB>([0, 0, 0]);
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
        return () => { window.removeEventListener("themeStorage", onStorage); };

    }, [readColor]);

    // Position Ref

    const pointRef = useRef<ChaosPoint>({ x: 0.1, y: 0, z: 0 });

    // Chaos Drawing

    const calc = useCallback((vec: ChaosPoint): [number, number] => {
        const cosPitch = Math.cos(pitch);
        const sinPitch = Math.sin(pitch);
        const cosYaw = Math.cos(yaw);
        const sinYaw = Math.sin(yaw);
        
        const x = vec.x * cosYaw + vec.z * sinYaw;
        const z = vec.z * cosYaw - vec.x * sinYaw;
        const y = vec.y * cosPitch - z * sinPitch;

        return [x, y];
    }, [pitch, yaw]);

    const getCTX = (): CanvasState | null => {
        const canvas = canvasRef.current;
        if (!canvas) {return null;}

        const ctx = canvas.getContext("2d");
        if (!ctx) {return null;}

        const W = ctx.canvas.clientWidth;
        const H = ctx.canvas.clientHeight;

        return { ctx, width: W, height: H };
    }

    const fillChaos = () => {
        
        const canvasState = getCTX();
        if (!canvasState) {return;}
        const { ctx, width: W, height: H } = canvasState;

        ctx.globalCompositeOperation = "source-in";

        ctx.fillStyle = rgbToCss(currentColorRef.current);
        ctx.fillRect(0, 0, W, H);

        ctx.globalCompositeOperation = "source-over";
    };

    const setupChaos = () => {
        
        const canvasState = getCTX();
        if (!canvasState) {throw new Error("Chaos canvas is unavailable");}
        const { ctx, width: W, height: H } = canvasState;

        ctx.clearRect(0, 0, W, H);

        ctx.fillStyle = rgbToCss(currentColorRef.current);

        return canvasState;
    };

    const drawChaos = useCallback(() => {

        if (!attractor) {return;}

        const { ctx, width: W, height: H } = setupChaos();

        const params = attractor.params;
        const dims = attractor.dims;

        pointRef.current = { ...attractor.start };

        lastChaosTimeRef.current = performance.now();

        const step = (now: number): void => {

            let dt = (now - lastChaosTimeRef.current) / attractor.speedFactor * speed;
            dt = Math.min(dt, 0.001);
            lastChaosTimeRef.current = now;
            
            // console.log(pointRef.current);

            let { x, y, z } = pointRef.current;

            const [cx, cy] = dims === 3 ? calc(pointRef.current) : [x, y];

            ctx.beginPath();
            ctx.strokeStyle = rgbToCss(currentColorRef.current);

            const sx = W / 2 + cx * attractor.scaleFactor;
            const sy = H / 2 + cy * attractor.scaleFactor;

            ctx.moveTo(sx, sy);

            for (let i = 0; i < 200; i++) {

                const d = attractor.step(x, y, z, params);

                x += d[0] * dt;
                y += d[1] * dt;
                if (dims === 3) {z += d[2] * dt;}

                pointRef.current = { x, y, z };

                const [cx, cy] = dims === 3 ? calc(pointRef.current) : [x, y];

                const nx = W / 2 + cx * attractor.scaleFactor;
                const ny = H / 2 + cy * attractor.scaleFactor;

                ctx.lineTo(nx, ny);
            }

            ctx.stroke();

            pointRef.current = { x, y, z };

            rafRef.current = window.requestAnimationFrame(step);
        };

        rafRef.current = window.requestAnimationFrame(step);

    }, [attractor, speed, lineWidth, calc]);

    useEffect(() => {
        
        const cut = () => {
            if (rafRef.current) {cancelAnimationFrame(rafRef.current);}
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
			if (rafRef.current) {cancelAnimationFrame(rafRef.current);}
		};

	}, [drawChaos, resizeCanvas]);

    useEffect(() => {
    
        lastColorTimeRef.current = performance.now();

        const loop = (now: number): void => {
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

            colorRafRef.current = window.requestAnimationFrame(loop);
        };

        colorRafRef.current = window.requestAnimationFrame(loop);

        return () => {
            if (colorRafRef.current) {cancelAnimationFrame(colorRafRef.current);}
        };

    }, [colorTransition]);

    return (
        <div ref={wrapperRef} className={`relative ${className}`} style={{ ...style, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
			<canvas ref={canvasRef} style={{ display: "block" , width: "100%", height: "100%"}}  />
		</div>
    );
}
