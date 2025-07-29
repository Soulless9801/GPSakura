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
    const [length, setLength] = useState(4);

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

    const reorderPosts = useCallback(() => {
        setPosts(prev => [...prev].sort(cmp));
    }, [cmp]);

    useEffect(() => {
        async function fetchPosts() {
            const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
            const snap = await getDocs(q);

            const len = snap.size;

            let posts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            posts = posts.sort(cmp);
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
            <AnimatePresence mode="wait">
                {window.map(post => (
                    <motion.div key={post.id} layout initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30, scale: 0.95 }} transition={{ duration: 0.3 }}>
                        <BlogPost title={post.title} body={post.body} creationTime={post.timestamp} updateTime={post.updated} postId={post.id} reorderFunc={reorderPosts} />
                    </motion.div>
                ))}
            </AnimatePresence>
            <div className="pagination" layout>
                <button onClick={() => setPage(prev => Math.max(0, prev - 1))} disabled={page <= 0} className={`paginationButton${page <= 0 ? ' disabled' : ''}`}>
                    &#8592;
                </button>
                {Array.from({ length: Math.ceil(posts.length / length) }, (_, i) => (
                    <button key={i} onClick={() => setPage(i)} className={`paginationButton${page === i ? ' active' : ''}`}>
                        {i + 1}
                    </button>
                ))}
                <button onClick={() => setPage(prev => Math.min(Math.ceil(posts.length / length) - 1, prev + 1))} className={`paginationButton${page >= Math.ceil(posts.length / length) - 1 ? ' disabled' : ''}`}>
                    &#8594;
                </button>
            </div>
        </div>
    );
}
