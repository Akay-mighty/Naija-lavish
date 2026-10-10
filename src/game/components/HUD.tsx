"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../store/useAuth";
import { usePlayer } from "../store/usePlayer";
import { naira, shortNaira, clockFromHour } from "../lib/format";
import { PLACE_BY_ID_ALL as PLACE_BY_ID, ALL_PLACES } from "../data/places";
import { QUEST_STEPS } from "../data/quests";
import { sfx } from "../lib/sound";
import { apiFetch } from "../lib/apiFetch";
import { rtdb } from "@/lib/firebase";
import { ref as dbRef, onValue as dbOnValue } from "firebase/database";

function moodFor(vibe: number, hunger: number, energy: number): { face: string; word: string } {
  const avg = (vibe + hunger + energy) / 3;
  if (avg >= 75) return { face: "😄", word: "Gingered" };
  if (avg >= 55) return { face: "🙂", word: "Okay" };
  if (avg >= 35) return { face: "😐", word: "Tired" };
  if (avg >= 20) return { face: "😩", word: "Low" };
  return { face: "🥵", word: "Crashing" };
}

export default function HUD() {
  const cash = usePlayer((s) => s.cash);
  const hunger = usePlayer((s) => s.hunger);
  const energy = usePlayer((s) => s.energy);
  const vibe = usePlayer((s) => s.vibe);
  const placeId = usePlayer((s) => s.placeId);
  const gameHour = usePlayer((s) => s.gameHour);
  const soundOn = usePlayer((s) => s.soundOn);
  const toggleSound = usePlayer((s) => s.toggleSound);
  const quest = usePlayer((s) => (s as any).quest);
  const idToken = useAuth((s) => s.idToken);

  const place = PLACE_BY_ID[placeId];
  const mood = moodFor(vibe, hunger, energy);
  const isNight = gameHour < 6 || gameHour >= 19;

  // Community goal
  const [sprayCount, setSprayCount] = useState(0);
  const SPRAY_GOAL = 100;
  useEffect(() => {
    const unsub = dbOnValue(dbRef(rtdb, "community/spraysToday"), (snap) => {
      setSprayCount(snap.val() || 0);
    });
    return () => unsub();
  }, []);

  // Quest
  const completedSet = new Set(quest?.completed || []);
  const currentStep = QUEST_STEPS.find((s) => !completedSet.has(s.id));

  // Dance
  const [dancing, setDancing] = useState(false);
  async function handleDance() {
    if (dancing) return;
    sfx.play("click");
    setDancing(true);
    window.dispatchEvent(new CustomEvent("naijalavish:dance"));
    setTimeout(() => {
      setDancing(false);
      window.dispatchEvent(new CustomEvent("naijalavish:stop-dance"));
    }, 5000);
  }

  function handleToggleSound() {
    sfx.play("click");
    toggleSound();
    sfx.setMuted(soundOn);
  }

  async function claimQuest() {
    if (!idToken || !currentStep) return;
    sfx.play("click");
    const r = await apiFetch("/api/player/quest", {
      method: "POST",
      body: { stepId: currentStep.id },
      idToken,
    });
    if (r.ok && r.data?.ok) sfx.play("cashEarn");
  }

  // Show needs panel on tap
  const [showNeeds, setShowNeeds] = useState(false);

  return (
    <>
      {/* === SINGLE CLEAN TOP PILL (like LagosLife) === */}
      <div
        className="fixed top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2"
        style={{
          background: "white",
          borderRadius: 999,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          border: "1px solid rgba(0,0,0,0.06)",
          maxWidth: "calc(100vw - 16px)",
        }}
      >
        {/* Time + mood */}
        <button
          onClick={() => setShowNeeds(!showNeeds)}
          className="flex items-center gap-1.5 flex-none"
        >
          <span style={{ fontSize: 13 }}>{isNight ? "🌙" : "☀️"}</span>
          <b className="text-xs tabnum">{clockFromHour(gameHour)}</b>
          <span style={{ fontSize: 13 }}>{mood.face}</span>
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: "rgba(0,0,0,0.08)" }} />

        {/* Cash */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span style={{ color: "#00875a", fontWeight: 700, fontSize: 13 }}>₦</span>
          <b className="text-sm tabnum truncate" style={{ maxWidth: 120 }}>
            {naira(cash).replace("₦", "").trim()}
          </b>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: "rgba(0,0,0,0.08)" }} />

        {/* Sound */}
        <button onClick={handleToggleSound} className="flex-none" aria-label="Sound">
          {soundOn ? "🔊" : "🔇"}
        </button>

        {/* Dance */}
        <button
          onClick={handleDance}
          className="flex-none"
          style={{
            fontSize: 14,
            filter: dancing ? "drop-shadow(0 0 4px #a855f7)" : "none",
          }}
          aria-label="Dance"
        >
          💃
        </button>
      </div>

      {/* === MINI-MAP (top-right) === */}
      <div
        className="fixed top-12 right-2 z-20"
        style={{
          width: 100,
          height: 100,
          background: "linear-gradient(135deg, #a8d5b6 0%, #c8e6c9 50%, #d4e9d4 100%)",
          borderRadius: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
          border: "2px solid white",
          overflow: "hidden",
        }}
      >
        {/* Roads */}
        <div style={{ position: "absolute", left: 0, right: 0, top: "48%", height: 3, background: "#4a4a4a", opacity: 0.5 }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "48%", width: 3, background: "#4a4a4a", opacity: 0.5 }} />

        {/* Place dots */}
        {ALL_PLACES.map(p => {
          const left = ((p.pos[0] + 22) / 44) * 100;
          const top = ((p.pos[1] + 16) / 32) * 100;
          if (left < 0 || left > 100 || top < 0 || top > 100) return null;
          return (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${left}%`,
                top: `${top}%`,
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: p.id === placeId ? "#fbbf24" : p.color,
                transform: "translate(-50%, -50%)",
                boxShadow: p.id === placeId ? "0 0 4px #fbbf24" : "none",
              }}
            />
          );
        })}

        {/* Player arrow */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: 10,
          }}
        >
          🔺
        </div>
      </div>

      {/* === NEEDS DROPDOWN (taps the time/mood area) === */}
      {showNeeds && (
        <div
          className="fixed top-12 left-1/2 -translate-x-1/2 z-20 px-3 py-2"
          style={{
            background: "white",
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            border: "1px solid rgba(0,0,0,0.06)",
            minWidth: 200,
          }}
        >
          <div className="flex flex-col gap-1.5">
            <NeedRow emoji="🍽️" label="Belle" value={hunger} color="#f59e0b" />
            <NeedRow emoji="⚡" label="Energy" value={energy} color="#22c55e" />
            <NeedRow emoji="✨" label="Vibe" value={vibe} color="#a855f7" />
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 pt-1.5" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <span style={{ fontSize: 12 }}>{mood.face}</span>
            <span className="text-[10px] text-gray-500">{mood.word}</span>
          </div>
        </div>
      )}

      {/* === PLACE NAME (small, bottom-left above chat) === */}
      {place && (
        <div
          className="fixed left-2 z-20 flex items-center gap-1.5 px-2.5 py-1"
          style={{
            bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
            background: "white",
            borderRadius: 999,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: place.color }}
          />
          <span className="text-[11px] font-semibold truncate" style={{ maxWidth: 100 }}>
            {place.name}
          </span>
        </div>
      )}

      {/* === QUEST CARD (small, right side) === */}
      {currentStep && (
        <button
          onClick={claimQuest}
          className="fixed right-2 z-20 px-2.5 py-1.5 transition"
          style={{
            bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
            background: "linear-gradient(135deg, #00875a, #00b86b)",
            borderRadius: 999,
            boxShadow: "0 2px 8px rgba(0,135,90,0.2)",
            maxWidth: 160,
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-bold uppercase text-white/70 bg-black/20 px-1 py-0.5 rounded">Q</span>
            <span className="text-[10px] font-medium text-white truncate">{currentStep.label}</span>
            <span className="text-[9px] text-white/80 font-bold flex-none">+{shortNaira(currentStep.reward)}</span>
          </div>
        </button>
      )}
    </>
  );
}

function NeedRow({ emoji, label, value, color }: { emoji: string; label: string; value: number; color: string }) {
  const pct = Math.max(3, Math.min(100, Math.round(value || 0)));
  return (
    <div className="flex items-center gap-2">
      <span style={{ fontSize: 11, width: 14 }}>{emoji}</span>
      <span className="text-[10px] text-gray-500" style={{ width: 36 }}>{label}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 999, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width .3s" }} />
      </div>
      <span className="text-[9px] text-gray-400 tabnum" style={{ width: 20, textAlign: "right" }}>{pct}</span>
    </div>
  );
}
