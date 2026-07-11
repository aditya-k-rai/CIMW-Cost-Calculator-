import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDVMedMHZP_eAFTqFmuzRdgsglcwd_Dg_E",
  authDomain: "cimw-cost-calculator.firebaseapp.com",
  projectId: "cimw-cost-calculator",
  storageBucket: "cimw-cost-calculator.firebasestorage.app",
  messagingSenderId: "244319130838",
  appId: "1:244319130838:web:8280f23d0f6465799f2577",
  measurementId: "G-W9JR0VC6DB"
};

// Prevent duplicate initialization in hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, db, analytics };
