// POST /api/daily
// Once per Africa/Lagos day, 7-day streak:
//   Day 1: ₦1,000 / 2: 1,500 / 3: 2,000 / 4: 3,000 / 5: 4,000 / 6: 5,000 / 7: 10,000
// Streak resets if a day is missed.
// Returns { ok, reward, streak, claimedAt }

import { adminDb } from "@/lib/server/admin";
import { requirePlayer, json, error } from "@/lib/server/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REWARDS = [1000, 1500, 2000, 3000, 4000, 5000, 10000];

function lagosDate(d: Date): string {
  // Africa/Lagos is UTC+1
  const lagos = new Date(d.getTime() + 60 * 60 * 1000);
  return lagos.toISOString().slice(0, 10);
}

function lagosYesterday(d: Date): string {
  const lagos = new Date(d.getTime() + 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
  return lagos.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  const guard = await requirePlayer(req);
  if (!guard.ok) return guard.res;
  const { uid, player } = guard;

  const today = lagosDate(new Date());
  const lastClaim = (player as any).dailyLastClaim as string | undefined;
  const currentStreak = (player as any).dailyStreak as number || 0;

  if (lastClaim === today) {
    return error("Already claimed today. Come back tomorrow.", 409);
  }

  let newStreak: number;
  if (lastClaim === lagosYesterday(new Date())) {
    newStreak = Math.min(7, currentStreak + 1);
  } else {
    newStreak = 1; // reset
  }
  const reward = REWARDS[newStreak - 1];

  try {
    await adminDb().doc(`players/${uid}`).update({
      cash: player.cash + reward,
      earnedTotal: player.earnedTotal + reward,
      dailyStreak: newStreak,
      dailyLastClaim: today,
      lastSeen: Date.now(),
    });
    return json({ ok: true, reward, streak: newStreak, claimedAt: today });
  } catch (e: any) {
    return error(e?.message || "Daily claim failed.", 500);
  }
}
