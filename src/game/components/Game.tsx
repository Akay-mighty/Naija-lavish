"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "../store/useAuth";
import { usePlayer } from "../store/usePlayer";
import { PLACE_BY_ID_ALL as PLACE_BY_ID, START_PLACE_ID } from "../data/places";
import { toast } from "../store/useToasts";
import { sfx } from "../lib/sound";
import { apiFetch } from "../lib/apiFetch";
import { useRoute, openSheet, closeSheet } from "../lib/nav";
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
import VirtualJoystick from "./VirtualJoystick";
import Chat from "./Chat";
import Toasts from "./Toasts";
import PlaceSheet from "./PlaceSheet";
import MapSheet from "./MapSheet";
import PeopleSheet from "./PeopleSheet";
import Phone from "./Phone";
import RideOverlay from "./RideOverlay";

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

  // Load the 3D character models (male + female GLB) BEFORE the city starts.
  // The city builds every player the moment it starts; if the models were still downloading,
  // everyone was built as the plain fallback figure and never swapped. We wait (max 10s) so the
  // real characters are ready, and fall back to the simple figures only if the download fails.
  const [modelsReady, setModelsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const done = () => { if (alive) setModelsReady(true); };
    const timer = window.setTimeout(done, 10000);
    void import("../three/models")
      .then((m) => Promise.all([
        m.preloadCharacters().catch(() => {}),
        m.preloadCar().catch(() => {}),
        m.preloadProps().catch(() => {}),
      ]))
      .catch(() => {})
      .finally(() => { window.clearTimeout(timer); done(); });
    return () => { alive = false; window.clearTimeout(timer); };
  }, []);

  // The open sheet lives in the URL (#game/map ...) so the phone's Back button closes it
  // instead of leaving the game.
  const route = useRoute();
  const sheet: Sheet = route.screen === "game" ? route.sheet : null;
  const setSheet = useCallback((s: Sheet) => {
    if (s) openSheet(s);
    else closeSheet();
  }, []);
  const [sheetPlaceId, setSheetPlaceId] = useState<string>(placeId);
  const [targetPlaceId, setTargetPlaceId] = useState<string | null>(null);
  const [hideUI, setHideUI] = useState(false);
  const [interior, setInterior] = useState<"home" | "owambe" | null>(null);
  const [ride, setRide] = useState<{ from: string; to: string } | null>(null);

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
    const ps = usePlayer.getState();
    const [cx, cz] = ps.characterPos ?? [0, 0];
    initPresence(uid, name || "Player", ps.lookId, placeId, cx, cz, ps.characterFacing ?? 0);
    return () => { void clearPresence(uid); };
  }, [uid, name, soloMode]);

  // Heartbeat: an idle player writes nothing, so without this everyone else drops them after
  // a while. It also puts the player back if a network blip removed them (onDisconnect).
  useEffect(() => {
    if (!uid || soloMode) return;
    const id = setInterval(() => {
      const ps = usePlayer.getState();
      const [cx, cz] = ps.characterPos ?? [0, 0];
      void updatePresence(uid, {
        uid,
        name: ps.name || "Player",
        lookId: ps.lookId,
        placeId: ps.placeId,
        x: cx,
        z: cz,
        ry: ps.characterFacing ?? 0,
      });
    }, 15_000);
    return () => clearInterval(id);
  }, [uid, soloMode]);

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
      toast(`Welcome, ${name}!`, "success", "🎉");
    }, 600);
    return () => clearTimeout(t);
  }, [name]);

  // Daily reward check on mount (Africa/Lagos day)
  useEffect(() => {
    if (!idToken) return;
    const today = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10);
    const lastClaim = usePlayer.getState().dailyLastClaim;
    if (lastClaim === today) return;
    // Try to claim daily reward
    (async () => {
      const r = await apiFetch("/api/daily", { method: "POST", idToken });
      if (r.ok && r.data?.ok) {
        setTimeout(() => {
          toast(`Alert don enter! Daily reward: ₦${r.data.reward.toLocaleString()} (Day ${r.data.streak}/7)`, "success", "💰");
          sfx.play("cashEarn");
        }, 1500);
      }
    })();
  }, [idToken]);

  // Solo mode banner
  useEffect(() => {
    if (soloMode) {
      toast("Offline mode — chat + multiplayer disabled. Check your connection.", "warn", "📡");
    }
  }, [soloMode]);

  // Character arrival → just a small tappable chip at the bottom. It used to open the big place
  // sheet by itself every time you arrived, which covered the whole screen. Now you choose.
  const [arrivedAt, setArrivedAt] = useState<string | null>(null);
  useEffect(() => {
    if (!arrivedAt) return;
    const t = window.setTimeout(() => setArrivedAt(null), 7000);
    return () => window.clearTimeout(t);
  }, [arrivedAt]);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { placeId: string };
      setSheetPlaceId(detail.placeId);
      setPlace(detail.placeId);
      setTargetPlaceId(null);
      setArrivedAt(detail.placeId);
      sfx.play("arrive");
      // Auto-enter building after arrival (places with interiors)
      if (detail.placeId === "home") {
        setTimeout(() => setInterior("home"), 600);
      } else if (detail.placeId === "transcorp" || detail.placeId === "magicland") {
        setTimeout(() => setInterior("owambe"), 600);
      }
    };
    window.addEventListener("naijalavish:arrive", handler as EventListener);
    return () => window.removeEventListener("naijalavish:arrive", handler as EventListener);
  }, [setPlace]);

  // Enter / Exit interior events (from PlaceSheet buttons)
  useEffect(() => {
    const enterHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { placeId: string };
      if (detail.placeId === "home") {
        setInterior("home");
        setSheet(null);
      } else if (detail.placeId === "transcorp" || detail.placeId === "magicland") {
        setInterior("owambe");
        setSheet(null);
      }
    };
    const exitHandler = () => {
      setInterior(null);
    };
    window.addEventListener("naijalavish:enter-interior", enterHandler as EventListener);
    window.addEventListener("naijalavish:exit-interior", exitHandler as EventListener);
    return () => {
      window.removeEventListener("naijalavish:enter-interior", enterHandler as EventListener);
      window.removeEventListener("naijalavish:exit-interior", exitHandler as EventListener);
    };
  }, []);

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
    // Trigger ride overlay (from current place → destination)
    const fromPlace = usePlayer.getState().placeId;
    if (fromPlace && fromPlace !== id) {
      setRide({ from: fromPlace, to: id });
    } else {
      setTargetPlaceId(id);
    }
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
      {modelsReady ? (
        <Scene3D targetPlaceId={targetPlaceId} interior={interior} />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="dot" style={{ width: 12, height: 12 }} />
            <p className="text-sm text-foreground/50">Getting your character ready…</p>
          </div>
        </div>
      )}

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

      {arrivedAt && !sheet && !hideUI && PLACE_BY_ID[arrivedAt] && (
        <button
          onClick={() => { setSheetPlaceId(arrivedAt); setSheet("place"); setArrivedAt(null); }}
          className="absolute left-1/2 z-30 flex items-center gap-2 px-4 py-2.5 shadow-lg"
          style={{
            transform: "translateX(-50%)",
            bottom: "calc(88px + env(safe-area-inset-bottom))",
            borderRadius: 999,
            background: "rgba(15,28,22,0.92)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <span>📍</span>
          <span>{PLACE_BY_ID[arrivedAt].name}</span>
          <span style={{ color: "#4ade80" }}>Open →</span>
        </button>
      )}

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

      {/* Virtual Joystick (visible, bottom-left) */}
      {!hideUI && !interior && (
        <VirtualJoystick
          onMove={(dx, dy) => {
            // Dispatch joystick movement to Scene3D
            window.dispatchEvent(new CustomEvent("naijalavish:joystick", { detail: { dx, dy } }));
          }}
          onEnd={() => {
            window.dispatchEvent(new CustomEvent("naijalavish:joystick-end"));
          }}
        />
      )}

      {/* Zoom buttons (bottom-right) */}
      {!hideUI && !interior && (
        <div
          className="fixed right-2 z-20 flex flex-col gap-1"
          style={{ bottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
        >
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("naijalavish:zoom-in"))}
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-gray-600 font-bold"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          >
            +
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("naijalavish:zoom-out"))}
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-gray-600 font-bold"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          >
            −
          </button>
        </div>
      )}

      {hideUI && (
        <button
          onClick={() => setHideUI(false)}
          className="fixed bottom-4 right-4 z-40 panel px-3 py-2 text-xs"
          aria-label="Show UI"
        >
          👁 Show UI
        </button>
      )}

      {/* Exit Interior button — visible when inside an interior */}
      {interior && (
        <button
          onClick={() => {
            sfx.play("click");
            setInterior(null);
          }}
          className="fixed top-3 right-3 z-40 panel px-3 py-2 text-xs font-medium"
          style={{ background: "rgba(15, 28, 22, 0.85)", color: "#fff", borderRadius: 999 }}
        >
          ← Exit to city
        </button>
      )}

      {/* Ride Overlay — shows when traveling */}
      {ride && (
        <RideOverlay
          fromPlaceId={ride.from}
          toPlaceId={ride.to}
          onArrive={() => {
            setRide(null);
            setTargetPlaceId(ride.to);
          }}
          onCancel={() => setRide(null)}
        />
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
