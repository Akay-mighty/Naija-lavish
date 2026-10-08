"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { usePlayer } from "../store/usePlayer";
import { PLACE_BY_ID, START_PLACE_ID } from "../data/places";
import { NEED_LINES, pickLine } from "../data/npcs";
import { toast } from "../store/useToasts";
import { initPlayerSync } from "@/lib/firestore";
import { sfx } from "../lib/sound";
import HUD from "./HUD";
import BottomNav from "./BottomNav";
import Chat from "./Chat";
import Toasts from "./Toasts";
import PlaceSheet from "./PlaceSheet";
import MapSheet from "./MapSheet";
import PeopleSheet from "./PeopleSheet";
import Phone from "./Phone";

// Dynamically import the Three.js scene (ssr:false — WebGL is browser-only)
const Scene3D = dynamic(() => import("./Scene3D"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="dot" style={{ width: 12, height: 12 }} />
        <p className="text-sm text-foreground/50">Loading Abuja city…</p>
      </div>
    </div>
  ),
});

type Sheet = "place" | "map" | "people" | "phone" | null;

export default function Game() {
  const placeId = usePlayer((s) => s.placeId);
  const setPlace = usePlayer((s) => s.setPlace);
  const name = usePlayer((s) => s.name);
  const hunger = usePlayer((s) => s.hunger);
  const energy = usePlayer((s) => s.energy);
  const vibe = usePlayer((s) => s.vibe);
  const tick = usePlayer((s) => s.tick);
  const pushChat = usePlayer((s) => s.pushChat);
  const playerId = usePlayer((s) => s.playerId);
  const banned = usePlayer((s) => s.banned);
  const setScreen = usePlayer((s) => s.setScreen);

  const [sheet, setSheet] = useState<Sheet>(null);
  const [sheetPlaceId, setSheetPlaceId] = useState<string>(placeId);
  const [targetPlaceId, setTargetPlaceId] = useState<string | null>(null);
  const [hideUI, setHideUI] = useState(false);
  const [online] = useState(() => 40 + Math.floor(Math.random() * 60));
  const [views] = useState(() => 1240 + Math.floor(Math.random() * 800));

  // Init Firestore sync when player enters the game
  useEffect(() => {
    if (!playerId) return;
    const stopSync = initPlayerSync(playerId);
    return () => stopSync();
  }, [playerId]);

  // Banned screen — admin has banned this player
  useEffect(() => {
    if (banned) {
      toast("You have been banned by admin. Contact support.", "danger", "🚫");
    }
  }, [banned]);

  // Sync sheet place with current place
  useEffect(() => {
    setSheetPlaceId(placeId);
  }, [placeId]);

  // Needs decay tick (every 6 seconds) — also advance game clock
  const advanceHour = usePlayer((s) => s.advanceHour);
  useEffect(() => {
    const id = setInterval(() => {
      tick(6000);
      // 6 real seconds = 1 game hour (so 1 game day = 144 sec = 2.4 min)
      advanceHour(1);
    }, 6000);
    return () => clearInterval(id);
  }, [tick, advanceHour]);

  // Toast when needs get critically low (only once per need)
  const lastWarn = useRef<Record<string, number>>({});
  useEffect(() => {
    const now = Date.now();
    if (hunger < 18 && now - (lastWarn.current.hunger || 0) > 30_000) {
      lastWarn.current.hunger = now;
      toast(pickLine(NEED_LINES.hunger), "warn", "🍽️");
      sfx.play("warn");
    }
    if (energy < 15 && now - (lastWarn.current.energy || 0) > 30_000) {
      lastWarn.current.energy = now;
      toast(pickLine(NEED_LINES.energy), "warn", "⚡");
      sfx.play("warn");
    }
    if (vibe < 18 && now - (lastWarn.current.vibe || 0) > 30_000) {
      lastWarn.current.vibe = now;
      toast(pickLine(NEED_LINES.vibe), "warn", "✨");
      sfx.play("warn");
    }
  }, [hunger, energy, vibe]);

  // Play ban sound when banned
  useEffect(() => {
    if (banned) sfx.play("ban");
  }, [banned]);

  // Welcome toast on mount
  useEffect(() => {
    const t = setTimeout(() => {
      toast(`Welcome to NaijaLavish, ${name}! Tap a place on the map to walk there.`, "success", "🎉");
    }, 600);
    return () => clearTimeout(t);
  }, [name]);

  // When character arrives at a place (via CustomEvent from Scene3D), open the place sheet
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { placeId: string };
      setSheetPlaceId(detail.placeId);
      setPlace(detail.placeId);
      setTargetPlaceId(null);
      setSheet("place");
      const p = PLACE_BY_ID[detail.placeId];
      if (p) toast(`Arrived at ${p.name}.`, "info", "📍");
      sfx.play("arrive");
    };
    window.addEventListener("naijalavish:arrive", handler as EventListener);
    return () => window.removeEventListener("naijalavish:arrive", handler as EventListener);
  }, [setPlace]);

  // Play click sound on nav button presses
  function nav(id: "home" | "map" | "people" | "phone" | "hide") {
    sfx.play("click");
    if (id === "hide") {
      setHideUI(!hideUI);
      return;
    }
    if (id === "home") {
      // Walk home
      setTargetPlaceId("home");
      setSheet(null);
      return;
    }
    if (id === "map") {
      setSheet(sheet === "map" ? null : "map");
      return;
    }
    if (id === "people") {
      setSheet(sheet === "people" ? null : "people");
      return;
    }
    if (id === "phone") {
      setSheet(sheet === "phone" ? null : "phone");
      sfx.play("phone");
      return;
    }
  }

  function pickFromMap(id: string) {
    setTargetPlaceId(id);
    setSheet(null);
  }

  // Banned screen — admin has banned this player
  if (banned) {
    return (
      <main
        className="min-h-screen w-full flex items-center justify-center p-6"
        style={{ background: "linear-gradient(180deg, #fef2f2 0%, #fee2e2 100%)" }}
      >
        <div className="panel p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold mb-2 text-destructive">Account Banned</h1>
          <p className="text-sm text-foreground/60 mb-6">
            Your account has been banned by the admin. If you think this is a
            mistake, contact support at <b>support@naijalavish.fun</b>.
          </p>
          <button
            onClick={() => {
              usePlayer.getState().logout();
              setScreen("landing");
            }}
            className="big-btn plain"
          >
            ← Back to home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="relative w-full overflow-hidden"
      style={{ height: "100dvh", background: "#eef7f1" }}
    >
      {/* 3D scene */}
      <Scene3D targetPlaceId={targetPlaceId} />

      {/* Top stats / online count */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
        <div className="panel flex items-center gap-2 px-2.5 py-1.5" style={{ borderRadius: 999 }}>
          <span className="text-xs text-foreground/50">👁</span>
          <span className="text-xs font-medium tabnum">{views.toLocaleString()}</span>
          <span className="text-[10px] text-foreground/40">views</span>
        </div>
        <div className="panel flex items-center gap-2 px-2.5 py-1.5" style={{ borderRadius: 999 }}>
          <span className="dot" />
          <span className="text-xs font-medium tabnum">{online}</span>
          <span className="text-[10px] text-foreground/40">online</span>
        </div>
      </div>

      {/* HUD */}
      {!hideUI && <HUD />}

      {/* Chat */}
      {!hideUI && <Chat />}

      {/* Sheets */}
      <PlaceSheet
        open={sheet === "place"}
        onClose={() => setSheet(null)}
        onWalkHere={
          sheetPlaceId !== placeId
            ? () => setTargetPlaceId(sheetPlaceId)
            : undefined
        }
      />
      <MapSheet
        open={sheet === "map"}
        onClose={() => setSheet(null)}
        onPick={pickFromMap}
      />
      <PeopleSheet
        open={sheet === "people"}
        onClose={() => setSheet(null)}
      />
      {sheet === "phone" && <Phone onClose={() => setSheet(null)} />}

      {/* Bottom nav */}
      <BottomNav
        active={hideUI ? "hide" : sheet === "phone" ? "phone" : sheet === "people" ? "people" : sheet === "map" ? "map" : "home"}
        onNav={nav}
      />

      {/* Toasts */}
      <Toasts />

      {/* Hidden UI hint */}
      {hideUI && (
        <button
          onClick={() => setHideUI(false)}
          className="fixed bottom-4 right-4 z-40 panel px-3 py-2 text-xs"
          aria-label="Show UI"
        >
          👁 Show UI
        </button>
      )}

      {/* Brand mark (top-left, hidden when HUD shows) */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-10 text-xs text-foreground/40 pointer-events-none"
        aria-hidden="true"
      >
        Naija<span className="text-primary font-semibold">Lavish</span>
      </div>
    </main>
  );
}
