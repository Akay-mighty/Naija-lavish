// GET /api/debug
// Returns admin status + service account info (no secrets).
// Used to diagnose 500 errors on Vercel.

import { adminStatus } from "@/lib/server/admin";
import { json } from "@/lib/server/guards";
import { serviceAccount } from "@/lib/server/serviceAccount";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return json({
    ok: true,
    admin: adminStatus(),
    serviceAccount: {
      project_id: serviceAccount.project_id,
      client_email: serviceAccount.client_email,
      private_key_id: serviceAccount.private_key_id,
      private_key_starts: serviceAccount.private_key.slice(0, 25),
      private_key_ends: serviceAccount.private_key.slice(-25),
      private_key_has_redacted: serviceAccount.private_key.includes("REDACTED"),
      private_key_length: serviceAccount.private_key.length,
    },
  });
}
