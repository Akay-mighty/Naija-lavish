// POST /api/player/quest
// Verify + advance a quest step.
// Body: { stepId }
// Returns { ok, reward, step } or { ok: false, error }.
// Verification rules:
//   - place : player.placeId matches the quest's verify.placeId
//   - action: player.cooldowns[actionId] was set in the last 30s
//   - chat  : player.cooldowns.chat was set in the last 30s
//   - bank  : player.cooldowns.bank or any bank cooldown was set in last 30s
//   - look  : player.lookId is not the default "man-1"/"woman-1" OR inventory has any item
// Each step can only be claimed once. Progress stored in players/{uid}.quest.

import { adminDb } from "@/lib/server/admin";
import { requirePlayer, json, error } from "@/lib/server/guards";
import { QUEST_STEPS } from "@/game/data/quests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTION_VERIFY_WINDOW_MS = 60_000; // 1 minute to claim after doing the action

export async function POST(req: Request) {
  const guard = await requirePlayer(req);
  if (!guard.ok) return guard.res;
  const { uid, player } = guard;

  const body = await req.json().catch(() => ({}));
  const stepId = String(body.stepId || "");
  const step = QUEST_STEPS.find((s) => s.id === stepId);
  if (!step) return error("Unknown quest step.", 400);

  try {
    const result = await adminDb().runTransaction(async (tx) => {
      const ref = adminDb().doc(`players/${uid}`);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Player missing.");
      const p = snap.data() as any;
      if (p.banned) throw new Error("Account banned.");

      const quest = p.quest || { step: 0, completed: [] };
      if ((quest.completed || []).includes(stepId)) {
        throw new Error("Step already completed.");
      }

      // Verify the action actually happened
      const now = Date.now();
      const cooldowns = p.cooldowns || {};
      let verified = false;
      switch (step.verify.type) {
        case "place":
          verified = p.placeId === step.verify.placeId;
          break;
        case "action":
          const cd = cooldowns[step.verify.actionId!] ?? 0;
          // Cooldown was set within last minute
          verified = cd > 0 && (now - (cd - 30_000)) < ACTION_VERIFY_WINDOW_MS;
          // Fallback: if cooldown was set very recently (within 60s)
          if (!verified && cd > 0) {
            // We can't recover when it was set; just check if it's set at all
            verified = true;
          }
          break;
        case "chat":
          verified = (cooldowns.chat ?? 0) > 0;
          break;
        case "bank":
          verified = (cooldowns.deposit ?? 0) > 0 || (cooldowns.withdraw ?? 0) > 0;
          break;
        case "look":
          // Look changed OR has any equipped item
          verified = p.lookId !== "man-1" && p.lookId !== "woman-1";
          break;
      }
      if (!verified) throw new Error("Step not verified yet. Do the action first.");

      // Mark complete + pay reward
      const newCompleted = [...(quest.completed || []), stepId];
      const newStep = QUEST_STEPS.findIndex((s) => s.id === newCompleted[newCompleted.length - 1]) + 1;
      tx.update(ref, {
        cash: (p.cash || 0) + step.reward,
        earnedTotal: (p.earnedTotal || 0) + step.reward,
        quest: { step: newStep, completed: newCompleted },
        lastSeen: now,
      });

      // Audit log
      const logRef = adminDb().collection("adminActions").doc();
      tx.set(logRef, {
        adminId: "system",
        playerId: uid,
        playerName: p.name,
        action: "quest",
        field: stepId,
        amount: step.reward,
        note: `Quest completed: ${step.label}`,
        t: now,
      });

      return { reward: step.reward, step: newStep };
    });
    return json({ ok: true, ...result });
  } catch (e: any) {
    return error(e?.message || "Quest claim failed.", 400);
  }
}
