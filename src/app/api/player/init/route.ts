// POST /api/player/init
// Creates players/{uid} once. Called after anonymous sign-in.
// Body: { name, username, lookId, gender, adult (bool) }
// Returns the player profile.
//
// Rules: the CLIENT may never write cash/bank/banned/adult. We set them here.

import { adminDb } from "@/lib/server/admin";
import { requireToken, json, error, STARTING_CASH, type PlayerProfile } from "@/lib/server/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const token = await requireToken(req);
    if (!token.ok) return token.res;

    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim().slice(0, 16);
    const username = String(body.username || "").trim().toLowerCase().slice(0, 16);
    const lookId = String(body.lookId || "man-1").trim();
    const gender = body.gender === "woman" ? "woman" : "man";
    const adult = Boolean(body.adult);

    if (!name || name.length < 2) return error("Name too short.", 400);
    if (!adult) return error("You must be 18+ to play.", 403);
    if (username && !/^[a-z0-9_]+$/.test(username)) return error("Username: letters, numbers, _ only.", 400);

    const ref = adminDb().doc(`players/${token.uid}`);
    const existing = await ref.get();
    if (existing.exists) {
      return json({ ok: true, player: existing.data() });
    }

    const now = Date.now();
    const profile: PlayerProfile = {
      uid: token.uid,
      name,
      username,
      isGuest: !username,
      adult,
      cash: STARTING_CASH,
      bank: 0,
      earnedTotal: 0,
      spentTotal: 0,
      sprayedTotal: 0,
      hunger: 80,
      energy: 80,
      vibe: 70,
      placeId: "unity",
      lookId,
      gender,
      banned: false,
      createdAt: now,
      lastSeen: now,
      quest: { step: 0, completed: [] },
    };
    await ref.set(profile);
    return json({ ok: true, player: profile });
  } catch (e: any) {
    console.error("[/api/player/init] error:", e?.message);
    return error(e?.message || "Server error.", 500);
  }
}
