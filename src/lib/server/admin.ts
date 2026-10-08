// firebase-admin server-side init.
// Imported ONLY from src/app/api/* route handlers.
// NEVER import this from a client component.
//
// This module detects when the service account is still the placeholder
// and throws a clear, JSON-friendly error instead of crashing the route.

import { getApps, initializeApp, cert, type App as AdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth, type Auth as AdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore, type Firestore as AdminFirestore } from "firebase-admin/firestore";
import { serviceAccount } from "./serviceAccount";

let adminApp: AdminApp | null = null;
let initError: string | null = null;

/** Check if the service account is still the placeholder. */
function isPlaceholder(): boolean {
  return (
    !serviceAccount.private_key ||
    serviceAccount.private_key.includes("REPLACE_WITH") ||
    !serviceAccount.project_id ||
    serviceAccount.project_id === "REPLACE_WITH_YOUR_PROJECT_ID" ||
    serviceAccount.private_key_id === "REPLACE_WITH_YOUR_PRIVATE_KEY_ID"
  );
}

function ensureApp(): AdminApp {
  if (adminApp) return adminApp;
  if (initError) throw new Error(initError);

  if (isPlaceholder()) {
    initError =
      "Firebase Admin service account not configured. Open src/lib/server/serviceAccount.ts and replace the REPLACE_WITH_* placeholder fields with your real Firebase Admin key from Firebase Console → Project Settings → Service Accounts → Generate new private key.";
    throw new Error(initError);
  }

  try {
    if (getApps().length) {
      adminApp = getApps()[0];
      return adminApp;
    }
    adminApp = initializeApp({
      credential: cert(serviceAccount as any),
      databaseURL: "https://naijalavish-default-rtdb.firebaseio.com",
    });
    return adminApp;
  } catch (e: any) {
    initError = `Firebase Admin init failed: ${e?.message || String(e)}`;
    throw new Error(initError);
  }
}

export function adminAuth(): AdminAuth {
  return getAdminAuth(ensureApp());
}

export function adminDb(): AdminFirestore {
  return getAdminFirestore(ensureApp());
}

/** Check if admin is ready (without throwing). Used by health checks. */
export function adminStatus(): { ok: boolean; error?: string } {
  try {
    ensureApp();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Unknown error" };
  }
}

export const admin = {
  auth: adminAuth,
  db: adminDb,
  status: adminStatus,
};
