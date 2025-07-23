import { useEffect, useState, useCallback } from 'react';

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
        console.log("Reordering...");
        setPosts(prev => [...prev].sort(cmp));
    }, [cmp]);

    useEffect(() => {
        async function fetchPosts() {
            const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
            const snap = await getDocs(q);

            const len = snap.size;

            let posts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            //posts = [posts[len - 1], ...posts.slice(0, len - 1)];
            
            setPosts(posts);
            reorderPosts();
        }
        fetchPosts();
    }, []);

    return (
        <div className="blogAppContainer">
            {posts.map(post => (
                <BlogPost title={post.title} body={post.body} creationTime={post.timestamp} updateTime={post.updated} postId={post.id} reorderFunc={reorderPosts} key={post.id}/>
            ))}
        </div>
    );
}
