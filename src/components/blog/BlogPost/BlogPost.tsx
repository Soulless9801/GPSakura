import { useState, useEffect, useRef } from 'react';
import { formatDate } from '/src/utils/time';
import { loadValue } from '/src/utils/storage';

import GenericButton from '/src/components/tools/GenericButton/GenericButton';
import TextParser from '/src/components/tools/TextParser/TextParser';

import './BlogPost.css'

interface BlogPostProps {
    title: string;
    body: string;
    creationTime: string | number | Date;
    updateTime: string | number | Date;
    postId: string | number;
}

export default function BlogPost({ title, body, creationTime, updateTime, postId }: BlogPostProps) {

    const collapsedKey = `blogPostCollapsed_${String(postId)}`;
    const scrolledKey = `blogPostScrolled_${String(postId)}`;

    const [collapsed, setCollapsed] = useState(loadValue(collapsedKey, false));
    const [scrolled, setScrolled] = useState(loadValue(scrolledKey, false));

    useEffect(() => {
        localStorage.setItem(collapsedKey, JSON.stringify(collapsed));
        localStorage.setItem(scrolledKey, JSON.stringify(scrolled));
    }, [collapsed, scrolled]);

    const bodyRef = useRef<HTMLDivElement>(null);

    const minHeight = 300;

    const [fit, setFit] = useState(true);

    useEffect(() => {
        const el = bodyRef.current;
        if (!el) {return;}

        const update = () => {
            if (!scrolled) {return;}
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
        <section className="container-fluid blogPostContainer">
            <div className="blogPostHeader">
                <div className="blogPostTitle" onClick={() => { setCollapsed(prev => !prev); }}>{title}</div>
                <div><i className="fa fa-scroll" style={{cursor: "pointer"}} onClick={() => { setScrolled(prev => !prev); }}></i></div>
            </div>
            {collapsed ? null :
                <>
                    <div className="timestamp">Posted {formatDate(creationTime)}</div>
                    <div className={`blogPostBody ${scrolled && fit ? "fadeScroll" : ""}`}><TextParser ref={bodyRef} text={body} className={scrolled && fit ? "fadeScrollInner" : ""} /></div>
                </>
            }
            <div className="timestamp">Updated {formatDate(updateTime)}</div>
            <div className="blogPostLike">
                <GenericButton postId={postId} type={'pin'} icon='fa-heart' fill='#ff0000'/>
                <GenericButton postId={postId} type={'like'} icon='fa-thumbs-up' fill='#00ff00'/>
            </div>
        </section>
    );
}
