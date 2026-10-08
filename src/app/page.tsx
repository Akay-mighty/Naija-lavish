"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePlayer } from "@/game/store/usePlayer";
import { useAuth } from "@/game/store/useAuth";
import Landing from "@/game/components/Landing";
import TitleScreen from "@/game/components/TitleScreen";
import Game from "@/game/components/Game";
import AdminDashboard from "@/game/components/AdminDashboard";

function Splash() {
  return (
    <main
      className="min-h-screen w-full grid place-items-center"
      style={{ background: "linear-gradient(180deg, #f8faf8 0%, #eef7f1 100%)" }}
    >
      <div className="flex flex-col items-center gap-3">
        <svg width={56} height={56} viewBox="0 0 64 64" aria-hidden="true">
          <defs>
            <clipPath id="splash-clip"><rect width="64" height="64" rx="17" /></clipPath>
          </defs>
          <g clipPath="url(#splash-clip)">
            <rect width="64" height="64" fill="#00875a" />
            <text x="32" y="40" textAnchor="middle" fontFamily="Poppins" fontWeight="700" fontSize="32" fill="#fff">₦</text>
          </g>
        </svg>
        <div className="dot" />
      </div>
    </main>
  );
}

function AppContent() {
  const sp = useSearchParams();
  const isAdmin = sp.get("admin") === "1";
  const screen = usePlayer((s) => s.screen);
  const hydrate = usePlayer.persist.hasHydrated();
  const authStatus = useAuth((s) => s.status);
  const uid = useAuth((s) => s.uid);
  const isPlayer = useAuth((s) => s.isPlayer);

  // Auto-route returning authenticated players (Google or anon with profile) straight to game
  useEffect(() => {
    if (uid && isPlayer && screen === "landing") {
      usePlayer.setState({ screen: "game" });
    }
  }, [uid, isPlayer, screen]);

  // Re-hydrate on focus
  useEffect(() => {
    const onFocus = () => usePlayer.persist.rehydrate();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // In-app back navigation: when user presses hardware/browser Back button,
  // intercept it and route to the previous in-app screen instead of exiting.
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const cur = usePlayer.getState();
      if (cur.screen === "game") {
        // From game → go to title (not exit site)
        usePlayer.setState({ screen: "title" });
        // Push state again so back button keeps working
        window.history.pushState({ app: "title" }, "");
      } else if (cur.screen === "title") {
        // From title → go to landing
        usePlayer.setState({ screen: "landing" });
        window.history.pushState({ app: "landing" }, "");
      } else {
        // On landing — allow normal back (exit site)
      }
    };
    // Push an initial state so we have something to pop
    window.history.pushState({ app: "init" }, "");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Push history state when screen changes (so back button works in-app)
  useEffect(() => {
    if (screen === "game" || screen === "title") {
      window.history.pushState({ app: screen }, "");
    }
  }, [screen]);

  // Admin route: bypass game entirely
  if (isAdmin) return <AdminDashboard />;

  if (!hydrate || authStatus === "loading") return <Splash />;

  // If we have a uid AND a player profile exists, go straight to game
  if (uid && authStatus === "player" && screen === "game") return <Game />;
  if (screen === "landing") return <Landing />;
  if (screen === "title")  return <TitleScreen />;
  if (screen === "game" && (uid || authStatus === "anon")) return <Game />;
  return <Landing />;
}

export default function Home() {
  return (
    <Suspense fallback={<Splash />}>
      <AppContent />
    </Suspense>
  );
}
