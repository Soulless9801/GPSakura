import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

import * as firebase from 'firebase/app';
import * as fireStore from 'firebase/firestore';

import { errorJSON, successJSON } from './data/json.ts';

const {
    FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_DATABASE_URL,
    FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID,
    FIREBASE_MEASUREMENT_ID,
} = process.env;

export const firebaseConfig = {
    apiKey: FIREBASE_API_KEY,
    authDomain: FIREBASE_AUTH_DOMAIN,
    databaseURL: FIREBASE_DATABASE_URL,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: FIREBASE_STORAGE_BUCKET,
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
    appId: FIREBASE_APP_ID,
    measurementId: FIREBASE_MEASUREMENT_ID,
};


dotenv.config();

export async function handler(event: any) {

    let firebaseApp;

    if (!firebase.getApps().length) firebaseApp = firebase.initializeApp(firebaseConfig);
    else firebaseApp = firebase.getApp();

    const body = JSON.parse(event.body || '{}');

    const col : string = String(body.col || "").trim();
    const loc : string = String(body.loc || "").trim();
    const id : string = String(body.id || "").trim();

    console.log(`firebase-collection-query: Received query for collection: ${col} with document id: ${id} with local fallback: ${loc}.json`);

    let collection;

    try {

        const db = fireStore.getFirestore(firebaseApp);

        const q = fireStore.query(fireStore.collection(db, col));

        const snap = await fireStore.getDocs(q);

        if (snap.empty) throw new Error();

        collection = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        
        // FIXME: modify all firestore Timestamp objects to ISO string
        collection.map((doc: any) => {
            Object.keys(doc).forEach((key) => {
                if (doc[key] instanceof fireStore.Timestamp){
                    doc[key] = doc[key].toDate().toISOString();
                }
            });
        });

    } catch (error) {
        console.log(`firebase-collection-query: Error fetching collection from Firestore, falling back to local file ${loc}.json`, error);
        try {
            const filePath = path.resolve(`./netlify/functions/data/${loc}.json`);
            collection = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            // Timestamps should already be in ISO format
        } catch (error) {
            return errorJSON("Error fetching collection from Firestore and local fallback", 500);
        }   
    }

    if (id) return successJSON(collection.find((doc: any) => doc.id === id) || null);

    return successJSON(collection);
};