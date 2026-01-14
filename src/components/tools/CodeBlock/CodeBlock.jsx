import { useEffect } from 'react';
import { ShikiHighlighter } from 'react-shiki';

import './CodeBlock.css';

export default function CodeBlock({ code, lang="cpp", theme="github-dark" }) {

    useEffect(() => {
        console.log(code);
    }, [code]);

    return (
        <ShikiHighlighter language={lang} theme={theme} className="code-block">
            {code.trim()}
        </ShikiHighlighter>
    );
};