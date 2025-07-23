import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

import GenericButton from './GenericButton';

import './BlogPost.css'

const TextParser = ({ text }) => {
    const blocks = text.split('\\n');
    return (
        <span>
            {blocks.map((block, index) => {
                return <LaTeXParser key={index} text={block}/>;
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

export default function BlogPost({ title, body, time, postId }) {
    const likeButtonToggle = ({ state }) => {
        console.log("Like State: ", state);
        return;
    }

    const pinButtonToggle = ({ state }) => {
        console.log("Pin State: ", state);
        return;
    }
    return (
        <div className="container-fluid blogPostContainer">
            <div className="blogPostTitle">{title}</div>
            <div className="blogPostTime">Posted {time.toDate().toLocaleDateString()}</div>
            <div className="blogPostBody"><TextParser text={body}/></div>
            <div className="blogPostLike">
                <GenericButton postId={postId} type={'pin'} icon='fa-heart' onToggle={(state) => {likeButtonToggle(state={state})}}/>
                <GenericButton postId={postId} type={'like'} icon='fa-thumbs-up' onToggle={(state) => {pinButtonToggle(state={state})}}/>
            </div>
        </div>
    );
}
