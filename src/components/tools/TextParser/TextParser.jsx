import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { parseMarkdown } from '/src/utils/parse.js';

import renderMathInElement from 'katex/contrib/auto-render';

import 'katex/dist/katex.min.css';
import './TextParser.css';

export default forwardRef(function TextParser({ text, className="" }, ref){

    const containerRef = useRef(null);

    useImperativeHandle(ref, () => containerRef.current);

    useEffect(() => {
        if (!containerRef.current) return;

        containerRef.current.innerHTML = parseMarkdown(text);

        renderMathInElement(containerRef.current, {
            delimiters: [
                { left: "\\[", right: "\\]", display: true },
                { left: "\\(", right: "\\)", display: false },
            ],
        });
    }, [text]);

    return (
        <div ref={containerRef} className={`textParserContainer ${className}`} />
    );

});