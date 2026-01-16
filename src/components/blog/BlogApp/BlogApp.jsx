import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadValue } from '/src/utils/storage.js';

import BlogPost from '/src/components/blog/BlogPost/BlogPost.jsx';
import Select from '/src/components/tools/Select/Select.jsx';
import Pagination from '/src/components/tools/Pagination/Pagination.jsx';
import Modal from '/src/components/tools/Modal/Modal.jsx';

import './BlogApp.css';

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

    const [posts, setPosts] = useState([]);
    const [window, setWindow] = useState([]);
    const [page, setPage] = useState(0);

    const lengthKey = 'blogLength';
    const orderKey = 'blogOrder';
    const sortByKey = 'blogSortBy';

    const [length, setLength] = useState(() => loadValue(lengthKey, 5));
    const [order, setOrder] = useState(() => loadValue(orderKey, 0));
    const [sortBy, setSortBy] = useState(() => loadValue(sortByKey, 'updated'));

    const reverseOrder = useCallback(() => {
        setOrder(prev => 1 - prev);
        setPosts(prev => [...prev].reverse());
    }, []);

    const cmp = useCallback((a, b) => {
        const aPinned = localStorage.getItem(`pin_${a.id}`) === 'true';
        const bPinned = localStorage.getItem(`pin_${b.id}`) === 'true';
        if (aPinned ^ bPinned) return bPinned - aPinned;
        const aDate = new Date(a.updated);
        const bDate = new Date(b.updated);
        return bDate - aDate;
    }, []);

    const sortPosts = useCallback((posts, sortBy) => {
        let sorted = [...posts];
        if (sortBy === "pinned") {
            sorted.sort(cmp);
        } else if (sortBy === "updated") {
            sorted.sort((a, b) => new Date(b.updated) - new Date(a.updated));
        } else if (sortBy === "created") {
            sorted.sort((a, b) => new Date(b.created) - new Date(a.created));
        } else if (sortBy === "title") {
            sorted.sort((a, b) => a.title.localeCompare(b.title));
        }

        if (order) sorted.reverse();

        return sorted;
    }, [cmp, order]);

    useEffect(() => {
        async function fetchPosts() {

            const json = await fetch('/.netlify/functions/firebase-blog-posts');

            const blogPosts = JSON.parse(await json.text());

            setPosts(sortPosts(blogPosts, sortBy));
            
        }

        fetchPosts();

    }, []);

    useEffect(() => {
        setWindow(posts.slice(page * length, (page + 1) * length));
    }, [posts, page, length]);

    useEffect(() => localStorage.setItem(lengthKey, JSON.stringify(length)), [length]);
    useEffect(() => localStorage.setItem(orderKey, JSON.stringify(order)), [order]);
    useEffect(() => localStorage.setItem(sortByKey, JSON.stringify(sortBy)), [sortBy]);

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
                    onClick={() => reverseOrder()}
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
                        setSortBy(value);
                        setPosts(prev => sortPosts(prev, value));
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
                <Modal id="blogMenuModal" title="Blog Menu" description={blogMenu} buttonText="Blog Menu"/>
            </div>
            <AnimatePresence mode="wait">
                <motion.div key={JSON.stringify(window.map(p => p.id))} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="row">
                        {window.map(post => (
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
