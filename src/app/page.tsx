"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePlayer } from "@/game/store/usePlayer";
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
            <clipPath id="splash-clip">
              <rect width="64" height="64" rx="17" />
            </clipPath>
          </defs>
          <g clipPath="url(#splash-clip)">
            <rect width="64" height="64" fill="#00875a" />
            <text
              x="32"
              y="40"
              textAnchor="middle"
              fontFamily="Poppins, system-ui"
              fontWeight="700"
              fontSize="32"
              fill="#fff"
            >
              ₦
            </text>
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

  // Re-hydrate on focus (in case localStorage was updated in another tab)
  useEffect(() => {
    const onFocus = () => usePlayer.persist.rehydrate();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Admin route: bypass the game entirely
  if (isAdmin) return <AdminDashboard />;

  if (!hydrate) return <Splash />;
  if (screen === "landing") return <Landing />;
  if (screen === "title")  return <TitleScreen />;
  return <Game />;
}

export default function Home() {
  return (
    <Suspense fallback={<Splash />}>
      <AppContent />
    </Suspense>
  );
}
