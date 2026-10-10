"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "../store/usePlayer";
import { PLACE_BY_ID_ALL as PLACE_BY_ID } from "../data/places";
import { sfx } from "../lib/sound";
import { naira } from "../lib/format";

interface RideOverlayProps {
  fromPlaceId: string;
  toPlaceId: string;
  onArrive: () => void;
  onCancel: () => void;
}

export default function RideOverlay({ fromPlaceId, toPlaceId, onArrive, onCancel }: RideOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<"ordering" | "waiting" | "moving" | "arrived">("ordering");
  const fromPlace = PLACE_BY_ID[fromPlaceId];
  const toPlace = PLACE_BY_ID[toPlaceId];

  // Ride duration: 8 seconds (can skip)
  const RIDE_DURATION = 8;

  useEffect(() => {
    sfx.play("click");

    // Phase 1: Ordering (1s)
    const t1 = setTimeout(() => {
      setStatus("waiting");
      sfx.play("phone");
    }, 1000);

    // Phase 2: Waiting (1.5s)
    const t2 = setTimeout(() => {
      setStatus("moving");
      sfx.play("arrive");
    }, 2500);

    // Phase 3: Moving (progress bar fills over RIDE_DURATION seconds)
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const pct = Math.min(100, (elapsed / RIDE_DURATION) * 100);
      setProgress(pct);
      setElapsed(elapsed);
      if (pct >= 100) {
        clearInterval(interval);
        setStatus("arrived");
        sfx.play("cashEarn");
      }
    }, 100);

    // Auto-arrive after ride duration + buffers
    const t3 = setTimeout(() => {
      onArrive();
    }, (2500 + RIDE_DURATION * 1000) + 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(interval);
    };
  }, []);

  function skip() {
    sfx.play("click");
    onArrive();
  }

  const statusText = {
    ordering: "Ordering Uber...",
    waiting: "Driver is on the way...",
    moving: `${fromPlace?.name || "Here"} → ${toPlace?.name || "Destination"}`,
    arrived: `Arrived at ${toPlace?.name || "destination"}!`,
  }[status];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ background: "rgba(0,0,0,0.85)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Car animation */}
        <div className="relative w-full max-w-sm px-6 mb-8">
          {/* Route line */}
          <div
            className="relative h-1 bg-white/10 rounded-full overflow-hidden mb-4"
            style={{ width: "100%" }}
          >
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Car emoji moving along route */}
          <div
            className="absolute -top-3 text-2xl transition-all duration-100"
            style={{ left: `calc(${progress}% - 12px)` }}
          >
            🚗
          </div>

          {/* Start + End labels */}
          <div className="flex justify-between text-[10px] text-white/40 mt-4">
            <span>📍 {fromPlace?.name || "Here"}</span>
            <span>{toPlace?.name || "Destination"} 🎯</span>
          </div>
        </div>

        {/* Status text */}
        <div className="text-white text-sm font-medium mb-4 text-center px-6">
          {statusText}
        </div>

        {/* Weather/time detail */}
        {status === "moving" && (
          <div className="text-white/40 text-[11px] mb-4">
            ETA: {Math.max(0, Math.ceil(RIDE_DURATION - elapsed))}s
          </div>
        )}

        {/* Arrival sequence */}
        {status === "arrived" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center px-6"
          >
            <p className="text-white/60 text-[11px] mb-3 italic">
              {toPlace?.ambience || "You've arrived."}
            </p>
            <button
              onClick={skip}
              className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm"
            >
              Go in →
            </button>
          </motion.div>
        )}

        {/* Skip button */}
        {status !== "arrived" && (
          <button
            onClick={skip}
            className="absolute bottom-8 right-4 px-4 py-2 rounded-xl text-white/60 text-xs font-medium border border-white/20"
          >
            Skip ride ›
          </button>
        )}

        {/* Turn back button */}
        {status === "moving" && (
          <button
            onClick={() => { sfx.play("click"); onCancel(); }}
            className="absolute bottom-8 left-4 px-4 py-2 rounded-xl text-white/60 text-xs font-medium border border-white/20"
          >
            ← Turn back
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
