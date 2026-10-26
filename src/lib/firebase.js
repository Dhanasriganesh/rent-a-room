import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
/** Callable Cloud Functions (email SMTP lives here — never in the browser) */
export const functions = getFunctions(app, "us-central1");

/**
 * Secondary Auth app so staff can create a renter login without signing
 * themselves out of the primary session.
 */
export function getSecondaryAuth() {
  const existing = getApps().find((a) => a.name === "Secondary");
  const secondary = existing || initializeApp(firebaseConfig, "Secondary");
  return getAuth(secondary);
}

export default app;
