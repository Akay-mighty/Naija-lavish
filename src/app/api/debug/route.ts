// GET /api/debug
// Returns admin status + service account info (no secrets).
// Used to diagnose 500 errors on Vercel.

import { adminStatus } from "@/lib/server/admin";
import { json } from "@/lib/server/guards";
import { serviceAccount } from "@/lib/server/serviceAccount";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const pk = serviceAccount.private_key || "";
  return json({
    ok: true,
    admin: adminStatus(),
    serviceAccount: {
      project_id: serviceAccount.project_id,
      client_email: serviceAccount.client_email,
      private_key_id: serviceAccount.private_key_id,
      private_key_length: pk.length,
      private_key_starts_with_begin: pk.startsWith("-----BEGIN"),
      private_key_ends_with_end: pk.endsWith("-----END PRIVATE KEY-----\n"),
      private_key_has_redacted: pk.includes("REDACTED"),
      private_key_has_replace: pk.includes("REPLACE_WITH"),
      private_key_first_20: pk.slice(0, 20),
      private_key_last_20: pk.slice(-20),
    },
    timestamp: Date.now(),
  });
}
