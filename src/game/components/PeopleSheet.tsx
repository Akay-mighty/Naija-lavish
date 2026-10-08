"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useAuth } from "../store/useAuth";
import { usePlayer } from "../store/usePlayer";
import { NPCS_BY_PLACE } from "../data/npcs";
import { PLACE_BY_ID } from "../data/places";
import { naira, shortNaira } from "../lib/format";
import { toast } from "../store/useToasts";
import { sfx } from "../lib/sound";
import {
  listenToAllPresence,
  type PresenceEntry,
} from "@/lib/firestore";

interface PeopleSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function PeopleSheet({ open, onClose }: PeopleSheetProps) {
  const uid = useAuth((s) => s.uid);
  const placeId = usePlayer((s) => s.placeId);
  const place = PLACE_BY_ID[placeId];

  const [presence, setPresence] = useState<PresenceEntry[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenToAllPresence((entries) => setPresence(entries));
    return () => unsub();
  }, []);

  // Real players: same zone first, then elsewhere
  const others = presence.filter((p) => p.uid !== uid);
  const here = others.filter((p) => p.placeId === placeId);
  const elsewhere = others.filter((p) => p.placeId !== placeId);

  // NPCs at this place (labelled clearly)
  const npcsHere = NPCS_BY_PLACE[placeId] || [];

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
                <h2 className="text-lg font-bold">People</h2>
                <p className="text-xs text-foreground/50">
                  {place?.name ?? "Abuja"} · {here.length} real player{here.length === 1 ? "" : "s"} · {npcsHere.length} NPC{npcsHere.length === 1 ? "" : "s"}
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
              {/* Real players at your spot */}
              <div className="text-[10px] uppercase tracking-wide text-foreground/40 mb-1.5 flex items-center gap-1.5">
                <span className="dot" style={{ width: 6, height: 6 }} />
                Real players here · {here.length}
              </div>
              {here.length === 0 ? (
                <p className="text-sm text-foreground/40 mb-3 italic">
                  You&apos;re the only one here. Share the link to bring your guys.
                </p>
              ) : (
                <ul className="grid grid-cols-1 gap-1.5 mb-3">
                  {here.map((p) => (
                    <li key={p.uid}>
                      <button
                        onClick={() => {
                          sfx.play("click");
                          setSelectedPlayer(selectedPlayer === p.uid ? null : p.uid);
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:border-emerald-300 transition text-left"
                      >
                        <span className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                          {(p.name || "?").slice(0, 1).toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">{p.name || "Unknown"}</div>
                          <div className="text-[10px] text-foreground/50 flex items-center gap-1">
                            <span className="dot" style={{ width: 5, height: 5 }} />
                            Online now
                          </div>
                        </div>
                        <span className="text-foreground/30">›</span>
                      </button>
                      {selectedPlayer === p.uid && (
                        <div className="mt-1 ml-3 mr-1 mb-2 p-2.5 rounded-lg bg-secondary flex items-center gap-2">
                          <button
                            onClick={() => { sfx.play("click"); toast(`👋 You waved at ${p.name}.`, "info"); }}
                            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
                          >
                            👋 Wave
                          </button>
                          <button
                            onClick={() => { sfx.play("click"); toast(`Send money via Phone → Bank.`, "info"); }}
                            className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium border border-border"
                          >
                            💸 Send
                          </button>
                          <button
                            onClick={() => { sfx.play("click"); toast(`Reported. Admin will review.`, "info"); }}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 text-xs font-medium"
                          >
                            🚩 Report
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {/* Real players elsewhere */}
              {elsewhere.length > 0 && (
                <div className="mb-3 p-3 rounded-lg bg-secondary">
                  <div className="text-[10px] uppercase tracking-wide text-foreground/50 mb-1">
                    Other players online · {elsewhere.length}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {elsewhere.slice(0, 12).map((p) => (
                      <span
                        key={p.uid}
                        className="text-[11px] bg-card px-2 py-1 rounded-full border border-border"
                        title={`At ${PLACE_BY_ID[p.placeId]?.name || "unknown"}`}
                      >
                        {(p.name || "?").slice(0, 12)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* NPCs (labelled clearly) */}
              {npcsHere.length > 0 && (
                <>
                  <div className="text-[10px] uppercase tracking-wide text-foreground/40 mb-1.5 mt-2">
                    NPCs · {npcsHere.length}
                  </div>
                  <ul className="grid grid-cols-1 gap-1.5">
                    {npcsHere.map((n) => (
                      <li
                        key={n.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card"
                      >
                        <span className="text-xl">{n.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{n.name}</div>
                          <div className="text-[10px] text-foreground/40 capitalize">
                            NPC · {n.vibe}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {here.length === 0 && elsewhere.length === 0 && npcsHere.length === 0 && (
                <p className="text-sm text-foreground/40 text-center mt-4">
                  Nobody here yet. Be the first.
                </p>
              )}
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
