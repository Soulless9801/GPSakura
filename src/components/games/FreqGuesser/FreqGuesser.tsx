import { useRef, useEffect, useCallback, type CSSProperties } from "react";
import { readColor, rgbToCss, type RGB } from "/src/utils/colors";

interface FreqGuesserProps {
    signal: Float32Array;
    width?: number | string;
    height?: number | string;
    components: number;
    className?: string;
    style?: CSSProperties;

}

interface CanvasState { ctx: CanvasRenderingContext2D; width: number; height: number; }

export default function FreqGuesser({ signal, width, height, components, className = "", style = {} }: FreqGuesserProps) {

    const wrapperRef = useRef<HTMLDivElement>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper) {return;}
        if (width) {wrapper.style.width = typeof width === "number" ? `${String(width)}px` : width;}
        if (height) {wrapper.style.height = typeof height === "number" ? `${String(height)}px` : height;}

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

	const currentColorRef = useRef<RGB>([0, 0, 0]);
    const secondaryColorRef = useRef<RGB>([0, 0, 0]);

    useEffect(() => {
        const rgb = readColor();
        currentColorRef.current = rgb[0];
        secondaryColorRef.current = rgb[1];
    }, []);

    const getCTX = (): CanvasState | null => {
        const canvas = canvasRef.current;
        if (!canvas) {return null;}

        const ctx = canvas.getContext("2d");
        if (!ctx) {return null;}

        const W = ctx.canvas.clientWidth;
        const H = ctx.canvas.clientHeight;

        return { ctx, width: W, height: H };
    }

    const drawAxis = useCallback(() => {
        
        const state = getCTX();
        if (!state) {return;}
        const { ctx, width: W, height: H } = state;

        ctx.strokeStyle = rgbToCss(secondaryColorRef.current);
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4;

        ctx.beginPath();

        ctx.moveTo(0, 0);
        ctx.lineTo(0, H);

        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);

        for (let i = 1; i <= components; i++){
            const y = H / 2 + H / 2 / components * i;
            ctx.moveTo(0, y);
            ctx.lineTo(5, y);
        }

        for (let i = 1; i <= components; i++){
            const y = H / 2 - H / 2 / components * i;
            ctx.moveTo(0, y);
            ctx.lineTo(5, y);
        }

        ctx.stroke();

        ctx.globalAlpha = 1;
        
    }, [components]);

    const drawSignal = useCallback(() => {
        
        const state = getCTX();
        if (!state) {return;}
        const { ctx, width: W, height: H } = state;

        ctx.clearRect(0, 0, W, H);

        // normalize vertically
        const max = 3 * components;
        const midY = H / 2;

        drawAxis();

        ctx.strokeStyle = rgbToCss(currentColorRef.current);
        ctx.lineWidth = 2;
        ctx.beginPath();

        signal.forEach((v, i) => {
            const x = (i / (signal.length - 1)) * W;
            const y = midY - (v / max) * (H * 0.4);
            if (i === 0) {ctx.moveTo(x, y);}
            else {ctx.lineTo(x, y);}
        });

        ctx.stroke();

    }, [signal, components, drawAxis]);

    useEffect(() => {

        drawSignal();

        const handleResize = () => {
			resizeCanvas();
            drawSignal();
		};

		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
		};
    }, [resizeCanvas, width, height, signal])

    useEffect(() => {
        const repaintTheme = () => {
            const rgb = readColor();
            currentColorRef.current = rgb[0];
            secondaryColorRef.current = rgb[1];
            drawSignal();
        };
        window.addEventListener('themeStorage', repaintTheme);
        return () => { window.removeEventListener('themeStorage', repaintTheme); };
    }, [drawSignal]);

    return (
		<div ref={wrapperRef} className={`relative ${className}`} style={{ ...style, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
			<canvas ref={canvasRef} style={{ display: "block" , width: "100%", height: "100%"}}  />
		</div>
	);
}
