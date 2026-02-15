import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY || "AIzaSyDn7uT7cC1mUUDfAeokWR83ULxl4k7-6Ag",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "petpooja-12d9e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "petpooja-12d9e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "petpooja-12d9e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "927963719557",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:927963719557:web:88412cd7cf6ee630cec6ec",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-QC4RWJVG1Y",
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export { auth, firebaseApp, googleProvider };
