"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "../store/usePlayer";
import { naira, clockFromHour } from "../lib/format";
import { PLACE_BY_ID } from "../data/places";
import { sfx } from "../lib/sound";

// Map need value (0-100) to a face emoji + word
function moodFor(vibe: number, hunger: number, energy: number): { face: string; word: string } {
  const avg = (vibe + hunger + energy) / 3;
  if (avg >= 75) return { face: "😄", word: "Gingered" };
  if (avg >= 55) return { face: "🙂", word: "Okay" };
  if (avg >= 35) return { face: "😐", word: "Tired" };
  if (avg >= 20) return { face: "😩", word: "Low" };
  return { face: "🥵", word: "Crashing" };
}

function NeedBar({ label, value, color, emoji }: { label: string; value: number; color: string; emoji: string }) {
  return (
    <div className="need" data-need={label.toLowerCase()}>
      <span className="need-icon" aria-hidden="true" style={{ fontSize: 14 }}>
        {emoji}
      </span>
      <span className="need-label">{label}</span>
      <span
        className="bar"
        style={{
          display: "inline-block",
          flex: 1,
          height: 5,
          borderRadius: 999,
          background: "var(--secondary)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <i
          style={{
            position: "absolute",
            inset: 0,
            width: `${Math.max(2, Math.min(100, value))}%`,
            background: color,
            borderRadius: 999,
            transition: "width .35s ease",
          }}
        />
      </span>
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
  const place = PLACE_BY_ID[placeId];

  const mood = moodFor(vibe, hunger, energy);
  const isNight = gameHour < 6 || gameHour >= 19;

  function handleToggleSound() {
    sfx.play("click");
    toggleSound();
    // Tell sound manager immediately
    sfx.setMuted(soundOn); // toggled value
  }

  return (
    <div
      className="absolute top-3 left-3 z-20 select-none"
      style={{ maxWidth: 320 }}
    >
      {/* Cash + clock + sound row */}
      <div className="flex items-center gap-2">
        <button
          className="panel flex items-center gap-2 px-3 py-2"
          style={{ borderRadius: 12 }}
          aria-label={`Cash: ${naira(cash)}`}
        >
          <span className="naira">₦</span>
          <b className="tabnum" style={{ fontSize: 17 }}>
            {naira(cash).replace("₦", "").trim()}
          </b>
          <span className="text-xs text-foreground/40 ml-1">wallet</span>
        </button>

        {/* Clock */}
        <div
          className="panel flex items-center gap-1.5 px-2.5 py-2"
          style={{ borderRadius: 12 }}
          aria-label={`Game time: ${clockFromHour(gameHour)}`}
        >
          <span style={{ fontSize: 14 }}>{isNight ? "🌙" : "☀️"}</span>
          <b className="tabnum text-xs">{clockFromHour(gameHour)}</b>
        </div>

        {/* Sound toggle */}
        <button
          className="panel flex items-center justify-center w-9 h-9"
          style={{ borderRadius: 12 }}
          onClick={handleToggleSound}
          aria-label={soundOn ? "Mute sound" : "Unmute sound"}
          aria-pressed={!soundOn}
        >
          {soundOn ? "🔊" : "🔇"}
        </button>
      </div>

      {/* Needs */}
      <div className="panel mt-2 px-3 py-2.5" style={{ borderRadius: 12 }}>
        <div className="flex flex-col gap-1.5">
          <NeedBar label="Belle"  value={hunger} color="#f59e0b" emoji="🍽️" />
          <NeedBar label="Energy" value={energy} color="#22c55e" emoji="⚡" />
          <NeedBar label="Vibe"   value={vibe}   color="#a855f7" emoji="✨" />
        </div>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
          <span style={{ fontSize: 16 }}>{mood.face}</span>
          <small className="text-foreground/50">{mood.word}</small>
        </div>
      </div>

      {/* Place card */}
      {place && (
        <div className="panel mt-2 px-3 py-2.5" style={{ borderRadius: 12 }}>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: place.color }}
            />
            <b style={{ fontSize: 14 }}>{place.name}</b>
          </div>
          <div className="text-[11px] text-foreground/40 mt-0.5">
            {place.area}, Abuja
          </div>
          <p className="text-[11px] text-foreground/60 mt-1 leading-snug italic">
            {place.ambience}
          </p>
        </div>
      )}
    </div>
  );
}
