// GET /api/admin/players
// Returns the full player list (admin only). Real-time listener on client.

import { adminDb } from "@/lib/server/admin";
import { requireAdmin, json } from "@/lib/server/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) return guard.res;

    const snap = await adminDb()
      .collection("players")
      .orderBy("lastSeen", "desc")
      .limit(200)
      .get();

    const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return json({ ok: true, players });
  } catch (e: any) {
    console.error("[/api/admin/players] error:", e?.message);
    return json({ ok: false, error: e?.message || "Server error." }, 500);
  }
}
