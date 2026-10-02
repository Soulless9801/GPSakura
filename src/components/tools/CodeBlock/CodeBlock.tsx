import { ShikiHighlighter } from 'react-shiki';

import './CodeBlock.css';

interface CodeBlockProps {
    code?: string;
    lang?: string;
    theme?: string;
}

export default function CodeBlock({ code, lang = "cpp", theme = "github-dark" }: CodeBlockProps) {

    return (

        <ShikiHighlighter language={lang} theme={theme} className="code-block">
            {code ? code.trim() : "// No Solution"}
        </ShikiHighlighter>

    );
};