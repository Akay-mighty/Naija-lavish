"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../store/useAuth";
import { usePlayer } from "../store/usePlayer";
import { naira, shortNaira, clockFromHour } from "../lib/format";
import { PLACE_BY_ID } from "../data/places";
import { QUEST_STEPS } from "../data/quests";
import { sfx } from "../lib/sound";
import { apiFetch } from "../lib/apiFetch";

// Map need value (0-100) to a face emoji + word
function moodFor(vibe: number, hunger: number, energy: number): { face: string; word: string } {
  const avg = (vibe + hunger + energy) / 3;
  if (avg >= 75) return { face: "😄", word: "Gingered" };
  if (avg >= 55) return { face: "🙂", word: "Okay" };
  if (avg >= 35) return { face: "😐", word: "Tired" };
  if (avg >= 20) return { face: "😩", word: "Low" };
  return { face: "🥵", word: "Crashing" };
}

function NeedBar({ label, value, color, emoji }: { label: string; value: number; vibeBoost?: number; color: string; emoji: string }) {
  // Clamp + ensure width > 0 (fixes the "bars don't render" bug)
  const pct = Math.max(2, Math.min(100, Math.round(value || 0)));
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs" style={{ width: 16, textAlign: "center" }}>{emoji}</span>
      <span className="text-[10px] text-white/70" style={{ width: 36 }}>{label}</span>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 999,
          background: "rgba(255,255,255,0.15)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 999,
            transition: "width .35s ease",
          }}
        />
      </div>
      <span className="text-[10px] text-white/50 tabnum" style={{ width: 24, textAlign: "right" }}>{pct}</span>
    </div>
  );
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

  // Determine current quest step (first uncompleted)
  const completedSet = new Set(quest?.completed || []);
  const currentStep = QUEST_STEPS.find((s) => !completedSet.has(s.id));

  function handleToggleSound() {
    sfx.play("click");
    toggleSound();
    sfx.setMuted(soundOn); // soundOn is the OLD value (pre-toggle), so the new state is the opposite
  }

  // Claim current quest step (calls /api/player/quest which verifies server-side)
  async function claimQuest() {
    if (!idToken || !currentStep) return;
    sfx.play("click");
    const r = await apiFetch("/api/player/quest", {
      method: "POST",
      body: { stepId: currentStep.id },
      idToken,
    });
    if (r.ok && r.data?.ok) {
      sfx.play("cashEarn");
    }
  }

  return (
    <div
      className="absolute top-3 left-3 z-20 select-none"
      style={{ maxWidth: 340 }}
    >
      {/* Top row: cash + clock + sound — dark frosted glass pills */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{
            borderRadius: 12,
            background: "rgba(15, 28, 22, 0.72)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          aria-label={`Cash: ${naira(cash)}`}
        >
          <span style={{ color: "#fbbf24", fontWeight: 700 }}>₦</span>
          <b className="tabnum text-white" style={{ fontSize: 17 }}>
            {naira(cash).replace("₦", "").trim()}
          </b>
        </div>

        {/* Clock */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-2"
          style={{
            borderRadius: 12,
            background: "rgba(15, 28, 22, 0.72)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          aria-label={`Game time: ${clockFromHour(gameHour)}`}
        >
          <span style={{ fontSize: 14 }}>{isNight ? "🌙" : "☀️"}</span>
          <b className="tabnum text-xs text-white">{clockFromHour(gameHour)}</b>
        </div>

        {/* Sound toggle */}
        <button
          className="flex items-center justify-center w-9 h-9"
          style={{
            borderRadius: 12,
            background: "rgba(15, 28, 22, 0.72)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          onClick={handleToggleSound}
          aria-label={soundOn ? "Mute sound" : "Unmute sound"}
          aria-pressed={!soundOn}
        >
          {soundOn ? "🔊" : "🔇"}
        </button>
      </div>

      {/* Needs + mood — dark frosted glass panel */}
      <div
        className="px-3 py-2.5 mb-2"
        style={{
          borderRadius: 12,
          background: "rgba(15, 28, 22, 0.72)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <div className="flex flex-col gap-1.5">
          <NeedBar label="Belle"  value={hunger} color="#f59e0b" emoji="🍽️" />
          <NeedBar label="Energy" value={energy} color="#22c55e" emoji="⚡" />
          <NeedBar label="Vibe"   value={vibe}   color="#a855f7" emoji="✨" />
        </div>
        <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
          <span style={{ fontSize: 16 }}>{mood.face}</span>
          <small className="text-white/60">{mood.word}</small>
        </div>
      </div>

      {/* Place card — FIX: shows area, never "—" */}
      {place && (
        <div
          className="px-3 py-2.5 mb-2"
          style={{
            borderRadius: 12,
            background: "rgba(15, 28, 22, 0.72)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: place.color }}
            />
            <b className="text-sm text-white">{place.name}</b>
          </div>
          <div className="text-[11px] text-white/50 mt-0.5">
            {place.area && place.area !== "—" ? `${place.area}, ` : ""}Abuja
          </div>
          <p className="text-[11px] text-white/70 mt-1 leading-snug italic">
            {place.ambience}
          </p>
        </div>
      )}

      {/* Quest card — shows current step */}
      {currentStep && (
        <button
          onClick={claimQuest}
          className="block w-full text-left px-3 py-2.5 mb-2 transition hover:brightness-110"
          style={{
            borderRadius: 12,
            background: "linear-gradient(135deg, #00875a 0%, #00b86b 100%)",
            boxShadow: "0 4px 12px rgba(0, 135, 90, 0.3)",
          }}
          aria-label={`Quest: ${currentStep.label}. Tap to claim reward.`}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] font-bold uppercase tracking-wide text-white/80"
              style={{ background: "rgba(0,0,0,0.25)", padding: "2px 6px", borderRadius: 4 }}
            >
              NEXT
            </span>
            <b className="text-sm text-white">{currentStep.label}</b>
            <span className="ml-auto text-[11px] text-white/90 font-semibold">+{shortNaira(currentStep.reward)}</span>
          </div>
          <p className="text-[11px] text-white/80 mt-1 leading-snug">{currentStep.hint}</p>
          <div className="text-[10px] text-white/60 mt-1">Tap when done → claim reward</div>
        </button>
      )}
    </div>
  );
}
