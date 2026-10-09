// Firebase client init for NaijaLavish.
// Config is hardcoded per owner's request (no env vars on Vercel).
// Realtime Database URL is required for presence + positions (Phase 2).

import { getApps, initializeApp, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyADIDDptkJkgpOBEn4CfZIDajF1eBWlrXw",
  authDomain: "naijalavish.firebaseapp.com",
  databaseURL: "https://naijalavish-default-rtdb.firebaseio.com",
  projectId: "naijalavish",
  storageBucket: "naijalavish.firebasestorage.app",
  messagingSenderId: "925863756982",
  appId: "1:925863756982:web:5133ad376f2b2184efd217",
  measurementId: "G-RZCHK4HX52",
};

// HMR-safe init
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Auth. getAuth() already keeps the player signed in across reloads
// (IndexedDB, falling back to localStorage). Do NOT call setPersistence() here:
// switching storage right after startup can race with session restore and log players out.
export const auth = getAuth(app);

// Firestore (chat log, player profiles, admin docs, audit trail)
export const db = getFirestore(app);

// Realtime Database (presence + positions, low-latency multiplayer)
export const rtdb = getDatabase(app);

// Lazy analytics (browser-only, gracefully skips if blocked)
if (typeof window !== "undefined") {
  import("firebase/analytics")
    .then(({ getAnalytics, isSupported }) =>
      isSupported().then((ok) => {
        if (ok) {
          try { getAnalytics(app); } catch { /* blocked */ }
        }
      })
    )
    .catch(() => {});
}

export default app;
