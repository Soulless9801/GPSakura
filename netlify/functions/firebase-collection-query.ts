import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

import * as firebase from 'firebase/app';
import * as fireStore from 'firebase/firestore';
import type { HandlerEvent } from '@netlify/functions';

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

export async function handler(event: HandlerEvent) {

    let firebaseApp;

    if (!firebase.getApps().length) {firebaseApp = firebase.initializeApp(firebaseConfig);}
    else {firebaseApp = firebase.getApp();}

    const body = JSON.parse(event.body || '{}');

    const col : string = String(body.col || "").trim();
    const loc : string = String(body.loc || "").trim();
    const id : string = String(body.id || "").trim();

    let collection;

    try {

        const db = fireStore.getFirestore(firebaseApp);

        const q = fireStore.query(fireStore.collection(db, col));

        const snap = await fireStore.getDocs(q);

        if (snap.empty) {throw new Error();}

        collection = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        
        // FIXME: modify all firestore Timestamp objects to ISO string
        collection.map((doc: Record<string, string | number | boolean | null | fireStore.Timestamp>) => {
            Object.keys(doc).forEach((key) => {
                if (doc[key] instanceof fireStore.Timestamp){
                    doc[key] = doc[key].toDate().toISOString();
                }
            });
        });

    } catch {
        try {
            const filePath = path.resolve(`./netlify/functions/data/${loc}.json`);
            collection = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            // Timestamps should already be in ISO format
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return errorJSON(`firebase-collection-query: Error fetching collection from Firestore and local fallback: ${message}`, 500);
        }   
    }

    if (id) {return successJSON(collection.find((doc: { id?: string }) => doc.id === id) || null);}

    return successJSON(collection);
};