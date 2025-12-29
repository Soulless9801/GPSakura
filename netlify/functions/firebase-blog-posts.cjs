const dotenv = require('dotenv');

dotenv.config();

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

    let posts;

    try {

        const db = fireStore.getFirestore(firebaseApp);
    
        const q = fireStore.query(fireStore.collection(db, 'posts'));

        const snap = await fireStore.getDocs(q);
        posts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        posts = posts.map(post => {
            return {
                ...post,
                timestamp: post.timestamp.toDate().toISOString(),
                updated: post.updated.toDate().toISOString(),
            };
        });

        // console.log("Fetched blog posts from Firebase: ", posts.length);

    } catch (error) {
        // console.error("Firestore Error: ", error);
    }

    return {
        statusCode: 200,
        body: JSON.stringify(posts)
    }
};
