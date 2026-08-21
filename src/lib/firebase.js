import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDFdSoRbFb7R2ryKvBvHeM2iWxC3CSkLzU",
  authDomain: "floosy-42c3c.firebaseapp.com",
  projectId: "floosy-42c3c",
  storageBucket: "floosy-42c3c.firebasestorage.app",
  messagingSenderId: "99826754479",
  appId: "1:99826754479:web:0af8cb5e0ca16bb44a055a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
