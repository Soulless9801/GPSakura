import { useEffect, useRef } from 'react';
import { parseMarkdown } from '/src/utils/parse.js';
import { BlockMath, InlineMath } from 'react-katex';

import renderMathInElement from 'katex/contrib/auto-render';

import 'katex/dist/katex.min.css';
import './TextParser.css';

export default function TextParser({ text, className="" }){
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        containerRef.current.innerHTML = parseMarkdown(text);

        renderMathInElement(containerRef.current, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false },
            ],
        });
    }, [text]);

    return (
        <div ref={containerRef} className={`textParserContainer ${className}`} />
    );

};