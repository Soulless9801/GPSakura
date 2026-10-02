import { useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { rgbToCss } from "/src/utils/colors";

interface ColorPickerProps {
    width?: number | string;
    height?: number | string;
    color: readonly number[];
    style?: CSSProperties;
    className?: string;
}

export default function ColorPicker({ width, height, color, style = {}, className = "" }: ColorPickerProps) {

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
        canvas.width = Math.floor(cssW * dpr / 2);
        canvas.height = Math.floor(cssH * dpr);
        const ctx = canvas.getContext("2d");
        ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }, [width, height]);

    useEffect(() => {
        resizeCanvas();
    }, []);

    useEffect(() => {

        const recolor = () => {
            const canvas = canvasRef.current;
            if (!canvas) {return;}
            const ctx = canvas.getContext("2d");
            if (!ctx) {return;}

            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            ctx.clearRect(0, 0, w, h);

            ctx.fillStyle = rgbToCss(color);
            ctx.fillRect(0, 0, w, h);
        };

        recolor();

        const handleResize = () => {
			resizeCanvas();
			recolor();
		};

		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
		};

    }, [color, resizeCanvas]);   

    return (
        <div ref={wrapperRef} className={`relative ${className}`} style={{ ...style, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <canvas ref={canvasRef} style={{ display: "block" , width: "100%", height: "100%"}}  />
        </div>
    );
}


