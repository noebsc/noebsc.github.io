const firebaseConfig = {
    apiKey: "AIzaSyApPQ_SmqH-ZfGxRXO0k2j371FxfFN-QnA",
    authDomain: "noehub-2e774.firebaseapp.com",
    projectId: "noehub-2e774",
    storageBucket: "noehub-2e774.firebasestorage.app",
    messagingSenderId: "677903842246",
    appId: "1:677903842246:web:a30c11f9a19f95b02a50c7",
};

// Initialisation Firebase (ancienne syntaxe)
firebase.initializeApp(firebaseConfig);

// Auth et base Firestore
const auth = firebase.auth();
const db = firebase.firestore();
