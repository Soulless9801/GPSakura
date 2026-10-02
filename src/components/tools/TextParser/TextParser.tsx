import { useEffect, useRef, forwardRef } from 'react';
import { parseMarkdown } from '/src/utils/parse';

import renderMathInElement from 'katex/contrib/auto-render';

import 'katex/dist/katex.min.css';
import './TextParser.css';

interface TextParserProps {
    text: string;
    className?: string;
}

export default forwardRef<HTMLDivElement, TextParserProps>(function TextParser({ text, className = "" }, ref){

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) {return;}

        containerRef.current.innerHTML = parseMarkdown(text);

        renderMathInElement(containerRef.current, {
            delimiters: [
                { left: "\\[", right: "\\]", display: true },
                { left: "\\(", right: "\\)", display: false },
            ],
        });
    }, [text]);

    return (
        <div
            ref={(node) => {
                containerRef.current = node;
                if (typeof ref === 'function') {ref(node);}
                else if (ref) {ref.current = node;}
            }}
            className={`textParserContainer ${className}`}
        />
    );

});