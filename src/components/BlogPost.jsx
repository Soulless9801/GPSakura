import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

import './BlogPost.css'

const TextParser = ({ text }) => {
    const blocks = text.split('\\n');
    return (
        <span>
            {blocks.map((block, index) => {
                return <LaTeXParser text={block}/>;
            })}
        </span>
    )
}

const LaTeXParser = ({ text }) => {
    const parts = text.split(/(\$[^$]*\$)/g);
    return (
        <p>
            {parts.map((part, index) => {
                if (part.startsWith('$') && part.endsWith('$')) {
                    const math = part.slice(1, -1);
                    return <InlineMath key={index} math={math} />;
                } else {
                    return <span key={index}>{part}</span>;
                }
            })}
        </p>
    );
};

export default function BlogPost({ title, body, time }) {
    return (
        <div className="container-fluid blogPostContainer">
            <div className="blogPostTitle">{title}</div>
            <div className="blogPostTime">Created {time.toDate().toLocaleDateString()}</div>
            <div className="blogPostBody"><TextParser text={body} /></div>
        </div>
    );
}
