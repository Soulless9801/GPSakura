import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import * as firebase from 'firebase/app';
import * as fireStore from 'firebase/firestore';
import { firebaseConfig } from './firebase-auth.js';

dotenv.config();

export const handler = async (event, context) => {
    const id = event.queryStringParameters.id;

    let firebaseApp;

    if (!firebase.getApps().length) firebaseApp = firebase.initializeApp(firebaseConfig);
    else firebaseApp = firebase.getApp();

    let data;   

    try {
        const db = fireStore.getFirestore(firebaseApp);

        const q = fireStore.query(
            fireStore.collection(db, 'problems'),
            fireStore.where(fireStore.documentId(), '==', id),
        );

        const snap = await fireStore.getDocs(q);

        if (snap.empty) throw new Error();

        data = snap.docs.map((doc) => ({
            ...doc.data(),
            created: doc.data().created.toDate().toISOString(),
            updated: doc.data().updated.toDate().toISOString(),
        }))[0];
    } catch (error) {
        const filePath = path.resolve('./netlify/functions/data/firebaseProblemData.json');
        const problems = fs.readFileSync(filePath, 'utf8');
        const allData = JSON.parse(problems);
        data = allData.find((problem) => problem.id === id);
    }

    return {
        statusCode: 200,
        body: JSON.stringify(data),
    };
};
