import { useRef, useEffect, useCallback } from "react";
import { readColor, rgbToCss } from "/src/utils/colors.js";

export default function FreqGuesser({signal, width, height, className="", style={}, colorTransition = 300}) {

    const wrapperRef = useRef(null);

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

    const lastTimeRef = useRef(performance.now());

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

    const getCTX = () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const ctx = canvas.getContext("2d");

        const W = ctx.canvas.clientWidth;
        const H = ctx.canvas.clientHeight;

        return [ctx, W, H];
    }

    const fillSignal = () => {
            
        const [ctx, W, H] = getCTX();

        ctx.globalCompositeOperation = "source-in";

        ctx.fillStyle = rgbToCss(currentColorRef.current);
        ctx.fillRect(0, 0, W, H);

        ctx.globalCompositeOperation = "source-over";
    };

    const drawSignal = useCallback(() => {
        
        const [ctx, W, H] = getCTX();

        ctx.clearRect(0, 0, W, H);

        // normalize vertically
        const max = Math.max(...signal.map(Math.abs)) || 1;
        const midY = H / 2;

        const color = rgbToCss(currentColorRef.current);

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        signal.forEach((v, i) => {
            const x = (i / (signal.length - 1)) * W;
            const y = midY - (v / max) * (H * 0.4);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.stroke();

        fillSignal();
    }, [signal]);

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

                fillSignal();
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
