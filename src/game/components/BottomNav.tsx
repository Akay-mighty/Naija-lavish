"use client";

interface BottomNavProps {
  active: "home" | "map" | "people" | "phone" | "hide";
  onNav: (id: "home" | "map" | "people" | "phone" | "hide") => void;
}

const LABELS: Record<BottomNavProps["active"], string> = {
  home: "Home",
  map: "Map",
  people: "People",
  phone: "Phone",
  hide: "Hide",
};

const ICONS: Record<BottomNavProps["active"], string> = {
  home: "🏠",
  map: "🗺️",
  people: "👥",
  phone: "📱",
  hide: "👁️",
};

export default function BottomNav({ active, onNav }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex justify-center px-3 pb-[max(8px,env(safe-area-inset-bottom))]"
      aria-label="Main navigation"
    >
      <div
        className="flex items-stretch justify-around gap-1 px-2 py-1.5"
        style={{
          background: "white",
          borderRadius: 999,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          border: "1px solid rgba(0,0,0,0.06)",
          maxWidth: 360,
          width: "100%",
        }}
      >
        {(Object.keys(LABELS) as BottomNavProps["active"][]).map((id) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNav(id)}
              className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 transition"
              style={{
                background: isActive ? "#00875a" : "transparent",
                borderRadius: 999,
                color: isActive ? "white" : "#666",
              }}
              aria-label={LABELS[id]}
              aria-pressed={isActive}
            >
              <span style={{ fontSize: 18 }}>{ICONS[id]}</span>
              <span
                className="text-[9px] font-medium"
                style={{ color: isActive ? "white" : "#999" }}
              >
                {LABELS[id]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
