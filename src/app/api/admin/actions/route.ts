// GET /api/admin/actions
// Returns the recent admin audit log (admin only).

import { adminDb } from "@/lib/server/admin";
import { requireAdmin, json } from "@/lib/server/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const snap = await adminDb()
    .collection("adminActions")
    .orderBy("t", "desc")
    .limit(100)
    .get();

  const actions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return json({ ok: true, actions });
}
