// firebase-admin server-side init.
// Imported ONLY from src/app/api/* route handlers.
// NEVER import this from a client component.

import { getApps, initializeApp, cert, type App as AdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth, type Auth as AdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore, type Firestore as AdminFirestore } from "firebase-admin/firestore";
import { serviceAccount } from "./serviceAccount";

let adminApp: AdminApp;

function ensureApp(): AdminApp {
  if (adminApp) return adminApp;
  if (getApps().length) {
    adminApp = getApps()[0];
    return adminApp;
  }
  adminApp = initializeApp({
    credential: cert(serviceAccount as any),
    databaseURL: "https://naijalavish-default-rtdb.firebaseio.com",
  });
  return adminApp;
}

export function adminAuth(): AdminAuth {
  return getAdminAuth(ensureApp());
}

export function adminDb(): AdminFirestore {
  return getAdminFirestore(ensureApp());
}

// Singleton accessors (call inside route handlers, not at module top-level)
export const admin = {
  auth: adminAuth,
  db: adminDb,
};
