"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePlayer } from "@/game/store/usePlayer";
import { useAuth } from "@/game/store/useAuth";
import { go, readRoute, subscribe } from "@/game/lib/nav";
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

/** Signed in AND has a player profile (from the server, or saved on this phone for the same account). */
function canPlay(): boolean {
  const a = useAuth.getState();
  const p = usePlayer.getState();
  return !!a.uid && (a.isPlayer || (p.uid === a.uid && !!p.name));
}

function AppContent() {
  const sp = useSearchParams();
  const isAdmin = sp.get("admin") === "1";
  const screen = usePlayer((s) => s.screen);
  const hydrate = usePlayer.persist.hasHydrated();
  const authReady = useAuth((s) => s.authReady);
  const uid = useAuth((s) => s.uid);

  const bootedRef = useRef(false);
  const [booted, setBooted] = useState(false);

  // 1) BOOT — runs once, after Firebase has restored the saved login.
  //    Returning player  -> straight into the game (Back goes to the landing page).
  //    Everyone else     -> landing / sign-up as the URL says.
  useEffect(() => {
    if (isAdmin || bootedRef.current || !hydrate || !authReady) return;
    bootedRef.current = true;

    const route = readRoute();
    if (canPlay()) {
      if (route.screen === "landing") go({ screen: "game", sheet: null }, "push"); // [landing, game]
      else if (route.screen === "title") go({ screen: "game", sheet: null }, "replace");
      usePlayer.setState({ screen: "game" });
    } else {
      if (route.screen === "game") go({ screen: "landing", sheet: null }, "replace");
      usePlayer.setState({ screen: route.screen === "title" ? "title" : "landing" });
    }
    setBooted(true);
  }, [isAdmin, hydrate, authReady]);

  // 2) KEEP THE URL AND THE SCREEN IN SYNC (so Back / Forward / refresh behave)
  useEffect(() => {
    // screen changed in the app -> update the URL
    const unsubStore = usePlayer.subscribe((s, prev) => {
      if (!bootedRef.current || s.screen === prev.screen) return;
      if (readRoute().screen === s.screen) return; // the URL already says this
      const replace =
        (prev.screen === "title" && s.screen === "game") || // don't let Back return to the sign-up form
        (prev.screen === "game" && s.screen === "landing"); // logout
      go({ screen: s.screen, sheet: null }, replace ? "replace" : "push");
    });

    // URL changed (Back / Forward button) -> update the screen
    const onNav = () => {
      if (!bootedRef.current) return;
      let target = readRoute().screen;
      if (target === "game" && !canPlay()) {
        go({ screen: "landing", sheet: null }, "replace"); // not signed in: can't enter the city
        target = "landing";
      }
      if (usePlayer.getState().screen !== target) usePlayer.setState({ screen: target });
    };
    const unsubNav = subscribe(onNav);

    return () => {
      unsubStore();
      unsubNav();
    };
  }, []);

  // Re-hydrate on focus (another tab may have changed the saved player)
  useEffect(() => {
    const onFocus = () => usePlayer.persist.rehydrate();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Admin route: bypass the game entirely
  if (isAdmin) return <AdminDashboard />;

  // Wait for the saved login to be restored before showing anything (no flash of the landing page)
  if (!hydrate || !authReady || !booted) return <Splash />;

  if (screen === "game" && uid) return <Game />;
  if (screen === "title") return <TitleScreen />;
  return <Landing />;
}

export default function Home() {
  return (
    <Suspense fallback={<Splash />}>
      <AppContent />
    </Suspense>
  );
}
