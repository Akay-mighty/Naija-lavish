"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PLACES, KADUNA_PLACES, CITIES, getPlacesByCity, type CityId, type Place } from "../data/places";
import { usePlayer } from "../store/usePlayer";
import { sfx } from "../lib/sound";

interface MapSheetProps {
  open: boolean;
  onClose: () => void;
  onPick: (placeId: string) => void;
}

export default function MapSheet({ open, onClose, onPick }: MapSheetProps) {
  const placeId = usePlayer((s) => s.placeId);
  const housePos = usePlayer((s) => s.housePos);
  const [city, setCity] = useState<CityId>("abuja");
  const places = getPlacesByCity(city);

  // Map 3D world positions to 2D map percentages (for the visual map)
  const BOUNDS = { minX: -22, maxX: 22, minZ: -16, maxZ: 16 };
  function posToPercent(x: number, z: number): { left: string; top: string } {
    const left = ((x - BOUNDS.minX) / (BOUNDS.maxX - BOUNDS.minX)) * 100;
    const top = ((z - BOUNDS.minZ) / (BOUNDS.maxZ - BOUNDS.minZ)) * 100;
    return { left: `${Math.max(4, Math.min(96, left))}%`, top: `${Math.max(8, Math.min(92, top))}%` };
  }

  // Current player position on the map
  const playerPos = placeId === "home" && housePos ? housePos : (PLACES.find((p) => p.id === placeId)?.pos || [0, 0]);
  const playerMapPos = posToPercent(playerPos[0], playerPos[1]);

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
            style={{ background: "rgba(15, 28, 22, 0.6)" }}
            onClick={onClose}
          />
          <motion.section
            className="sheet"
            role="dialog"
            aria-label="City Map"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            style={{ maxHeight: "92vh" }}
          >
            <header className="flex items-center justify-between px-5 pt-4 pb-2">
              <div>
                <h2 className="text-lg font-bold">{city === "abuja" ? "Abuja" : "Kaduna"} Map</h2>
                <p className="text-xs text-foreground/50">Tap a pin to walk there</p>
              </div>
              <button type="button" className="chip-btn" onClick={onClose} aria-label="Close">✕</button>
            </header>

            {/* City switcher */}
            <div className="flex gap-1 px-5 pb-2">
              {CITIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { sfx.play("click"); setCity(c.id); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    city === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/60"
                  }`}
                >
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>

            {/* Visual 3D-style map */}
            <div
              className="relative mx-5 rounded-xl overflow-hidden mb-3"
              style={{
                height: 280,
                background: "linear-gradient(135deg, #a8d5b6 0%, #c8e6c9 40%, #b3d9c4 70%, #d4e9d4 100%)",
                border: "1px solid var(--border)",
              }}
            >
              {/* Roads (cross pattern) */}
              <div
                style={{
                  position: "absolute",
                  left: 0, right: 0,
                  top: "48%", height: 8,
                  background: "linear-gradient(90deg, #3a3a3a 0%, #4a4a4a 50%, #3a3a3a 100%)",
                  opacity: 0.6,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 0, bottom: 0,
                  left: "48%", width: 8,
                  background: "linear-gradient(180deg, #3a3a3a 0%, #4a4a4a 50%, #3a3a3a 100%)",
                  opacity: 0.6,
                }}
              />
              {/* Road dashes */}
              <div
                style={{
                  position: "absolute",
                  left: 0, right: 0, top: "49.5%", height: 2,
                  backgroundImage: "repeating-linear-gradient(90deg, #fde68a 0px, #fde68a 12px, transparent 12px, transparent 24px)",
                  opacity: 0.7,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 0, bottom: 0, left: "49.5%", width: 2,
                  backgroundImage: "repeating-linear-gradient(180deg, #fde68a 0px, #fde68a 12px, transparent 12px, transparent 24px)",
                  opacity: 0.7,
                }}
              />

              {/* Lake (if Abuja — Jabi Lake) */}
              {city === "abuja" && (
                <div
                  style={{
                    position: "absolute",
                    left: "12%", top: "55%",
                    width: 80, height: 50,
                    borderRadius: "50%",
                    background: "radial-gradient(ellipse, #4a90c2 30%, #5ba0d2 70%)",
                    opacity: 0.7,
                  }}
                />
              )}

              {/* Aso Rock (if Abuja) */}
              {city === "abuja" && (
                <div
                  style={{
                    position: "absolute",
                    left: "22%", top: "15%",
                    width: 50, height: 35,
                    background: "#78716c",
                    clipPath: "polygon(20% 100%, 50% 0%, 80% 100%)",
                    opacity: 0.6,
                  }}
                />
              )}

              {/* Place pins */}
              {places.map((p) => {
                const pos = p.id === "home" && housePos ? posToPercent(housePos[0], housePos[1]) : posToPercent(p.pos[0], p.pos[1]);
                const isActive = p.id === placeId;
                return (
                  <button
                    key={p.id}
                    onClick={() => { sfx.play("click"); onPick(p.id); onClose(); }}
                    style={{
                      position: "absolute",
                      left: pos.left,
                      top: pos.top,
                      transform: "translate(-50%, -100%)",
                      zIndex: isActive ? 20 : 10,
                    }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    {/* Pin */}
                    <div
                      style={{
                        width: isActive ? 16 : 12,
                        height: isActive ? 16 : 12,
                        borderRadius: "50% 50% 50% 0",
                        transform: "rotate(-45deg)",
                        background: p.color,
                        border: "2px solid white",
                        boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.3)" : "0 1px 4px rgba(0,0,0,0.2)",
                      }}
                    />
                    {/* Label */}
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 600,
                        color: "#1a1a1a",
                        textShadow: "0 1px 2px rgba(255,255,255,0.8)",
                        whiteSpace: "nowrap",
                        maxWidth: 60,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {p.name.split(" ")[0]}
                    </span>
                    {isActive && (
                      <span
                        style={{
                          fontSize: 7,
                          fontWeight: 700,
                          color: "white",
                          background: "var(--primary)",
                          padding: "1px 4px",
                          borderRadius: 3,
                        }}
                      >
                        HERE
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Player position marker */}
              <div
                style={{
                  position: "absolute",
                  left: playerMapPos.left,
                  top: playerMapPos.top,
                  transform: "translate(-50%, -50%)",
                  zIndex: 30,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#fbbf24",
                    border: "2px solid white",
                    boxShadow: "0 0 8px rgba(251, 191, 36, 0.6)",
                    animation: "pulse 1.5s infinite",
                  }}
                />
              </div>

              {/* City name label */}
              <div
                style={{
                  position: "absolute",
                  bottom: 6,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "rgba(0,0,0,0.3)",
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                {city === "abuja" ? "FCT Abuja" : "Kaduna"}
              </div>
            </div>

            {/* Place list (below visual map) */}
            <div className="overflow-y-auto soft-scroll px-5 pb-6" style={{ maxHeight: 200 }}>
              <ul className="grid grid-cols-1 gap-1.5">
                {places.map((p) => {
                  const isActive = p.id === placeId;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => { sfx.play("click"); onPick(p.id); onClose(); }}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition text-left ${
                          isActive ? "border-primary bg-primary/5" : "border-border bg-card"
                        }`}
                      >
                        <span
                          className="flex-none w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
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
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-medium">HERE</span>
                            )}
                          </div>
                          <div className="text-[10px] text-foreground/50">{p.area} · {p.category}</div>
                        </div>
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
