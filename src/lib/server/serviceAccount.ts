// ============================================================================
// SERVICE ACCOUNT — REPLACE PLACEHOLDERS WITH YOUR REAL FIREBASE ADMIN KEY
// ============================================================================
// Get this from: Firebase Console → Project Settings → Service Accounts →
//   "Generate new private key" → copy the JSON values into the fields below.
//
// SECURITY:
//   - This file is imported ONLY from src/app/api/* route handlers (server-side)
//   - NEVER import this from a client component ("use client")
//   - Next.js will tree-shake it out of the client bundle as long as it is
//     only referenced inside route handlers (which run on the Node.js runtime)
// ============================================================================

export const serviceAccount = {
  type: "service_account",
  project_id: "naijalavish",
  private_key_id: "REPLACE_WITH_YOUR_PRIVATE_KEY_ID",
  private_key: "-----BEGIN PRIVATE KEY-----\nREPLACE_WITH_YOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-xxxxx@naijalavish.iam.gserviceaccount.com",
  client_id: "REPLACE_WITH_YOUR_CLIENT_ID",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40naijalavish.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
} as const;
