"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "../store/useAuth";
import { usePlayer } from "../store/usePlayer";
import { PLACE_BY_ID, START_PLACE_ID } from "../data/places";
import { toast } from "../store/useToasts";
import { sfx } from "../lib/sound";
import {
  listenToPlayer,
  initPresence,
  updatePresence,
  clearPresence,
  listenToAllPresence,
  type PlayerProfile,
} from "@/lib/firestore";
import HUD from "./HUD";
import BottomNav from "./BottomNav";
import Chat from "./Chat";
import Toasts from "./Toasts";
import PlaceSheet from "./PlaceSheet";
import MapSheet from "./MapSheet";
import PeopleSheet from "./PeopleSheet";
import Phone from "./Phone";

// Simple need-warning lines (no fake NPC chatter)
const NEED_LINES = {
  hunger: ["Your belle dey rumble. Go find food.", "Hunger wan finish you. Chop something abeg."],
  energy: ["Energy don finish. Go sleep or sit down small.", "Body no be firewood. Rest small."],
  vibe: ["Your vibe dey low. Go link up somewhere.", "Spirit dey down. Dance or stroll."],
};

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
  const uid = useAuth((s) => s.uid);
  const idToken = useAuth((s) => s.idToken);
  const soloMode = useAuth((s) => s.soloMode);

  const placeId = usePlayer((s) => s.placeId);
  const name = usePlayer((s) => s.name);
  const hunger = usePlayer((s) => s.hunger);
  const energy = usePlayer((s) => s.energy);
  const vibe = usePlayer((s) => s.vibe);
  const tick = usePlayer((s) => s.tick);
  const banned = usePlayer((s) => s.banned);
  const syncFromProfile = usePlayer((s) => s.syncFromProfile);
  const setPlace = usePlayer((s) => s.setPlace);
  const advanceHour = usePlayer((s) => s.advanceHour);

  const [sheet, setSheet] = useState<Sheet>(null);
  const [sheetPlaceId, setSheetPlaceId] = useState<string>(placeId);
  const [targetPlaceId, setTargetPlaceId] = useState<string | null>(null);
  const [hideUI, setHideUI] = useState(false);

  // Sync player store from Firestore profile (server is source of truth)
  useEffect(() => {
    if (!uid) return;
    const unsub = listenToPlayer(uid, (p) => {
      if (p) syncFromProfile(p as PlayerProfile);
    });
    return () => unsub();
  }, [uid, syncFromProfile]);

  // Init RTDB presence
  useEffect(() => {
    if (!uid || soloMode) return;
    initPresence(uid, name || "Player", usePlayer.getState().lookId, placeId);
    return () => { void clearPresence(uid); };
  }, [uid, name, soloMode]);

  // Update presence when placeId changes
  useEffect(() => {
    if (!uid || soloMode) return;
    void updatePresence(uid, { placeId, name });
  }, [uid, placeId, name, soloMode]);

  // Needs decay + game clock tick (every 6 seconds)
  useEffect(() => {
    const id = setInterval(() => {
      tick(6000);
      advanceHour(1);
    }, 6000);
    return () => clearInterval(id);
  }, [tick, advanceHour]);

  // Toast when needs get critically low
  const lastWarn = useRef<Record<string, number>>({});
  useEffect(() => {
    const now = Date.now();
    if (hunger < 18 && now - (lastWarn.current.hunger || 0) > 30_000) {
      lastWarn.current.hunger = now;
      toast(NEED_LINES.hunger[0], "warn", "🍽️");
      sfx.play("warn");
    }
    if (energy < 15 && now - (lastWarn.current.energy || 0) > 30_000) {
      lastWarn.current.energy = now;
      toast(NEED_LINES.energy[0], "warn", "⚡");
      sfx.play("warn");
    }
    if (vibe < 18 && now - (lastWarn.current.vibe || 0) > 30_000) {
      lastWarn.current.vibe = now;
      toast(NEED_LINES.vibe[0], "warn", "✨");
      sfx.play("warn");
    }
  }, [hunger, energy, vibe]);

  // Play ban sound
  useEffect(() => {
    if (banned) sfx.play("ban");
  }, [banned]);

  // Welcome toast
  useEffect(() => {
    if (!name) return;
    const t = setTimeout(() => {
      toast(`Welcome to NaijaLavish, ${name}! Tap a place on the map to walk there.`, "success", "🎉");
    }, 600);
    return () => clearTimeout(t);
  }, [name]);

  // Solo mode banner
  useEffect(() => {
    if (soloMode) {
      toast("Offline mode — chat + multiplayer disabled. Check your connection.", "warn", "📡");
    }
  }, [soloMode]);

  // Character arrival → open place sheet
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

  // Sync sheet place with current place
  useEffect(() => { setSheetPlaceId(placeId); }, [placeId]);

  function nav(id: "home" | "map" | "people" | "phone" | "hide") {
    sfx.play("click");
    if (id === "hide") { setHideUI(!hideUI); return; }
    if (id === "home") { setTargetPlaceId("home"); setSheet(null); return; }
    if (id === "map")  { setSheet(sheet === "map" ? null : "map"); return; }
    if (id === "people") { setSheet(sheet === "people" ? null : "people"); return; }
    if (id === "phone")  { setSheet(sheet === "phone" ? null : "phone"); sfx.play("phone"); return; }
  }

  function pickFromMap(id: string) {
    setTargetPlaceId(id);
    setSheet(null);
  }

  // Banned screen
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
            Your account has been banned by the admin. If you think this is a mistake, contact support.
          </p>
          <button
            onClick={() => { usePlayer.getState().logout(); useAuth.getState().signOut(); }}
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
      <Scene3D targetPlaceId={targetPlaceId} />

      {/* Top right: real online count only */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
        {soloMode ? (
          <div className="panel flex items-center gap-2 px-2.5 py-1.5" style={{ borderRadius: 999 }}>
            <span className="text-xs text-foreground/50">📡</span>
            <span className="text-xs font-medium">Offline</span>
          </div>
        ) : (
          <OnlineCounter />
        )}
      </div>

      {!hideUI && <HUD />}
      {!hideUI && <Chat />}

      <PlaceSheet
        open={sheet === "place"}
        onClose={() => setSheet(null)}
        onWalkHere={sheetPlaceId !== placeId ? () => setTargetPlaceId(sheetPlaceId) : undefined}
      />
      <MapSheet open={sheet === "map"} onClose={() => setSheet(null)} onPick={pickFromMap} />
      <PeopleSheet open={sheet === "people"} onClose={() => setSheet(null)} />
      {sheet === "phone" && <Phone onClose={() => setSheet(null)} />}

      <BottomNav
        active={hideUI ? "hide" : sheet === "phone" ? "phone" : sheet === "people" ? "people" : sheet === "map" ? "map" : "home"}
        onNav={nav}
      />
      <Toasts />

      {hideUI && (
        <button
          onClick={() => setHideUI(false)}
          className="fixed bottom-4 right-4 z-40 panel px-3 py-2 text-xs"
          aria-label="Show UI"
        >
          👁 Show UI
        </button>
      )}
    </main>
  );
}

// Real online counter from RTDB presence
function OnlineCounter() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const unsub = listenToAllPresence((entries) => setCount(entries.length));
    return () => unsub();
  }, []);
  return (
    <div className="panel flex items-center gap-2 px-2.5 py-1.5" style={{ borderRadius: 999 }}>
      <span className="dot" />
      <span className="text-xs font-medium tabnum">{count}</span>
      <span className="text-[10px] text-foreground/40">online</span>
    </div>
  );
}
