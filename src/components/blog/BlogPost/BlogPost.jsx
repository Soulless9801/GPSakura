import { useState, useEffect, useRef } from 'react';
import { formatDate } from '/src/utils/time.js';
import { loadValue } from '/src/utils/storage.js';

import GenericButton from '/src/components/tools/GenericButton/GenericButton.jsx';
import TextParser from '/src/components/tools/TextParser/TextParser.jsx';

import './BlogPost.css'

export default function BlogPost({ title, body, creationTime, updateTime, postId}) {

    const collapsedKey = `blogPostCollapsed_${postId}`;
    const scrolledKey = `blogPostScrolled_${postId}`;

    const [collapsed, setCollapsed] = useState(loadValue(collapsedKey, false));
    const [scrolled, setScrolled] = useState(loadValue(scrolledKey, false));

    useEffect(() => {
        localStorage.setItem(collapsedKey, JSON.stringify(collapsed));
        localStorage.setItem(scrolledKey, JSON.stringify(scrolled));
    }, [collapsed, scrolled]);

    const ref = useRef(null);

    const minHeight = 300;

    const [fit, setFit] = useState(true);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const update = () => {
            if (!scrolled) return;
            console.log(el.clientHeight, el.scrollHeight, minHeight);
            const canScroll = el.clientHeight >= minHeight && el.scrollHeight > el.clientHeight;
            setFit(canScroll);  
        };

        update();

        const ro = new ResizeObserver(update);
        ro.observe(el);

        return () => {
            ro.disconnect();
        };
    }, [collapsed, scrolled]);

    return (
        <div className="container-fluid blogPostContainer">
            <div className="blogPostHeader">
                <div className="blogPostTitle" onClick={() => setCollapsed(prev => !prev)}>{title}</div>
                <div><button onClick={() => setScrolled(prev => !prev)}>{scrolled ? "Disable Scroll" : "Enable Scroll"}</button></div>
            </div>
            {collapsed ? null :
                <>
                    <div className="blogPostTime">Posted {formatDate(creationTime)}</div>
                    <div className={`blogPostBody ${scrolled && fit ? "fadeScroll" : ""}`}><TextParser ref={ref} text={body} className={`${scrolled && fit ? "fadeScrollInner" : ""}`} /></div>
                </>
            }
            <div className="blogPostTime">Updated {formatDate(updateTime)}</div>
            <div className="blogPostLike">
                <GenericButton postId={postId} type={'pin'} icon='fa-heart' fill='#ff0000'/>
                <GenericButton postId={postId} type={'like'} icon='fa-thumbs-up' fill='#00ff00'/>
            </div>
        </div>
    );
}
