"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PLACES } from "../data/places";
import { usePlayer } from "../store/usePlayer";

interface MapSheetProps {
  open: boolean;
  onClose: () => void;
  onPick: (placeId: string) => void;
}

export default function MapSheet({ open, onClose, onPick }: MapSheetProps) {
  const placeId = usePlayer((s) => s.placeId);

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
            aria-label="Abuja Map"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            <header className="flex items-center justify-between px-5 pt-4 pb-2">
              <div>
                <h2 className="text-lg font-bold">Abuja Map</h2>
                <p className="text-xs text-foreground/50">
                  Tap a place to walk there
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
              <ul className="grid grid-cols-1 gap-2">
                {PLACES.map((p) => {
                  const isActive = p.id === placeId;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onPick(p.id);
                          onClose();
                        }}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl border transition text-left ${
                          isActive
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-foreground/20"
                        }`}
                      >
                        <span
                          className="flex-none w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                          style={{ background: p.color }}
                        >
                          {p.category === "work" && "💼"}
                          {p.category === "market" && "🛍️"}
                          {p.category === "social" && "🎉"}
                          {p.category === "home" && "🏠"}
                          {p.category === "rest" && "🌳"}
                          {p.category === "service" && "🏛️"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{p.name}</span>
                            {isActive && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-medium">
                                YOU ARE HERE
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-foreground/50 mt-0.5">
                            {p.area} · {p.category}
                          </div>
                          <div className="text-xs text-foreground/60 mt-1 leading-snug">
                            {p.ambience}
                          </div>
                        </div>
                        <span className="text-foreground/30 self-center">›</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
