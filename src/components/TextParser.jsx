import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

import './TextParser.css';

const BlockLaTeXParser = ({ text }) => {
    const parts = text.split(/(\$\$[^$]*\$\$)/g);
    return (
        <div>
            {parts.map((part, index) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    const math = part.slice(2, -2);
                    return <BlockMath key={index} math={math} />;
                } else {
                    return <InlineLatexParser key={index} text={part} />;
                }
            })}
        </div>
    );
};

const InlineLatexParser = ({ text }) => {
    const parts = text.split(/(\$[^$]*\$)/g);
    return (
        <span>
            {parts.map((part, index) => {
                if (part.startsWith('$') && part.endsWith('$')) {
                    const math = part.slice(1, -1);
                    return <InlineMath key={index} math={math} />;
                } else {
                    return <DecorationParser key={index} text={part} />;
                }
            })}
        </span>
    );
}

const DecorationParser = ({ text }) => {
    const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
    return (
        <span>
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index}><LinkParser text={part.slice(2, -2)} /></strong>;
                } else if (part.startsWith('__') && part.endsWith('__')) {
                    return <em key={index}><LinkParser text={part.slice(2, -2)} /></em>;
                } else {
                    return <span key={index}><LinkParser text={part} /></span>;
                }
            })}
        </span>
    );
};

const LinkParser = ({ text }) => {
    const parts = text.split(/(\[.*?\]\(.*?\))/g);
    return (
        <span>
            {parts.map((part, index) => {
                const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
                if (match) {
                    const [, label, url] = match;
                    return (
                        <a key={index} href={url} className="blogLink">
                            {label}
                        </a>
                    );
                }
                return part;
            })}
        </span>
    );
};

export default function TextParser({ text }){
    const blocks = text.split('\\n');
    return (
        <span>
            {blocks.map((block, index) => {
                return <BlockLaTeXParser key={index} text={block}/>;
            })}
        </span>
    )
}