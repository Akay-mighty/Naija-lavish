// POST /api/chat
// Validates + writes a chat message to Firestore `chat/{id}`.
// Body: { text, placeId? }
// Rate limit: 1 message per 2s per uid (enforced server-side via player.cooldowns.chat)
// Word filter: English + pidgin insults, phone numbers, emails, links blocked.

import { adminDb } from "@/lib/server/admin";
import { requirePlayer, json, error, CHAT_RATE_LIMIT_MS, CHAT_MAX_LEN } from "@/lib/server/guards";
import { filterMessage } from "@/game/data/wordfilter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = await requirePlayer(req);
  if (!guard.ok) return guard.res;
  const { uid, player } = guard;

  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "").slice(0, CHAT_MAX_LEN + 50);
  const placeId = String(body.placeId || player.placeId || "city").slice(0, 32);

  const filter = filterMessage(text);
  if (!filter.ok) return error(filter.reason || "Message blocked.", 400);

  try {
    const result = await adminDb().runTransaction(async (tx) => {
      const ref = adminDb().doc(`players/${uid}`);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Player missing.");
      const p = snap.data() as typeof player;
      if (p.banned) throw new Error("Account banned.");

      const now = Date.now();
      const cd = (p.cooldowns as any)?.chat ?? 0;
      if (now < cd) {
        const wait = Math.ceil((cd - now) / 1000);
        throw new Error(`Wait ${wait}s before next message.`);
      }

      // Update cooldown
      tx.update(ref, {
        lastSeen: now,
        cooldowns: { ...(p.cooldowns as any || {}), chat: now + CHAT_RATE_LIMIT_MS },
      });

      // Write chat message
      const chatRef = adminDb().collection("chat").doc();
      tx.set(chatRef, {
        uid,
        name: p.name,
        lookId: p.lookId,
        text: filter.clean,
        placeId,
        t: now,
      });
      return { id: chatRef.id };
    });

    return json({ ok: true, id: result.id });
  } catch (e: any) {
    return error(e?.message || "Chat failed.", 400);
  }
}
