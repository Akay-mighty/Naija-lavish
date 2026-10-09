// POST /api/admin/player/[uid]
// Admin writes to a player doc (credit/debit cash, set needs, ban/unban, reset).
// Body: { action: "credit"|"debit"|"setNeed"|"ban"|"unban"|"reset", field?, amount? }
// Every action is logged to adminActions/{id} for the audit trail.

import { adminDb } from "@/lib/server/admin";
import { requireAdmin, json, error } from "@/lib/server/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { uid: string } }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const adminUid = guard.uid;
  const targetUid = params.uid;

  const body = await req.json().catch(() => ({}));
  const action: string = String(body.action || "");
  const field: string | undefined = body.field ? String(body.field) : undefined;
  const amount: number = Number(body.amount || 0);

  try {
    const result = await adminDb().runTransaction(async (tx) => {
      const ref = adminDb().doc(`players/${targetUid}`);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Player not found.");
      const p = snap.data() as any;
      const updates: Record<string, any> = { lastSeen: Date.now() };
      let note = "";

      switch (action) {
        case "credit":
          updates.cash = (p.cash || 0) + Math.max(0, amount);
          updates.earnedTotal = (p.earnedTotal || 0) + Math.max(0, amount);
          note = `Credited ₦${amount} to wallet`;
          break;
        case "debit":
          updates.cash = Math.max(0, (p.cash || 0) - Math.max(0, amount));
          updates.spentTotal = (p.spentTotal || 0) + Math.max(0, amount);
          note = `Debited ₦${amount} from wallet`;
          break;
        case "setNeed":
          if (!["hunger", "energy", "vibe"].includes(field || "")) {
            throw new Error("Invalid need field.");
          }
          updates[field!] = Math.max(0, Math.min(100, amount));
          note = `Set ${field} to ${amount}`;
          break;
        case "ban":
          updates.banned = true;
          note = "Banned player";
          break;
        case "unban":
          updates.banned = false;
          note = "Unbanned player";
          break;
        case "suspend":
          updates.banned = true;
          (updates as any).suspendedReason = field || "Suspended by admin";
          (updates as any).suspendedAt = Date.now();
          note = `Suspended: ${field || "no reason given"}`;
          break;
        case "warn":
          (updates as any).warnings = ((p as any).warnings || 0) + 1;
          note = `Warning: ${field || "no reason given"}`;
          break;
        case "clearWarnings":
          (updates as any).warnings = 0;
          note = "Warnings cleared";
          break;
        case "reset":
          updates.cash = 5000;
          updates.bank = 0;
          updates.hunger = 80;
          updates.energy = 80;
          updates.vibe = 70;
          updates.banned = false;
          note = "Reset to defaults";
          break;
        default:
          throw new Error(`Unknown admin action: ${action}`);
      }

      tx.update(ref, updates);

      // Audit log
      const logRef = adminDb().collection("adminActions").doc();
      tx.set(logRef, {
        adminId: adminUid,
        playerId: targetUid,
        playerName: p.name || "Unknown",
        action,
        field: field || null,
        amount: amount || null,
        note,
        t: Date.now(),
      });

      return { updates, note };
    });

    return json({ ok: true, result });
  } catch (e: any) {
    return error(e?.message || "Admin action failed.", 500);
  }
}
