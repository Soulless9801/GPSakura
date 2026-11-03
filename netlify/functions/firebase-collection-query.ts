import dotenv from 'dotenv';

dotenv.config();

import fs from 'node:fs';
import path from 'node:path';

import * as firebase from 'firebase/app';
import * as fireStore from 'firebase/firestore';

import { errorJSON, successJSON } from './data/json.ts';

export const firebaseConfig = {
    get apiKey() { return process.env.FIREBASE_API_KEY; },
    get authDomain() { return process.env.FIREBASE_AUTH_DOMAIN; },
    get databaseURL() { return process.env.FIREBASE_DATABASE_URL; },
    get projectId() { return process.env.FIREBASE_PROJECT_ID; },
    get storageBucket() { return process.env.FIREBASE_STORAGE_BUCKET; },
    get messagingSenderId() { return process.env.FIREBASE_MESSAGING_SENDER_ID; },
    get appId() { return process.env.FIREBASE_APP_ID; },
    get measurementId() { return process.env.FIREBASE_MEASUREMENT_ID; },
};

export default async function handler(request: Request): Promise<Response> {

    let body;
    try {
        body = JSON.parse((await request.text()) || '{}');
        if (body === null || typeof body !== "object" || Array.isArray(body)) {return errorJSON("Invalid request body", 400);}
    } catch {
        return errorJSON("Invalid JSON", 400);
    }

    let firebaseApp;

    if (!firebase.getApps().length) {
        const cfg = {
            apiKey: firebaseConfig.apiKey,
            authDomain: firebaseConfig.authDomain,
            databaseURL: firebaseConfig.databaseURL,
            projectId: firebaseConfig.projectId,
            storageBucket: firebaseConfig.storageBucket,
            messagingSenderId: firebaseConfig.messagingSenderId,
            appId: firebaseConfig.appId,
            measurementId: firebaseConfig.measurementId,
        };
        firebaseApp = firebase.initializeApp(cfg);
    }
    else {
        firebaseApp = firebase.getApp();
    }

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
        
        collection.map((doc: Record<string, string | number | boolean | null | fireStore.Timestamp>) => {
            Object.keys(doc).forEach((key) => {
                if (doc[key] instanceof fireStore.Timestamp){
                    doc[key] = doc[key].toDate().toISOString();
                }
            });
        });

    } catch {
        // `loc` names a file in the data directory. Allow only a bare name so it cannot
        // contain a separator or `..` and walk out of that directory.
        if (!/^[A-Za-z0-9_-]+$/.test(loc)) {return errorJSON("firebase-collection-query: Invalid loc", 400);}

        try {
            const filePath = path.join(path.resolve('./netlify/functions/data'), `${loc}.json`);
            collection = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            // Timestamps should already be in ISO format
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return errorJSON(`firebase-collection-query: Error fetching collection from Firestore and local fallback: ${message}`, 500);
        }   
    }

    if (id) {return successJSON(collection.find((doc: { id?: string }) => doc.id === id) || null);}

    return successJSON(collection);
}
