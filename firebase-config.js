import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyApPQ_SmqH-ZfGxRXO0k2j371FxfFN-QnA",
    authDomain: "noehub-2e774.firebaseapp.com",
    projectId: "noehub-2e774",
    storageBucket: "noehub-2e774.firebasestorage.app",
    messagingSenderId: "677903842246",
    appId: "1:677903842246:web:a30c11f9a19f95b02a50c7",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
