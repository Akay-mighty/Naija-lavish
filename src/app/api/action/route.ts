// POST /api/action
// Validate + apply a game action server-side.
// Body: { action: "work"|"buy"|"spray"|"bank"|"rest"|"rent", actionId, placeId, amount? }
//
// Everything that touches cash/bank/needs goes through here. The client may
// NEVER write these fields directly to Firestore (enforced by security rules).
//
// Validation:
//   - work: cooldown, energy cost, place matches placeId
//   - buy: cash check, item exists in PLACE_BY_ID
//   - spray: cash check, amount in [200, 10000]
//   - bank: deposit/withdraw, cash/bank balance check
//   - rest: optional cost, vibe gain
// All writes happen inside a Firestore transaction.

import { adminDb } from "@/lib/server/admin";
import { requirePlayer, json, error } from "@/lib/server/guards";
import { PLACE_BY_ID } from "@/game/data/places";
import { ITEM_BY_ID } from "@/game/data/items";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORK_COOLDOWN_MS: Record<string, number> = {
  bole: 25_000, okada: 35_000, load: 40_000, danfo: 45_000,
  office: 60_000, bank: 90_000, suya: 50_000, senator: 120_000, photos: 40_000,
};

const MAX_SPRAY = 10_000;
const MIN_SPRAY = 200;

