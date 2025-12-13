import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { rgbToCss } from "/src/utils/colors.js";
import { Color } from "/src/entities/color.js";

export default forwardRef(function ColorPicker(
    {
        width,
        height,
        style = {},
        className = "",
    },
    ref
) {

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

    const [color, setColor] = useState(new Color());

    const colorRef = useRef(color);

    useEffect(() => {

        const recolor = () => {

            const canvas = canvasRef.current;

            const ctx = canvas.getContext("2d");

            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            ctx.clearRect(0, 0, w, h);

            // console.log(color);

            colorRef.current = color;

            ctx.fillStyle = rgbToCss(color.color);
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

    useImperativeHandle(ref, () => {
        return {
            guess(rgb){
                const guessColor = new Color();
                guessColor.set(rgb);
                return colorRef.current.compare(guessColor);
            },
            gen(){
                setColor(new Color());
            }
        }
    }, []);

    return (
        <div ref={wrapperRef} className={`relative ${className}`} style={{ ...style, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <canvas ref={canvasRef} style={{ display: "block" , width: "100%", height: "100%"}}  />
        </div>
    );
});


