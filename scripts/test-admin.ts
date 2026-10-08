// Quick test: verify the Firebase Admin service account works.
// Run: bun run scripts/test-admin.ts

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { serviceAccount } from "../src/lib/server/serviceAccount";

async function test() {
  console.log("=== NaijaLavish Admin Test ===");
  console.log("Project:", serviceAccount.project_id);
  console.log("Client email:", serviceAccount.client_email);
  console.log("Private key starts with:", serviceAccount.private_key.slice(0, 30));
  console.log("Private key ends with:", serviceAccount.private_key.slice(-30));

  try {
    const app = initializeApp({
      credential: cert(serviceAccount as any),
      databaseURL: "https://naijalavish-default-rtdb.firebaseio.com",
    });
    console.log("✅ Admin app initialized");

    const auth = getAuth(app);
    console.log("✅ Auth module loaded");

    const db = getFirestore(app);
    console.log("✅ Firestore module loaded");

    // Try a simple Firestore read (should work if Firestore is enabled)
    const snap = await db.collection("players").limit(1).get();
    console.log(`✅ Firestore read OK (${snap.size} player docs found)`);

    process.exit(0);
  } catch (e: any) {
    console.log("❌ Error:", e?.message || e);
    if (e?.code) console.log("  Code:", e.code);
    process.exit(1);
  }
}

test();
