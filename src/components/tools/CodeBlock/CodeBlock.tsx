import { ShikiHighlighter } from 'react-shiki';

import './CodeBlock.css';

interface CodeBlockProps {
    code?: string;
    lang?: string;
    theme?: string;
}

export default function CodeBlock({ code, lang = "cpp", theme }: CodeBlockProps) {

    return (

        <ShikiHighlighter
            language={lang}
            theme={theme ?? { light: "github-light", dark: "github-dark" }}
            defaultColor={theme ? undefined : "light-dark()"}
            className="code-block"
        >
            {code ? code.trim() : "// No Solution"}
        </ShikiHighlighter>

    );
};