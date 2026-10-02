import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { loadValue } from '/src/utils/storage';
import { deserialize } from '/src/utils/serial';

import BlogPost from '/src/components/blog/BlogPost/BlogPost';
import Select from '/src/components/tools/Select/Select';
import Pagination from '/src/components/tools/Pagination/Pagination';
import Modal from '/src/components/tools/Modal/Modal';

import './BlogApp.css';

interface BlogPostData {
    id: string | number;
    title: string;
    body: string;
    created: string;
    updated: string;
}

type SortBy = 'updated' | 'created' | 'title' | 'pinned';

export default function BlogApp() {

    const lengthOptions = [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '5', label: '5' },
        { value: '10', label: '10' },
        { value: '15', label: '15' },
        { value: '20', label: '20' },
    ];

    const sortByOptions = [
        { value: 'updated', label: 'Last Updated' },
        { value: 'created', label: 'Creation Time' },
        { value: 'title', label: 'Title' },
        { value: 'pinned', label: 'Pinned' },
    ];

    const [posts, setPosts] = useState<BlogPostData[]>([]);
    const [visiblePosts, setVisiblePosts] = useState<BlogPostData[]>([]);
    const [page, setPage] = useState(0);

    const lengthKey = 'blogLength';
    const orderKey = 'blogOrder';
    const sortByKey = 'blogSortBy';

    const [length, setLength] = useState<number>(() => loadValue(lengthKey, 5));
    const [order, setOrder] = useState<number>(() => loadValue(orderKey, 0));
    const [sortBy, setSortBy] = useState<SortBy>(() => loadValue<SortBy>(sortByKey, 'updated'));

    const reverseOrder = useCallback(() => {
        setOrder(prev => 1 - prev);
        setPosts(prev => [...prev].reverse());
    }, []);

    const cmp = useCallback((a: BlogPostData, b: BlogPostData): number => {
        const aPinned = localStorage.getItem(`pin_${a.id}`) === 'true';
        const bPinned = localStorage.getItem(`pin_${b.id}`) === 'true';
        if (aPinned !== bPinned) {return bPinned ? 1 : -1;}
        const aDate = new Date(a.updated);
        const bDate = new Date(b.updated);
        return bDate.getTime() - aDate.getTime();
    }, []);

    const sortPosts = useCallback((postsToSort: BlogPostData[], sortByValue: SortBy): BlogPostData[] => {
        const sorted = [...postsToSort];
        if (sortByValue === "pinned") {
            sorted.sort(cmp);
        } else if (sortByValue === "updated") {
            sorted.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
        } else if (sortByValue === "created") {
            sorted.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        } else if (sortByValue === "title") {
            sorted.sort((a, b) => a.title.localeCompare(b.title));
        }

        if (order) {sorted.reverse();}

        return sorted;
    }, [cmp, order]);

    useEffect(() => {
        async function fetchPosts() {
            
            const res = await fetch('/.netlify/functions/firebase-collection-query', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    col: "posts",
                    loc: "firebaseBlogPosts",
                }),
            });

            // const res = await fetch('/.netlify/functions/firebase-blog-posts');

            const blogPosts = deserialize<BlogPostData[]>(await res.text());

            setPosts(sortPosts(blogPosts, sortBy));
            
        }

        fetchPosts();

    }, []);

    useEffect(() => {
        setVisiblePosts(posts.slice(page * length, (page + 1) * length));
    }, [posts, page, length]);

    useEffect(() => { localStorage.setItem(lengthKey, JSON.stringify(length)); }, [length]);
    useEffect(() => { localStorage.setItem(orderKey, JSON.stringify(order)); }, [order]);
    useEffect(() => { localStorage.setItem(sortByKey, JSON.stringify(sortBy)); }, [sortBy]);

    const blogMenu = (
        <div className="blogHeader">
            <div>
                <button onClick={() => {
                    setPosts(prev => sortPosts(prev, sortBy));
                    setPage(0);
                }}>
                    Refresh &#8635;
                </button>
            </div>
            <div>
                <Select 
                    id="blogLengthMenu"
                    options={lengthOptions}
                    defaultValue={length}
                    onChange={e => {
                        setPage(Math.floor(length * page / Number(e.value)));
                        setLength(Number(e.value));
                    }}
                    labelL={"Showing"}
                    labelR={"entries per page"}
                    className="blogLengthMenu"
                />
            </div>
            <div>
                <label htmlFor="blogSortDirection" className="blogLabelR">Sort Direction</label>
                <button
                    id="blogSortDirection"
                    className="blogSortDirectionButton"
                    onClick={() => { reverseOrder(); }}
                >
                    {order ? 'Reverse Alphabetical / Oldest' : 'Alphabetical / Newest'} <i className={`fa fa-arrow-${order ? "down-z-a" : "down-a-z"}`}></i>
                </button>
            </div>
            <div>
                <Select
                    id="blogSortMenu"
                    options={sortByOptions}
                    defaultValue={sortBy}
                    onChange={e => {
                        const value = e.value;
                        if (typeof value !== "string" || !['updated', 'created', 'title', 'pinned'].includes(value)) {return;}
                        setSortBy(value as SortBy);
                        setPosts(prev => sortPosts(prev, value as SortBy));
                        setPage(0);
                    }}
                    align='right'
                    labelL={"Sort By"}
                    className="blogSortMenu"
                />
            </div>
        </div>
    );

    return (
        <div className="blogAppContainer container-fluid">
            <div className="text-center text-lg-start" style={{marginBottom: "var(--sep-distance-primary)"}}>
                <Modal id="blogMenuModal" title="Blog Menu" description={blogMenu} buttonText="Blog Menu" scrollable={false}/>
            </div>
            <AnimatePresence mode="wait">
                <motion.div key={JSON.stringify(visiblePosts.map(p => p.id))} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="row">
                        {visiblePosts.map(post => (
                            <div key={post.id} className="col-12">
                                <BlogPost title={post.title} body={post.body} creationTime={post.created} updateTime={post.updated} postId={post.id}/>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </AnimatePresence>
            <div className="row">
                <div className="col-12 d-flex justify-content-center">
                    <Pagination page={page} setPage={setPage} postsLength={posts.length} pageSize={length} />
                </div>
            </div>
        </div>
    );
}
