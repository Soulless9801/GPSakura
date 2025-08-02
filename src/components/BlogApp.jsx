import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

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
    const [length, setLength] = useState(69);
    const [order, setOrder] = useState('desc');

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

    const reorderFunc = useCallback(() => {
        if (document.getElementById('blogSortMenu').value !== 'pinned') return;
        setPosts(prev => {return [...prev].sort(cmp); });
    }, [cmp]);

    useEffect(() => {
        async function fetchPosts() {
            const q = query(collection(db, 'posts'), orderBy('updated', order));
            const snap = await getDocs(q);

            const len = snap.size;

            let posts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            setPosts(posts);
        }
        fetchPosts();
    }, []);

    useEffect(() => {
        setWindow(posts.slice(page * length, (page + 1) * length));
    }, [posts, page, length]);

    useEffect(() => {
        const container = document.querySelector('.blogAppContainer');
        if (container) {
            container.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [page]);

    useEffect(() => {
        setPosts(prev => {
            return [...prev].reverse();
        });
    }, [order]);

    function getWindowKey(window) {
        return window.map(post => post.id).join('-');
    }

    return (
        <div className="blogAppContainer container-fluid">
            <div className="blogHeader row g-3">
                <div className="blogLength col-12 col-md-3 text-center text-md-start">
                    <Select id="blogLengthMenu" value={length}
                        options={[
                            { value: '1', label: '1' },
                            { value: '2', label: '2' },
                            { value: '5', label: '5' },
                            { value: '10', label: '10' },
                            { value: '15', label: '15' },
                            { value: '20', label: '20' },
                        ]}
                        defaultIndex = '2'
                        onChange={e => {
                            setPage(Math.floor(length * page / Number(e.value)));
                            setLength(Number(e.value));
                        }}
                        className="blogLengthMenu"
                    />
                    <label htmlFor="blogLengthMenu" className="blogLengthLabel">{' '}entries per page</label>
                </div>
                <div className="blogSort col-12 col-md-9">
                    <div className="d-flex flex-column flex-md-row justify-content-md-end align-items-center gap-3">
                        <div className="text-center text-lg-end">
                            <label htmlFor="blogSortDirectionBtn" className="blogSortLabel">Sort Direction:{' '}</label>
                            <button
                                className="blogSortDirectionBtn "
                                onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
                            >
                                {order === 'desc' ? 'Descending ↓' : 'Ascending ↑'}
                            </button>
                        </div>
                        <div className="text-center text-lg-end">
                            <label htmlFor="blogSortMenu" className="blogSortLabel">Sort By:{' '}</label>
                            <Select
                                id="blogSortMenu"
                                options={[
                                    { value: 'updated', label: 'Last Updated' },
                                    { value: 'created', label: 'Creation Time' },
                                    { value: 'title', label: 'Title' },
                                    { value: 'pinned', label: 'Pinned' },
                                ]}
                                defaultIndex = '0'
                                onChange={e => {
                                    const value = e.value;
                                    setPosts(prev => {
                                        let sorted = [...prev];
                                        if (value === "updated") {
                                            sorted.sort((a, b) => b.updated.toDate() - a.updated.toDate());
                                        } else if (value === "created") {
                                            sorted.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());
                                        } else if (value === "title") {
                                            sorted.sort((a, b) => a.title.localeCompare(b.title));
                                        } else if (value === "pinned") {
                                            sorted.sort(cmp);
                                        }
                                        return sorted;
                                    });
                                    setPage(0);
                                }}
                                className="blogSortMenu"
                            />
                        </div>
                    </div>
                </div>
            </div>
            <AnimatePresence mode="wait">
                <motion.div key={getWindowKey(window)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="row">
                        {window.map(post => (
                            <div key={post.id} className="col-12 mb-3">
                                <BlogPost title={post.title} body={post.body} creationTime={post.timestamp} updateTime={post.updated} postId={post.id} reorderFunc={reorderFunc}/>
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
