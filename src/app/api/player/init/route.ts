// POST /api/player/init
// Creates players/{uid} once (starting cash, needs, etc. are set HERE, never by the client).
// Body: { name, username, lookId, gender, adult (bool) }
//
// IMPORTANT: this route ALWAYS answers with JSON. The Firebase Admin SDK is loaded
// inside the try/catch (dynamic import) so even "package failed to load" or
// "server key rejected" errors come back as readable messages instead of an HTML 500.

import { explain, reply, withTimeout } from "@/lib/server/explain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const STARTING_CASH = 5000;

export async function POST(req: Request) {
  let step = "start";
  try {
    // 1. Load the admin SDK (any load/key problem is caught below)
    step = "load-admin";
    const { adminAuth, adminDb } = await import("@/lib/server/admin");
    const auth = adminAuth(); // throws a clear message if the key is bad

    // 2. Who is calling?
    step = "check-token";
    const m = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
    if (!m) return reply({ ok: false, error: "Unauthorized. Please sign in again.", step }, 401);

    let uid: string;
    try {
      uid = (await withTimeout(auth.verifyIdToken(m[1]), 15000, "Token check")).uid;
    } catch (e: any) {
      // A bad/expired token is the caller's fault (401). Anything else is a server problem.
      if (typeof e?.code === "string" && e.code.startsWith("auth/")) {
        return reply({ ok: false, error: "Unauthorized. Please sign in again.", step }, 401);
      }
      throw e;
    }

    // 3. Validate the body
    step = "validate";
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim().slice(0, 16);
    const username = String(body.username || "").trim().toLowerCase().slice(0, 16);
    const lookId = String(body.lookId || "man-1").trim().slice(0, 24);
    const gender = body.gender === "woman" ? "woman" : "man";
    const adult = body.adult === true;

    if (name.length < 2) return reply({ ok: false, error: "Name too short.", step }, 400);
    if (!adult) return reply({ ok: false, error: "You must be 18+ to play.", step }, 403);
    if (username && !/^[a-z0-9_]+$/.test(username)) {
      return reply({ ok: false, error: "Username: letters, numbers, _ only.", step }, 400);
    }

    // 4. Create (or return) the profile
    step = "read-profile";
    const ref = adminDb().doc(`players/${uid}`);
    const existing = await withTimeout(ref.get(), 15000, "Reading your profile");
    if (existing.exists) {
      return reply({ ok: true, player: existing.data() });
    }

    step = "write-profile";
    const now = Date.now();
    const profile = {
      uid,
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
      placeId: "home",
      lookId,
      gender,
      banned: false,
      createdAt: now,
      lastSeen: now,
      quest: { step: 0, completed: [] as string[] },
    };
    await withTimeout(ref.set(profile), 15000, "Saving your profile");
    return reply({ ok: true, player: profile });
  } catch (e: any) {
    const x = explain(e);
    console.error(`[/api/player/init] failed at step "${step}":`, x.detail);
    return reply({ ok: false, error: x.error, hint: x.hint, detail: x.detail, step }, 500);
  }
}
