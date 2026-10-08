"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "../store/usePlayer";
import { NPCS, RICH_LIST } from "../data/npcs";
import { PLACE_BY_ID } from "../data/places";
import { naira, shortNaira } from "../lib/format";
import { toast } from "../store/useToasts";
import { useState, useEffect } from "react";
import { listenToPresence, type PresenceDoc } from "@/lib/firestore";

interface PeopleSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function PeopleSheet({ open, onClose }: PeopleSheetProps) {
  const cash = usePlayer((s) => s.cash);
  const name = usePlayer((s) => s.name);
  const playerId = usePlayer((s) => s.playerId);
  const spray = usePlayer((s) => s.spray);
  const placeId = usePlayer((s) => s.placeId);
  const place = PLACE_BY_ID[placeId];
  const [selectedNPC, setSelectedNPC] = useState<string | null>(null);
  const [showRichList, setShowRichList] = useState(false);

  // Real-time presence (who's online + where they are)
  const [onlinePlayers, setOnlinePlayers] = useState<PresenceDoc[]>([]);
  useEffect(() => {
    const unsub = listenToPresence((p) => setOnlinePlayers(p));
    return () => unsub();
  }, []);

  // Filter out ourselves from the online players list
  const otherPlayers = onlinePlayers.filter((p) => p.playerId !== playerId);
  const playersHere = otherPlayers.filter((p) => p.placeId === placeId);

  // Mock "people here" NPCs (kept for fallback when no real players)
  const peopleHere = NPCS.slice(0, 5);

  return (
    <AnimatePresence>
      {open && (
        <>
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
            aria-label="People here"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            <header className="flex items-center justify-between px-5 pt-4 pb-2">
              <div>
                <h2 className="text-lg font-bold">People here</h2>
                <p className="text-xs text-foreground/50">
                  {place?.name ?? "Abuja"} · {playersHere.length + 1} real · {peopleHere.length} NPCs
                </p>
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
              {/* You */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 mb-3 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                  {name.slice(0, 1).toUpperCase() || "Y"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {name || "You"}{" "}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground ml-1">
                      YOU
                    </span>
                  </div>
                  <div className="text-[11px] text-foreground/50">
                    {naira(cash)} in wallet
                  </div>
                </div>
              </div>

              {/* Real online players here */}
              {playersHere.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] uppercase tracking-wide text-foreground/40 mb-1.5 flex items-center gap-1.5">
                    <span className="dot" style={{ width: 6, height: 6 }} />
                    Real players here · {playersHere.length}
                  </div>
                  <ul className="grid grid-cols-1 gap-1.5">
                    {playersHere.map((p) => (
                      <li
                        key={p.playerId}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50"
                      >
                        <span className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                          {(p.playerName || "?").slice(0, 1).toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">
                            {p.playerName || "Unknown"}
                          </div>
                          <div className="text-[10px] text-foreground/50">
                            <span className="dot" style={{ width: 5, height: 5, marginRight: 4 }} />
                            Online now
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Online players elsewhere */}
              {otherPlayers.length > playersHere.length && (
                <div className="mb-3 p-3 rounded-lg bg-secondary">
                  <div className="text-[10px] uppercase tracking-wide text-foreground/50 mb-1">
                    Other players online · {otherPlayers.length - playersHere.length}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {otherPlayers
                      .filter((p) => p.placeId !== placeId)
                      .slice(0, 8)
                      .map((p) => (
                        <span
                          key={p.playerId}
                          className="text-[11px] bg-card px-2 py-1 rounded-full border border-border"
                          title={`At ${PLACE_BY_ID[p.placeId]?.name || "unknown"}`}
                        >
                          {(p.playerName || "?").slice(0, 12)}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* NPCs */}
              <ul className="grid grid-cols-1 gap-1.5 mb-4">
                {peopleHere.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => setSelectedNPC(selectedNPC === n.id ? null : n.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card hover:border-foreground/20 transition text-left"
                    >
                      <span className="text-xl">{n.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{n.name}</div>
                        <div className="text-[10px] text-foreground/50 capitalize">
                          {n.vibe} · NPC
                        </div>
                      </div>
                      <span className="text-foreground/30">›</span>
                    </button>
                    {selectedNPC === n.id && (
                      <div className="mt-1 ml-3 mr-1 mb-2 p-2.5 rounded-lg bg-secondary flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (spray(200))
                              toast(`Sprayed ₦200 to ${n.name}! 🎉`, "success", "💵");
                            else toast("Not enough cash.", "warn");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium"
                        >
                          Spray ₦200
                        </button>
                        <button
                          onClick={() => {
                            usePlayer.getState().pushChat({
                              who: "me",
                              text: `Hi ${n.name}, how far?`,
                            });
                            setTimeout(() => {
                              const lines = [
                                "I dey, you self how far?",
                                "Big boy things!",
                                "Make we link up later.",
                                "Wetin dey happen for your side?",
                              ];
                              usePlayer.getState().pushChat({
                                who: "npc",
                                name: n.name,
                                text: lines[Math.floor(Math.random() * lines.length)],
                                emoji: n.emoji,
                              });
                            }, 800);
                            toast(`Started chatting with ${n.name}.`, "info", "💬");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium"
                        >
                          Gist
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {/* Rich list toggle */}
              <button
                onClick={() => setShowRichList(!showRichList)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary text-sm font-medium mb-2"
              >
                <span>🏆 Tonight's big spenders</span>
                <span className="text-foreground/40">
                  {showRichList ? "▲" : "▼"}
                </span>
              </button>

              {showRichList && (
                <ol className="grid grid-cols-1 gap-1">
                  {RICH_LIST.map((r) => (
                    <li
                      key={r.rank}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border"
                    >
                      <span className="text-sm font-bold w-6 text-foreground/40">
                        {r.rank}
                      </span>
                      <span className="text-xl">{r.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{r.name}</div>
                        <div className="text-[11px] text-primary">
                          {shortNaira(r.amount)} sprayed
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              <p className="text-[11px] text-foreground/40 text-center mt-4">
                NPC = non-player character. Real players you meet in the city
                will appear here with the green badge.
              </p>
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
