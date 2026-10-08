"use client";

import { motion } from "framer-motion";
import { usePlayer } from "../store/usePlayer";

// Brand logo (mini SVG: round-corner square with Naija-green + a "N₦" mark)
function Logo({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <defs>
        <clipPath id="logo-clip-nl">
          <rect width="64" height="64" rx="17" />
        </clipPath>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00b86b" />
          <stop offset="100%" stopColor="#00875a" />
        </linearGradient>
      </defs>
      <g clipPath="url(#logo-clip-nl)">
        <rect width="64" height="64" fill="url(#logo-grad)" />
        {/* subtle hills */}
        <path
          d="M0 49c8-4 13 4 21 0s13-4 21 0 14 4 22 0v15H0z"
          fill="#0a6c45"
        />
        {/* naira glyph mark */}
        <text
          x="32"
          y="40"
          textAnchor="middle"
          fontFamily="Poppins, system-ui, sans-serif"
          fontWeight="700"
          fontSize="32"
          fill="#ffffff"
        >
          ₦
        </text>
      </g>
    </svg>
  );
}

export default function Landing() {
  const setScreen = usePlayer((s) => s.setScreen);
  const hasAccount = usePlayer(
    (s) => s.name && (s.username || s.isGuest)
  );

  return (
    <main
      className="min-h-screen w-full flex flex-col items-stretch"
      style={{ background: "linear-gradient(180deg, #f8faf8 0%, #eef7f1 100%)" }}
    >
      {/* Top bar */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <span className="text-lg font-bold tracking-tight">
            Naija<span className="text-primary">Lavish</span>
          </span>
        </div>
        <nav className="flex items-center gap-2">
          <a
            href="#features"
            className="hidden sm:inline-flex px-3 py-2 text-sm text-foreground/70 hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#places"
            className="hidden sm:inline-flex px-3 py-2 text-sm text-foreground/70 hover:text-foreground"
          >
            Places
          </a>
          <button
            onClick={() => setScreen("title")}
            className="px-4 py-2 rounded-full text-sm font-medium bg-foreground text-background hover:opacity-90 transition"
          >
            Play
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 w-full max-w-6xl mx-auto px-5 pt-6 pb-12 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 mb-6"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <span className="dot" /> Free to play · Ages 18+
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05] max-w-3xl"
        >
          Abuja, your way.<br />
          <span className="text-primary">Hustle. Flex. Spray.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="mt-5 text-base sm:text-lg text-foreground/70 max-w-xl"
        >
          A free multiplayer life game set in Abuja, Nigeria. Roast bole at
          Wuse Market, ride okada at Area 1, spray money at the owambe. Own
          your house, buy your G-Wagon, top the rich list.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-7 flex flex-col sm:flex-row gap-3 w-full max-w-md"
        >
          <button
            onClick={() => {
              if (hasAccount) {
                usePlayer.getState().setScreen("game");
              } else {
                setScreen("title");
              }
            }}
            className="big-btn"
            style={{ fontSize: 17, padding: "16px 24px" }}
          >
            {hasAccount ? "Continue playing →" : "Play free →"}
          </button>
          <a
            href="#features"
            className="big-btn plain"
            style={{ fontSize: 17, padding: "16px 24px" }}
          >
            See what's inside
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-4 text-xs text-foreground/50"
        >
          No download. Plays in your browser. Saves to your device.
        </motion.p>

        {/* Hero illustration: simple isometric illustration of the city */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-10 w-full max-w-3xl aspect-[16/9] rounded-2xl overflow-hidden relative panel"
          style={{
            background:
              "linear-gradient(135deg, #e3f4ea 0%, #d4ecf7 60%, #fbe7c8 100%)",
          }}
        >
          <CityIllustration />
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="w-full max-w-6xl mx-auto px-5 py-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">
          Everything Abuja dey offer — in one game.
        </h2>
        <p className="text-center text-foreground/60 mb-10 max-w-xl mx-auto">
          Eight core loops, all live in your browser. Pick up your phone,
          walk the city, build your stack.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: " hustle", title: "Hustle", body: "Roast bole, ride okada, work office shifts. Real jobs, real ₦.", emoji: "💪" },
            { icon: " flex", title: "Flex", body: "Buy shades, gold chain, G-Wagon. Outfit matters, always.", emoji: "👑" },
            { icon: " owambe", title: "Owambe", body: "Spray money at the dance floor, top the rich list.", emoji: "🎉" },
            { icon: " home", title: "House & Car", body: "From face-me-I-face-you to Aso Drive villa.", emoji: "🏡" },
            { icon: " phone", title: "Phone", body: "Gist, bank, wallet, photos, contacts — like the real thing.", emoji: "📱" },
            { icon: " chat", title: "Talk", body: "Chat with the city. Quick lines, stickers, reactions.", emoji: "💬" },
            { icon: " map", title: "Map", body: "Tap-to-walk 3D Abuja: Wuse, Garki, Maitama, Jabi.", emoji: "🗺️" },
            { icon: " sleep", title: "Rest", body: "Sleep to recover energy, sit at Jabi Lake to clear vibe.", emoji: "😴" },
          ].map((f) => (
            <div
              key={f.title}
              className="panel p-4 hover:-translate-y-0.5 transition"
            >
              <div className="text-2xl mb-2">{f.emoji}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-foreground/60 leading-snug">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Places preview */}
      <section id="places" className="w-full max-w-6xl mx-auto px-5 py-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">
          Real Abuja places you can walk into.
        </h2>
        <p className="text-center text-foreground/60 mb-10 max-w-xl mx-auto">
          Each marker on the map is a place with its own people, hustle,
          and flavour.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { name: "Wuse Market", cat: "Market", desc: "Bole, ankara, phone accessories, haggling voices.", c: "#10b981" },
            { name: "Area 1 Junction", cat: "Hustle", desc: "Okada riders, danfo conductors, the heartbeat of Garki.", c: "#f59e0b" },
            { name: "Maitama Towers", cat: "Office", desc: "Glass towers, banks, embassies. Big-boy money.", c: "#6366f1" },
            { name: "Transcorp Hilton", cat: "Owambe", desc: "Marble lobby, jazz, dance floor. Spray your naira.", c: "#d946ef" },
            { name: "Jabi Lake", cat: "Rest", desc: "Paddle boats, promenade, calm water at sunset.", c: "#0ea5e9" },
            { name: "Millennium Park", cat: "Rest", desc: "Free green lawns, suya sellers, kids playing.", c: "#22c55e" },
          ].map((p) => (
            <div key={p.name} className="panel p-5 hover:shadow-lift transition">
              <div
                className="w-8 h-8 rounded-lg mb-3"
                style={{ background: p.c }}
              />
              <span className="text-xs uppercase tracking-wide text-foreground/40">
                {p.cat}
              </span>
              <h3 className="text-lg font-semibold mt-0.5">{p.name}</h3>
              <p className="text-sm text-foreground/60 mt-1 leading-snug">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="w-full max-w-3xl mx-auto px-5 py-16 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">Your city dey wait.</h2>
        <p className="text-foreground/60 mb-6 max-w-md mx-auto">
          Pick a name, choose your look, start with ₦5,000 in your pocket.
          See how far you fit go.
        </p>
        <button
          onClick={() => setScreen("title")}
          className="big-btn inline-flex"
          style={{ fontSize: 18, padding: "16px 32px", width: "auto" }}
        >
          Start playing →
        </button>
      </section>

      <footer className="mt-auto w-full max-w-6xl mx-auto px-5 py-8 text-center text-xs text-foreground/40">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Logo size={20} />
          <span>NaijaLavish · Free to play · Ages 18+</span>
        </div>
        <p>
          A multiplayer life game set in Abuja. Be kind — no real money, no
          links, no phone numbers in chat. Made with love for Naija.
        </p>
      </footer>
    </main>
  );
}

function CityIllustration() {
  // Simple SVG city illustration — green field, roads, building blocks
  return (
    <svg viewBox="0 0 800 450" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#fef3c7" />
        </linearGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#sky)" />
      {/* Sun */}
      <circle cx="660" cy="80" r="40" fill="#fde68a" opacity="0.8" />

      {/* Aso Rock silhouette */}
      <path d="M0 220 Q120 110 260 220 L260 300 L0 300 Z" fill="#6b7280" opacity="0.55" />

      {/* Ground */}
      <rect y="280" width="800" height="170" fill="url(#ground)" />

      {/* Roads (cross) */}
      <rect x="0" y="210" width="800" height="22" fill="#1f2937" opacity="0.85" />
      <rect x="380" y="0" width="22" height="450" fill="#1f2937" opacity="0.85" />
      <line x1="0" y1="221" x2="800" y2="221" stroke="#fde68a" strokeWidth="1.5" strokeDasharray="20 14" />
      <line x1="391" y1="0" x2="391" y2="450" stroke="#fde68a" strokeWidth="1.5" strokeDasharray="20 14" />

      {/* Buildings */}
      {[
        { x: 70, y: 100, w: 80, h: 110, c: "#fbbf24" },
        { x: 180, y: 130, w: 70, h: 80, c: "#fb923c" },
        { x: 480, y: 90, w: 90, h: 120, c: "#a78bfa" },
        { x: 600, y: 130, w: 80, h: 80, c: "#f472b6" },
        { x: 290, y: 240, w: 60, h: 40, c: "#f87171" },
        { x: 460, y: 240, w: 60, h: 40, c: "#60a5fa" },
      ].map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={b.c} rx="4" />
          {/* windows */}
          {Array.from({ length: 4 }).map((_, j) => (
            <rect
              key={j}
              x={b.x + 8 + j * 16}
              y={b.y + 8}
              width="8"
              height="10"
              fill="#1f2937"
              opacity="0.6"
            />
          ))}
        </g>
      ))}

      {/* Place markers */}
      {[
        { x: 110, y: 200, c: "#10b981", label: "Wuse Mkt" },
        { x: 410, y: 250, c: "#14b8a6", label: "Unity" },
        { x: 720, y: 200, c: "#d946ef", label: "Hilton" },
        { x: 290, y: 320, c: "#22c55e", label: "Park" },
      ].map((m, i) => (
        <g key={i}>
          <circle cx={m.x} cy={m.y} r="14" fill={m.c} stroke="#fff" strokeWidth="3" />
          <text
            x={m.x}
            y={m.y + 32}
            textAnchor="middle"
            fontSize="11"
            fill="#1f2937"
            fontWeight="600"
            fontFamily="Poppins, system-ui"
          >
            {m.label}
          </text>
        </g>
      ))}

      {/* Player character */}
      <g transform="translate(395, 215)">
        <circle cx="0" cy="-3" r="6" fill="#8b5a3c" />
        <rect x="-5" y="3" width="10" height="12" rx="2" fill="#ef4444" />
        <rect x="-5" y="15" width="4" height="6" fill="#1e3a8a" />
        <rect x="1" y="15" width="4" height="6" fill="#1e3a8a" />
      </g>
    </svg>
  );
}