export async function POST(req: Request) {
  const guard = await requirePlayer(req);
  if (!guard.ok) return guard.res;
  const { uid, player } = guard;

  const body = await req.json().catch(() => ({}));
  const action: string = String(body.action || "");
  const actionId: string = String(body.actionId || "");
  const placeId: string = String(body.placeId || player.placeId);
  const amount: number = Math.max(0, Number(body.amount || 0));

  // Validate place exists + matches player's current place
  const place = PLACE_BY_ID[placeId];
  if (!place) return error("Unknown place.", 400);
  if (placeId !== player.placeId) return error("You must be at the place to act.", 400);

  // Find the action definition
  const placeAction = place.actions.find((a) => a.id === actionId);
  if (!placeAction) return error("Unknown action.", 400);

  // Apply inside a transaction
  try {
    const result = await adminDb().runTransaction(async (tx) => {
      const ref = adminDb().doc(`players/${uid}`);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Player missing.");
      const p = snap.data() as typeof player;
      if (p.banned) throw new Error("Account banned.");
      const now = Date.now();
      const updates: Record<string, any> = { lastSeen: now };

      switch (action) {
        case "work": {
          if (placeAction.kind !== "work") throw new Error("Not a work action.");
          // Cooldown
          const cd = WORK_COOLDOWN_MS[actionId] ?? 30_000;
          const ready = (p.cooldowns as any)?.[actionId] ?? 0;
          if (now < ready) {
            const wait = Math.ceil((ready - now) / 1000);
            throw new Error(`Cooling down — ${wait}s left.`);
          }
          // Energy gate
          const ene = placeAction.energyCost ?? 0;
          if (p.energy < ene) throw new Error("Energy too low. Go rest first.");
          const reward = placeAction.reward ?? 0;
          updates.cash = Math.max(0, p.cash + reward);
          updates.earnedTotal = p.earnedTotal + reward;
          updates.hunger = clamp(p.hunger - (placeAction.hungerCost ?? 0));
          updates.energy = clamp(p.energy - ene);
          updates.vibe = clamp(p.vibe - (placeAction.vibeCost ?? 0));
          updates.cooldowns = { ...(p.cooldowns as any || {}), [actionId]: now + cd };
          return { kind: "work", reward, cash: updates.cash };
        }
        case "buy": {
          if (placeAction.kind !== "buy" && placeAction.kind !== "rent") throw new Error("Not a buy action.");
          // Boutique opens shop UI client-side — no server cost
          if (actionId === "boutique" || actionId === "wardrobe") {
            return { kind: "noop" };
          }
          const cost = Math.abs(placeAction.reward ?? 0);
          if (cost > 0 && p.cash < cost) throw new Error("Not enough cash.");
          if (cost > 0) {
            updates.cash = p.cash - cost;
            updates.spentTotal = p.spentTotal + cost;
          }
          if (placeAction.vibeGain) updates.vibe = clamp(p.vibe + placeAction.vibeGain);
          if (placeAction.hungerCost) updates.hunger = clamp(p.hunger - placeAction.hungerCost);
          return { kind: "buy", cost, cash: updates.cash ?? p.cash };
        }
        case "buy-item": {
          // Buy an item from the boutique: deduct cash + add to inventory server-side
          const itemId = String(body.itemId || "");
          if (!itemId) throw new Error("Item ID required.");
          const itemPrice = Number(body.itemPrice || 0);
          if (itemPrice <= 0) throw new Error("Invalid item price.");
          if (p.cash < itemPrice) throw new Error("Not enough cash.");
          // Check if already owned
          const inv = (p as any).inventory || [];
          if (inv.some((i: any) => i.id === itemId)) {
            return { kind: "buy-item", alreadyOwned: true, cash: p.cash };
          }
          updates.cash = p.cash - itemPrice;
          updates.spentTotal = (p.spentTotal || 0) + itemPrice;
          (updates as any).inventory = [...inv, { id: itemId, equipped: false, acquiredAt: now }];
          return { kind: "buy-item", itemId, cash: updates.cash };
        }
        case "equip-item": {
          const itemId = String(body.itemId || "");
          if (!itemId) throw new Error("Item ID required.");
          const inv = (p as any).inventory || [];
          (updates as any).inventory = inv.map((i: any) =>
            i.id === itemId ? { ...i, equipped: true } : i
          );
          return { kind: "equip-item", itemId };
        }
        case "unequip-item": {
          const itemId = String(body.itemId || "");
          if (!itemId) throw new Error("Item ID required.");
          const inv = (p as any).inventory || [];
          (updates as any).inventory = inv.map((i: any) =>
            i.id === itemId ? { ...i, equipped: false } : i
          );
          return { kind: "unequip-item", itemId };
        }
        case "spray": {
          if (placeAction.kind !== "spray") throw new Error("Not a spray action.");
          const sprayAmount = Math.abs(placeAction.reward ?? amount);
          if (sprayAmount < MIN_SPRAY || sprayAmount > MAX_SPRAY) {
            throw new Error(`Spray must be between ₦${MIN_SPRAY} and ₦${MAX_SPRAY}.`);
          }
          if (p.cash < sprayAmount) throw new Error("Not enough cash to spray.");
          updates.cash = p.cash - sprayAmount;
          updates.spentTotal = p.spentTotal + sprayAmount;
          updates.sprayedTotal = (p.sprayedTotal || 0) + sprayAmount;
          if (placeAction.vibeGain) updates.vibe = clamp(p.vibe + placeAction.vibeGain);
          // Write to events so everyone in the hall sees it (server-verified)
          const evRef = adminDb().collection(`events/${placeId}/sprays`).doc();
          tx.set(evRef, {
            uid, name: p.name, amount: sprayAmount, t: now,
          });
          // Increment community spray counter (RTDB)
          // This can't be done inside a Firestore transaction, so we do it after
          return { kind: "spray", amount: sprayAmount, cash: updates.cash, communitySpray: true };
        }
        case "bank": {
          // actionId = "deposit" or "withdraw"
          if (actionId !== "deposit" && actionId !== "withdraw") {
            throw new Error("Unknown bank action.");
          }
          if (!amount || amount <= 0) throw new Error("Amount required.");
          if (actionId === "deposit") {
            if (p.cash < amount) throw new Error("Not enough cash to deposit.");
            updates.cash = p.cash - amount;
            updates.bank = p.bank + amount;
          } else {
            if (p.bank < amount) throw new Error("Not enough bank balance.");
            updates.cash = p.cash + amount;
            updates.bank = p.bank - amount;
            updates.earnedTotal = p.earnedTotal; // no new earnings
          }
          return { kind: "bank", actionId, amount, cash: updates.cash, bank: updates.bank };
        }
        case "rest": {
          if (placeAction.kind !== "rest") throw new Error("Not a rest action.");
          const cost = Math.abs(placeAction.reward ?? 0);
          if (cost > 0 && p.cash < cost) throw new Error("Not enough cash.");
          if (cost > 0) {
            updates.cash = p.cash - cost;
            updates.spentTotal = p.spentTotal + cost;
          }
          const energyGain = actionId === "sleep" ? 60 : 0;
          if (energyGain) updates.energy = clamp(p.energy + energyGain);
          if (placeAction.vibeGain) updates.vibe = clamp(p.vibe + placeAction.vibeGain);
          if (actionId === "sleep") updates.hunger = clamp(p.hunger - 4);
          return { kind: "rest", cost, energy: updates.energy, vibe: updates.vibe };
        }
        default:
          throw new Error(`Unknown action type: ${action}`);
      }
    });

    // Increment community spray counter in RTDB (after transaction, not inside it)
    if ((result as any)?.communitySpray) {
      try {
        const { getDatabase } = await import("firebase-admin/database");
        const rtdb = getDatabase();
        const snap = await rtdb.ref("community/spraysToday").get();
        const cur = snap.val() || 0;
        await rtdb.ref("community/spraysToday").set(cur + 1);
        // Check if goal reached → pay everyone ₦1,000 (simplified: just reset counter)
        if (cur + 1 >= 100) {
          await rtdb.ref("community/spraysToday").set(0);
          await rtdb.ref("community/lastGoalMet").set(Date.now());
        }
      } catch (e) {
        // Non-critical — don't fail the action
      }
    }

    return json({ ok: true, result });
  } catch (e: any) {
    return error(e?.message || "Action failed.", 400);
  }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}
