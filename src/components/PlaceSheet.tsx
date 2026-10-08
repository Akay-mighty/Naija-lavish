"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../store/useAuth";
import { usePlayer } from "../store/usePlayer";
import { PLACE_BY_ID, type PlaceAction } from "../data/places";
import { ITEMS, ITEM_BY_ID } from "../data/items";
import { naira } from "../lib/format";
import { toast } from "../store/useToasts";
import { sfx } from "../lib/sound";

interface PlaceSheetProps {
  open: boolean;
  onClose: () => void;
  onWalkHere?: () => void;
}

export default function PlaceSheet({ open, onClose, onWalkHere }: PlaceSheetProps) {
  const placeId = usePlayer((s) => s.placeId);
  const place = PLACE_BY_ID[placeId];
  const cash = usePlayer((s) => s.cash);
  const energy = usePlayer((s) => s.energy);
  const cooldowns = usePlayer((s) => s.cooldowns);
  const applyActionResult = usePlayer((s) => s.applyActionResult);
  const buyItem = usePlayer((s) => s.buyItem);
  const ownsItem = usePlayer((s) => s.ownsItem);
  const equipItem = usePlayer((s) => s.equipItem);
  const idToken = useAuth((s) => s.idToken);
  const [now, setNow] = useState(Date.now());
  const [showShop, setShowShop] = useState(false);
  const [busy, setBusy] = useState(false);

  // Tick cooldown clock every 500ms while open
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [open]);

  // Reset shop state when place changes
  useEffect(() => { setShowShop(false); }, [placeId]);

  // Ambient sound loops based on place category (before early return so hooks order is stable)
  const isHome = place?.category === "home";
  const isOwambe = place?.id === "transcorp" || place?.id === "magicland";
  useEffect(() => {
    if (isHome) sfx.startLoop("generator");
    if (isOwambe) sfx.startLoop("afrobeat");
    return () => {
      if (isHome) sfx.stopLoop("generator");
      if (isOwambe) sfx.stopLoop("afrobeat");
    };
  }, [isHome, isOwambe]);

  if (!place) return null;

  // ---- Call /api/action with the ID token ----
  async function callServer(
    action: string,
    actionId: string,
    amount?: number
  ): Promise<{ ok: boolean; result?: any; error?: string }> {
    if (!idToken) return { ok: false, error: "Not signed in." };
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ action, actionId, placeId, amount }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) return { ok: false, error: data.error || "Action failed." };
      return { ok: true, result: data.result };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Network error." };
    }
  }

  async function runAction(a: PlaceAction) {
    if (busy) return;
    setBusy(true);
    try {
      if (a.kind === "work") {
        const r = await callServer("work", a.id);
        if (!r.ok) {
          toast(r.error || "Couldn't work.", "warn", "⚠️");
          sfx.play("warn");
          return;
        }
        applyActionResult(r.result);
        toast(`+${naira(a.reward ?? 0)} earned!`, "success", "💰");
        sfx.play("cashEarn");
      } else if (a.kind === "buy") {
        if (a.id === "boutique") {
          setShowShop(true);
          sfx.play("click");
          return;
        }
        const r = await callServer("buy", a.id);
        if (!r.ok) {
          toast(r.error || "Couldn't buy.", "warn", "💸");
          sfx.play("warn");
          return;
        }
        applyActionResult(r.result);
        toast(a.id === "buy-food" ? "Belle don full! 🍽️" : "Paid. Enjoy! ✨", "success");
        sfx.play("cashSpend");
      } else if (a.kind === "spray") {
        const amount = Math.abs(a.reward ?? 0);
        const r = await callServer("spray", a.id, amount);
        if (!r.ok) {
          toast(r.error || "Couldn't spray.", "warn", "💸");
          sfx.play("warn");
          return;
        }
        applyActionResult(r.result);
        toast(`Sprayed ${naira(amount)} at the dance floor! 🎉`, "success", "💵");
        sfx.play("spray");
      } else if (a.kind === "rest") {
        const r = await callServer("rest", a.id);
        if (!r.ok) {
          toast(r.error || "Couldn't rest.", "warn", "💸");
          sfx.play("warn");
          return;
        }
        applyActionResult(r.result);
        toast(a.id === "sleep" ? "You slept well. Energy restored! 😴" : "Vibe restored! ✨", "success");
        sfx.play("rest");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-20"
            style={{ background: "rgba(15, 28, 22, 0.4)" }}
            onClick={onClose}
          />

          <motion.section
            className="sheet"
            role="dialog"
            aria-label={place.name}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            <header className="flex items-center justify-between px-5 pt-4 pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ background: place.color }}
                  />
                  <h2 className="text-lg font-bold">{place.name}</h2>
                </div>
                <div className="text-xs text-foreground/50 mt-0.5">
                  {place.area}, Abuja · {place.category}
                </div>
              </div>
              <button
                type="button"
                className="chip-btn"
                onClick={onClose}
                aria-label="Close"
              >
                ✕
              </button>
            </header>

            <div className="overflow-y-auto soft-scroll px-5 pb-6 pt-2">
              <p className="text-sm text-foreground/70 mb-4 leading-relaxed">
                {place.blurb}
              </p>

              {/* Walk here button (for map view) */}
              {onWalkHere && (
                <button
                  type="button"
                  className="big-btn plain mb-3"
                  onClick={() => {
                    onWalkHere();
                    onClose();
                  }}
                >
                  🚶 Walk here
                </button>
              )}

              {/* Shop (boutique) */}
              {showShop && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Wuse Boutique</h3>
                    <button
                      className="link-btn text-xs"
                      onClick={() => setShowShop(false)}
                    >
                      ← Back
                    </button>
                  </div>
                  <ul className="grid grid-cols-1 gap-2">
                    {ITEMS.filter((i) =>
                      ["head", "face", "neck", "wrist", "outfit", "footwear"].includes(i.category)
                    ).slice(0, 8).map((item) => {
                      const owned = ownsItem(item.id);
                      const canAfford = cash >= item.price;
                      return (
                        <li
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
                        >
                          <span className="text-2xl" aria-hidden="true">
                            {item.emoji}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{item.name}</div>
                            <div className="text-xs text-foreground/50 truncate">
                              {item.desc}
                            </div>
                            {item.vibeBoost && (
                              <div className="text-[10px] text-primary mt-0.5">
                                +{item.vibeBoost} vibe
                              </div>
                            )}
                          </div>
                          {owned ? (
                            <button
                              className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium"
                              onClick={() => {
                                usePlayer.getState().equipItem(item.id);
                                toast(`${item.name} equipped! ✨`, "success");
                              }}
                            >
                              Equip
                            </button>
                          ) : (
                            <button
                              className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                              style={{
                                background: canAfford
                                  ? "var(--primary)"
                                  : "var(--secondary)",
                                color: canAfford
                                  ? "var(--primary-foreground)"
                                  : "var(--ink-3)",
                              }}
                              disabled={!canAfford}
                              onClick={() => {
                                if (buyItem(item.id, item.price)) {
                                  toast(`Bought ${item.name}! ${item.emoji}`, "success");
                                } else {
                                  toast("Not enough cash.", "warn", "💸");
                                }
                              }}
                            >
                              {naira(item.price)}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Actions */}
              {!showShop && (
                <ul className="grid grid-cols-1 gap-2">
                  {place.actions.map((a) => {
                    const cdEnds = cooldowns[a.id] ?? 0;
                    const remaining = Math.max(0, cdEnds - now);
                    const cooling = remaining > 0;
                    const canAfford =
                      a.reward === undefined ||
                      a.reward >= 0 ||
                      cash >= Math.abs(a.reward);
                    const energyOk = (a.energyCost ?? 0) <= energy;
                    const disabled = cooling || !canAfford || !energyOk;
                    const reward = a.reward ?? 0;
                    const isCost = reward < 0;
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => runAction(a)}
                          disabled={disabled}
                          className="w-full flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:border-foreground/20 transition disabled:opacity-50 disabled:cursor-not-allowed text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{a.label}</span>
                              {a.kind === "work" && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                  HUSTLE
                                </span>
                              )}
                              {a.kind === "spray" && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-700 font-medium">
                                  SPRAY
                                </span>
                              )}
                              {a.kind === "rest" && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-400/15 text-purple-700 font-medium">
                                  REST
                                </span>
                              )}
                              {a.kind === "buy" && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground/70 font-medium">
                                  SHOP
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-foreground/60 mt-0.5 leading-snug">
                              {a.desc}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                              {reward !== 0 && (
                                <span
                                  className={
                                    isCost ? "text-destructive" : "text-primary font-semibold"
                                  }
                                >
                                  {isCost ? "−" : "+"}
                                  {naira(Math.abs(reward))}
                                </span>
                              )}
                              {(a.energyCost ?? 0) > 0 && (
                                <span className="text-foreground/50">⚡ -{a.energyCost}</span>
                              )}
                              {(a.hungerCost ?? 0) > 0 && (
                                <span className="text-foreground/50">🍽️ -{a.hungerCost}</span>
                              )}
                              {(a.vibeGain ?? 0) > 0 && (
                                <span className="text-purple-600/70">✨ +{a.vibeGain}</span>
                              )}
                              {cooling && (
                                <span className="text-amber-600">
                                  ⏳ {(remaining / 1000).toFixed(0)}s
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className="text-[10px] uppercase tracking-wide text-foreground/30 self-center"
                            aria-hidden="true"
                          >
                            ›
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Equip own items — at home wardrobe */}
              {isHome && !showShop && (
                <WardrobeSection />
              )}
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}

function WardrobeSection() {
  const inventory = usePlayer((s) => s.inventory);
  const equipItem = usePlayer((s) => s.equipItem);
  const unequipItem = usePlayer((s) => s.unequipItem);

  if (inventory.length === 0) {
    return (
      <div className="mt-5 p-4 rounded-xl bg-secondary text-sm text-foreground/60">
        <p className="font-medium text-foreground mb-1">Wardrobe empty</p>
        <p className="text-xs">
          Visit the Wuse Boutique at Garki Modern Market to buy shades, gele,
          chains, and outfits.
        </p>
      </div>
    );
  }

  // Group by category
  const byCat = inventory.reduce<Record<string, typeof inventory>>((acc, i) => {
    const item = ITEM_BY_ID[i.id];
    if (!item) return acc;
    (acc[item.category] ||= []).push(i);
    return acc;
  }, {});

  return (
    <div className="mt-5">
      <h3 className="font-semibold text-sm mb-2">Your things</h3>
      {Object.entries(byCat).map(([cat, items]) => (
        <div key={cat} className="mb-3">
          <div className="text-[10px] uppercase tracking-wide text-foreground/40 mb-1">
            {cat}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {items.map((inv) => {
              const item = ITEM_BY_ID[inv.id];
              if (!item) return null;
              return (
                <button
                  key={inv.id}
                  onClick={() =>
                    inv.equipped ? unequipItem(inv.id) : equipItem(inv.id)
                  }
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition ${
                    inv.equipped
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                  }`}
                  title={item.name}
                >
                  <span className="text-xl">{item.emoji}</span>
                  <span className="text-[9px] text-foreground/60 text-center truncate w-full">
                    {item.name.split(" ")[0]}
                  </span>
                  {inv.equipped && (
                    <span className="text-[9px] text-primary font-bold">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
