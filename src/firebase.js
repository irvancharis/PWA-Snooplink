import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDZ5wObxoSsBKWn1rhwrSq13QWOB3eQcPc",
  authDomain: "snooplink-pro.firebaseapp.com",
  projectId: "snooplink-pro",
  storageBucket: "snooplink-pro.firebasestorage.app",
  messagingSenderId: "687270813688",
  appId: "1:687270813688:web:008fae6cb041ab0340400d",
  measurementId: "G-TXX2ZN8S9L"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;