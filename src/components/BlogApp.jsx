import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { getFirestore } from "firebase/firestore";
import { initializeApp } from 'firebase/app';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

import BlogPost from './BlogPost';

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
    const [length, setLength] = useState(5);

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
            const q = query(collection(db, 'posts'), orderBy('updated', 'desc'));
            const snap = await getDocs(q);

            const len = snap.size;

            let posts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            setPosts(posts);
        }
        fetchPosts();
    }, [cmp]);

    useEffect(() => {
        setWindow(posts.slice(page * length, (page + 1) * length));
    }, [posts, page, length]);

    useEffect(() => {
        const container = document.querySelector('.blogAppContainer');
        if (container) {
            container.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [page]);

    return (
        <div className="blogAppContainer">
            <div className="blogHeader">
                <div className="blogLength">
                    <select id="blogLengthMenu" value={length}
                        onChange={e => {
                            setPage(length * page / e.target.value);
                            setLength(Number(e.target.value));
                        }}
                        className="blogLengthMenu"
                    >
                        {[1, 2, 5, 10, 15, 20].map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                    <label htmlFor="blogLengthMenu" className="blogLengthLabel">entries per page</label>
                </div>
                <div className="blogSort">
                    <label htmlFor="blogSortMenu" className="blogSortLabel">Sort by:</label>
                    <select
                        id="blogSortMenu"
                        className="blogSortMenu"
                        onChange={e => {
                            const value = e.target.value;
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
                        defaultValue="updated"
                    >
                        <option value="updated">Last Updated</option>
                        <option value="created">Creation Time</option>
                        <option value="title">Title</option>
                        <option value="pinned">Pinned</option>
                    </select>
                </div>
            </div>
            <AnimatePresence mode="wait">
                {window.map(post => (
                    <motion.div key={post.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        <BlogPost title={post.title} body={post.body} creationTime={post.timestamp} updateTime={post.updated} postId={post.id} reorderFunc={reorderFunc}/>
                    </motion.div>
                ))}
            </AnimatePresence>
            <div className="blogPagination">
                <button onClick={() => setPage(prev => Math.max(0, prev - 1))} disabled={page <= 0} className={`blogPaginationButton${page <= 0 ? ' disabled' : ''}`}>
                    &#8592;
                </button>
                {Array.from({ length: Math.ceil(posts.length / length) }, (_, i) => (
                    <button key={i} onClick={() => setPage(i)} className={`blogPaginationButton${page === i ? ' active' : ''}`}>
                        {i + 1}
                    </button>
                ))}
                <button onClick={() => setPage(prev => Math.min(Math.ceil(posts.length / length) - 1, prev + 1))} className={`blogPaginationButton${page >= Math.ceil(posts.length / length) - 1 ? ' disabled' : ''}`}>
                    &#8594;
                </button>
            </div>
        </div>
    );
}
