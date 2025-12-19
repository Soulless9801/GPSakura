import { useRef, useEffect, useCallback } from "react";
import { readColor, rgbToCss } from "/src/utils/colors.js";

export default function FreqGuesser({signal, width, height, components, className="", style={}, colorTransition = 300}) {

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
    const secondaryColorRef = useRef([0, 0, 0]);
	const targetCurrentColorRef = useRef([0, 0, 0]);
    const targetSecondaryColorRef = useRef([0, 0, 0]);
	const transitionProgressRef = useRef(1);

	useEffect(() => {
		const rgb = readColor();
		currentColorRef.current = rgb[0];
		targetCurrentColorRef.current = rgb[0];
        secondaryColorRef.current = rgb[1];
        targetSecondaryColorRef.current = rgb[1];

		const onStorage = () => {
			const rgb = readColor();
			targetCurrentColorRef.current = rgb[0];
            targetSecondaryColorRef.current = rgb[1];
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

    const drawAxis = useCallback(() => {
        
        const [ctx, W, H] = getCTX();

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
        const max = 3 * components;
        const midY = H / 2;

        drawAxis();

        ctx.strokeStyle = rgbToCss(currentColorRef.current);
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
    }, [signal, components]);

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
                const b = targetCurrentColorRef.current;

                currentColorRef.current = [
                    a[0] + (b[0] - a[0]) * t,
                    a[1] + (b[1] - a[1]) * t,
                    a[2] + (b[2] - a[2]) * t,
                ];

                const x = secondaryColorRef.current;
                const y = targetSecondaryColorRef.current;
                
                secondaryColorRef.current = [
                    x[0] + (y[0] - x[0]) * t,
                    x[1] + (y[1] - x[1]) * t,
                    x[2] + (y[2] - x[2]) * t,
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
