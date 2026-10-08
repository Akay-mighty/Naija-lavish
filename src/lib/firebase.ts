// Firebase initialization for NaijaLavish
// Uses the user-provided Firebase config (project: naijalavish)
// Firestore is used for player data sync + admin actions.

import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyADIDDptkJkgpOBEn4CfZIDajF1eBWlrXw",
  authDomain: "naijalavish.firebaseapp.com",
  projectId: "naijalavish",
  storageBucket: "naijalavish.firebasestorage.app",
  messagingSenderId: "925863756982",
  appId: "1:925863756982:web:5133ad376f2b2184efd217",
  measurementId: "G-RZCHK4HX52",
};

// Initialize once (HMR-safe)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Firestore database (browser-safe; works on Vercel static/serverless)
export const db = getFirestore(app);

// Lazy-init Google Analytics (browser-only, gracefully skips if blocked)
if (typeof window !== "undefined") {
  import("firebase/analytics")
    .then(({ getAnalytics, isSupported }) =>
      isSupported().then((ok) => {
        if (ok) {
          try {
            getAnalytics(app);
          } catch {
            // Analytics blocked (ad blocker / privacy mode) — ignore
          }
        }
      })
    )
    .catch(() => {
      // Analytics module failed to load — ignore
    });
}

export default app;
