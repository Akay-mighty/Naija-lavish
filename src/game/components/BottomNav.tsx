"use client";

import { usePlayer } from "../store/usePlayer";

interface BottomNavProps {
  active: "home" | "map" | "people" | "phone" | "hide";
  onNav: (id: "home" | "map" | "people" | "phone" | "hide") => void;
}

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9v11.5h13V9" />
      <path d="M10 20.5v-6h4v6" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </svg>
  ),
  people: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7 M18.5 14a6.5 6.5 0 0 1 3 6" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2.5" width="12" height="19" rx="3" />
      <path d="M10.5 18.5h3" />
    </svg>
  ),
  hide: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.7 5.6c.4-.1.9-.1 1.3-.1 6.4 0 10 6.5 10 6.5s-1 1.8-2.9 3.6M6.5 6.6C3.7 8.4 2 12 2 12s3.6 6.5 10 6.5c1.8 0 3.4-.5 4.8-1.2" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  ),
};

const LABELS: Record<BottomNavProps["active"], string> = {
  home: "Home",
  map: "Map",
  people: "People",
  phone: "Phone",
  hide: "Hide",
};

export default function BottomNav({ active, onNav }: BottomNavProps) {
  const chatUnread = usePlayer((s) => s.chat.length);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch justify-around px-1 pt-1 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur"
      style={{
        background: "oklch(1 0 0 / 0.86)",
        borderTop: "1px solid var(--border)",
      }}
      aria-label="Main navigation"
    >
      {(Object.keys(LABELS) as BottomNavProps["active"][]).map((id) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onNav(id)}
            className="flex flex-col items-center justify-center gap-0.5 py-1.5 flex-1 transition"
            style={{
              color: isActive ? "var(--primary)" : "var(--ink-3)",
              transform: isActive ? "translateY(-1px)" : "none",
            }}
            aria-label={LABELS[id]}
            aria-pressed={isActive}
          >
            <span
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl transition"
              style={{
                background: isActive ? "var(--primary)" : "transparent",
                color: isActive ? "var(--primary-foreground)" : "currentColor",
              }}
            >
              {ICONS[id]}
            </span>
            <span
              className="text-[10px] font-medium"
              style={{ color: isActive ? "var(--primary)" : "var(--ink-3)" }}
            >
              {LABELS[id]}
            </span>
            {id === "phone" && chatUnread > 0 && (
              <span
                className="absolute top-1 right-[28%] text-[9px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5"
                style={{ minWidth: 14, textAlign: "center" }}
              >
                {chatUnread > 9 ? "9+" : chatUnread}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
