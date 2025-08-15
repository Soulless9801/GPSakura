import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, getOriginIndex } from 'framer-motion';

import { getFirestore } from "firebase/firestore";
import { initializeApp } from 'firebase/app';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

import BlogPost from './BlogPost';

import Select from './Select.jsx';

import Pagination from './Pagination.jsx';

import './BlogApp.css';

const firebaseConfig = {
    apiKey: "AIzaSyCFsyyWkEpZVkCZrF_bjJRtdvz1gk_SokA",
    authDomain: "datagrab-363720.firebaseapp.com",
    projectId: "datagrab-363720",
    storageBucket: "datagrab-363720.firebasestorage.app",
    messagingSenderId: "896726376620",
    appId: "1:896726376620:web:2e67c17ad2a74250ce7f09",
    measurementId: "G-WW0RKGE7QV"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export default function BlogApp() {

    const [posts, setPosts] = useState([]);
    const [window, setWindow] = useState([]);
    const [page, setPage] = useState(0);
    const [length, setLength] = useState(() => {
        const raw = localStorage.getItem('blogLength');
        return raw !== null ? JSON.parse(raw) : 5;
    });
    const [order, setOrder] = useState(() => {
        const raw = localStorage.getItem('blogOrder');
        return raw !== null ? JSON.parse(raw) : 0;
    });
    const [sortBy, setSortBy] = useState(() => {
        const raw = localStorage.getItem('blogSortBy');
        return raw !== null ? JSON.parse(raw) : 'updated';
    });

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
        { value: 'timestamp', label: 'Creation Time' },
        { value: 'title', label: 'Title' },
        { value: 'pinned', label: 'Pinned' },
    ];

    const findIndex = useCallback((val, list, defaultIndex) => {
        const idx = list.findIndex(item => item.value === String(val));
        return idx !== -1 ? idx : defaultIndex;
    }, []);

    const reverseOrder = useCallback(() => {
        setOrder(prev => 1 - prev);
        setPosts(prev => [...prev].reverse());
    }, []);

    const cmp = useCallback((a, b) => {
        const aPinned = localStorage.getItem(`pin_${a.id}`) === 'true';
        const bPinned = localStorage.getItem(`pin_${b.id}`) === 'true';
        const aDate = a.updated.toDate()
        const bDate = b.updated.toDate()
        if (aPinned && bPinned) return bDate - aDate;
        if (aPinned) return -1;
        if (bPinned) return 1;
        return bDate - aDate;
    }, []);

    const sortPosts = useCallback((posts, sortBy) => {
        let sorted = [...posts];
        if (sortBy === "pinned") {
            sorted.sort(cmp);
        } else if (sortBy === "updated") {
            sorted.sort((a, b) => b.updated.toDate() - a.updated.toDate());
        } else if (sortBy === "timestamp") {
            sorted.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());
        } else if (sortBy === "title") {
            sorted.sort((a, b) => a.title.localeCompare(b.title));
        }
        return sorted;
    }, [cmp]);

    useEffect(() => {
        async function fetchPosts() {
            const q = query(collection(db, 'posts'));
            const snap = await getDocs(q);

            let posts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            posts = sortPosts(posts, sortBy);

            if (order) posts.reverse();

            setPosts(posts);
        }

        fetchPosts();

    }, []);

    useEffect(() => {
        setWindow(posts.slice(page * length, (page + 1) * length));
    }, [posts, page, length]);

    useEffect(() => {
        localStorage.setItem('blogLength', JSON.stringify(length));
        localStorage.setItem('blogOrder', JSON.stringify(order));
        localStorage.setItem('blogSortBy', JSON.stringify(sortBy));
    }, [length, order, sortBy]);

    return (
        <div className="blogAppContainer container-fluid">
            <div className="blogHeader row g-3">
                <div className="blogLength col-12 col-lg-6">
                    <div className="d-flex flex-column flex-md-row justify-content-center justify-content-lg-start align-items-center gap-3">
                        <div className="text-center text-lg-start">
                            <button className="blogButton" onClick={() => {
                                setPosts(prev => sortPosts(prev, sortBy));
                                setPage(0);
                            }}>
                                Refresh &#8635;
                            </button>
                        </div>
                        <div className="text-center text-lg-start">
                            <label htmlFor="blogLengthMenu" className="blogLengthLabel">Showing</label>
                            <Select id="blogLengthMenu" value={length}
                                options={lengthOptions}
                                defaultIndex={findIndex(length, lengthOptions, 2)}
                                onChange={e => {
                                    setPage(Math.floor(length * page / Number(e.value)));
                                    setLength(Number(e.value));
                                }}
                                className="blogLengthMenu"
                            />
                            <label htmlFor="blogLengthMenu" className="blogLengthLabel">entries per page</label>
                        </div>
                    </div>
                </div>
                <div className="blogSort col-12 col-lg-6">
                    <div className="d-flex flex-column flex-md-row justify-content-center justify-content-lg-end align-items-center gap-3">
                        <div className="text-center text-lg-end">
                            <label htmlFor="blogSortDirectionBtn" className="blogSortLabel">Sort Direction:</label>
                            <button
                                className="blogSortDirectionBtn "
                                onClick={() => reverseOrder()}
                            >
                                Reverse ↑↓
                            </button>
                        </div>
                        <div className="text-center text-lg-end">
                            <label htmlFor="blogSortMenu" className="blogSortLabel">Sort By:</label>
                            <Select
                                id="blogSortMenu"
                                options={sortByOptions}
                                defaultIndex={findIndex(sortBy, sortByOptions, 0)}
                                onChange={e => {
                                    const value = e.value;
                                    setSortBy(value);
                                    setPosts(prev => sortPosts(prev, value));
                                    setPage(0);
                                }}
                                align='right'
                                className="blogSortMenu"
                            />
                        </div>
                    </div>
                </div>
            </div>
            <AnimatePresence mode="wait">
                <motion.div key={JSON.stringify(window.map(p => p.id))} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="row">
                        {window.map(post => (
                            <div key={post.id} className="col-12">
                                <BlogPost title={post.title} body={post.body} creationTime={post.timestamp} updateTime={post.updated} postId={post.id}/>
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
