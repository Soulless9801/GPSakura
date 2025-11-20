import { formatDate } from '/src/utils/time.js';

import GenericButton from '/src/components/tools/GenericButton/GenericButton.jsx';
import TextParser from '/src/components/tools/TextParser/TextParser.jsx';

import './BlogPost.css'

export default function BlogPost({ title, body, creationTime, updateTime, postId }) {
    return (
        <div className="container-fluid blogPostContainer">
            <div className="blogPostTitle">{title}</div>
            <div className="blogPostTime">Posted {formatDate(creationTime)}</div>
            <div className="blogPostBody"><TextParser text={body}/></div>
            <div className="blogPostTime">Updated {formatDate(updateTime)}</div>
            <div className="blogPostLike">
                <GenericButton postId={postId} type={'pin'} icon='fa-heart' fill='#ff0000'/>
                <GenericButton postId={postId} type={'like'} icon='fa-thumbs-up' fill='#00ff00'/>
            </div>
        </div>
    );
}
