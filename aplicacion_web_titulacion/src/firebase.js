import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBI4-LGNFSoqqiO9wnc5I6I2yRWjCo2daU",
    authDomain: "proyecto-titulacion-9db38.firebaseapp.com",
    projectId: "proyecto-titulacion-9db38",
    storageBucket: "proyecto-titulacion-9db38.firebasestorage.app",
    messagingSenderId: "229137097981",
    appId: "1:229137097981:web:f520bff049e951dad7ca94"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);