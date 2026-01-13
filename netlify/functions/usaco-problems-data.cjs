const dotenv = require('dotenv');

dotenv.config();

const fs = require('fs');
const path = require('path');

const firebase = require('firebase/app');
const fireStore = require('firebase/firestore');

const { 
    FIREBASE_API_KEY, 
    FIREBASE_AUTH_DOMAIN, 
    FIREBASE_PROJECT_ID, 
    FIREBASE_STORAGE_BUCKET, 
    FIREBASE_MESSAGING_SENDER_ID, 
    FIREBASE_APP_ID, 
    FIREBASE_MEASUREMENT_ID 
} = process.env;

const firebaseConfig = {
    apiKey: FIREBASE_API_KEY, 
    autoDomain: FIREBASE_AUTH_DOMAIN, 
    projectId: FIREBASE_PROJECT_ID, 
    storageBucket: FIREBASE_STORAGE_BUCKET, 
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID, 
    appId: FIREBASE_APP_ID, 
    measurementId: FIREBASE_MEASUREMENT_ID
};

exports.handler = async (event, context) => {

    let firebaseApp;

    if (!firebase.getApps().length) firebaseApp = firebase.initializeApp(firebaseConfig);
    else firebaseApp = firebase.getApp();

    let problems;

    try {

        const db = fireStore.getFirestore(firebaseApp);
    
        const q = fireStore.query(fireStore.collection(db, 'usaco'));

        const snap = await fireStore.getDocs(q);

        if (snap.empty) throw new Error();

        problems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        problems = JSON.stringify(problems);

    } catch (error) {
        console.log(`Error: ${error.message}`);
        const filePath = path.resolve('./netlify/functions/data/firebaseUSACOProblems.json');
        problems = fs.readFileSync(filePath, 'utf8');
    }

    return {
        statusCode: 200,
        body: problems
    }
};
