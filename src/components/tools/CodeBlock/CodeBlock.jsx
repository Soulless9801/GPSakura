import { ShikiHighlighter } from 'react-shiki';

import './CodeBlock.css';

export default function CodeBlock({ code, lang="cpp", theme="github-dark" }) {

    return (

        <ShikiHighlighter language={lang} theme={theme} className="code-block">
            {code ? code.trim() : "// No Solution"}
        </ShikiHighlighter>

    );
};