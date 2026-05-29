import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import * as firebase from 'firebase/app';
import * as fireStore from 'firebase/firestore';
import { firebaseConfig } from './firebase-auth.js';

dotenv.config();

export const handler = async (event, context) => {
    let firebaseApp;

    if (!firebase.getApps().length) firebaseApp = firebase.initializeApp(firebaseConfig);
    else firebaseApp = firebase.getApp();

    let posts;

    try {
        const db = fireStore.getFirestore(firebaseApp);

        const q = fireStore.query(fireStore.collection(db, 'posts'));

        const snap = await fireStore.getDocs(q);

        if (snap.empty) throw new Error();

        posts = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        posts = posts.map((post) => {
            return {
                ...post,
                created: post.created.toDate().toISOString(),
                updated: post.updated.toDate().toISOString(),
            };
        });

        posts = JSON.stringify(posts);
    } catch (error) {
        const filePath = path.resolve('./netlify/functions/data/firebaseBlogPosts.json');
        posts = fs.readFileSync(filePath, 'utf8');
    }

    return {
        statusCode: 200,
        body: posts,
    };
};
