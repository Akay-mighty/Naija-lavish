"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  listenToAllPlayers,
  listenToAdminActions,
  type PlayerProfile,
  type AdminAction,
} from "@/lib/firestore";
import { useAuth } from "@/game/store/useAuth";
import { naira, shortNaira } from "@/game/lib/format";
import { apiFetch } from "@/game/lib/apiFetch";

type Tab = "overview" | "players" | "actions" | "settings";

type PlayerWithId = { id: string } & PlayerProfile;

export default function AdminDashboard() {
  // Firebase Auth-backed admin login
  const isAdmin = useAuth((s) => s.isAdmin);
  const signInAdmin = useAuth((s) => s.signInAdmin);
  const signOut = useAuth((s) => s.signOut);
  const idToken = useAuth((s) => s.idToken);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loggingIn, setLoggingIn] = useState(false);

  const [tab, setTab] = useState<Tab>("overview");
  const [players, setPlayers] = useState<PlayerWithId[]>([]);
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  // Load players + actions in real-time when authed
  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    setFirestoreError(null);

    // `got` is a plain local flag. The old code checked the `loading` state inside the timer,
    // but that value was frozen when the effect started (always true), so the "Can't reach
    // Firestore" banner popped up after 8 seconds even when the players had already loaded.
    let got = false;
    const NOT_REACHED =
      "Can't reach Firestore. Either the Firestore API is not enabled in your Firebase project yet, or your security rules are blocking access. See the Settings tab → 'Enable Firestore' instructions.";

    const timeout = setTimeout(() => {
      if (!got) {
        setFirestoreError(NOT_REACHED);
        setLoading(false);
      }
    }, 8000);

    const unsubPlayers = listenToAllPlayers(
      (p) => {
        got = true;
        clearTimeout(timeout);
        setPlayers(p);
        setLoading(false);
        setFirestoreError(null);
      },
      (err) => {
        if (got) return; // already showing data; a later hiccup should not wipe the list
        clearTimeout(timeout);
        setFirestoreError(
          err?.code === "permission-denied"
            ? "Firestore refused to share the players list. Publish the Firestore rules from FIREBASE_SETUP.md, then reload."
            : NOT_REACHED
        );
        setLoading(false);
      }
    );
    const unsubActions = listenToAdminActions((a) => setActions(a));
    return () => {
      clearTimeout(timeout);
      unsubPlayers();
      unsubActions();
    };
  }, [isAdmin]);

  async function login() {
    setError("");
    setLoggingIn(true);
    const res = await signInAdmin(email.trim().toLowerCase(), password);
    if (!res.ok) setError(res.error || "Login failed.");
    setLoggingIn(false);
  }

  function logout() {
    signOut();
    setTab("overview");
  }

  // ---- Admin actions (call server routes via apiFetch — handles HTML errors) ----
  async function adminAction(player: PlayerWithId, action: string, field?: string, amount?: number) {
    if (!idToken) {
      setError("Not signed in. Please log in again.");
      return;
    }
    setError("");
    const r = await apiFetch(`/api/admin/player/${player.id}`, {
      method: "POST",
      body: { action, field, amount },
      idToken,
    });
    if (!r.ok || !r.data?.ok) {
      setError(r.error || "Action failed.");
    } else {
      // Success — show feedback + refresh player list
      const note = r.data?.result?.note || action;
      setSuccessMsg(`${note} — ${player.name}`);
      // Force refresh by toggling a state
      setRefreshKey((k) => k + 1);
      // Clear success after 3s
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  }

  // ---- Admin action wrappers (call server) ----
  const credit = (p: PlayerWithId, amt: number) => adminAction(p, "credit", undefined, amt);
  const debit = (p: PlayerWithId, amt: number) => adminAction(p, "debit", undefined, amt);
  const setNeed = (p: PlayerWithId, need: "hunger" | "energy" | "vibe", val: number) => adminAction(p, "setNeed", need, val);
  const toggleBan = (p: PlayerWithId) => adminAction(p, p.banned ? "unban" : "ban");
  const resetPlayer = (p: PlayerWithId) => adminAction(p, "reset");

  // ---- Filtered players ----
  const filteredPlayers = useMemo(() => {
    if (!search.trim()) return players;
    const q = search.toLowerCase();
    return players.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.username?.toLowerCase().includes(q) ||
        p.id?.toLowerCase().includes(q)
    );
  }, [players, search]);

  // ---- Stats ----
  const stats = useMemo(() => {
    const totalCash = players.reduce((acc, p) => acc + (p.cash || 0) + (p.bank || 0), 0);
    const activeNow = players.filter((p) => Date.now() - (p.lastSeen || 0) < 5 * 60 * 1000).length;
    const banned = players.filter((p) => p.banned).length;
    return { total: players.length, totalCash, activeNow, banned };
  }, [players]);

  // ---- Login screen ----
  if (!isAdmin) {
    return (
      <main
        className="min-h-screen w-full flex items-center justify-center p-6"
        style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <svg width={40} height={40} viewBox="0 0 64 64" aria-hidden="true">
              <defs>
                <clipPath id="admin-clip">
                  <rect width="64" height="64" rx="17" />
                </clipPath>
                <linearGradient id="admin-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#00b86b" />
                  <stop offset="100%" stopColor="#00875a" />
                </linearGradient>
              </defs>
              <g clipPath="url(#admin-clip)">
                <rect width="64" height="64" fill="url(#admin-grad)" />
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
            <div>
              <h1 className="text-xl font-bold">NaijaLavish Admin</h1>
              <p className="text-xs text-slate-500">Control panel · Dashboard</p>
            </div>
          </div>

          <label className="block mb-3">
            <span className="text-xs font-semibold text-slate-700 block mb-1.5">
              Admin email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              placeholder="admin@naijalavish.com"
              autoComplete="username"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm"
              autoFocus
            />
          </label>

          <label className="block mb-3">
            <span className="text-xs font-semibold text-slate-700 block mb-1.5">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              placeholder="Enter password"
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm"
            />
          </label>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">
              {error}
            </div>
          )}

          <button
            onClick={login}
            disabled={loggingIn}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {loggingIn ? "Loading..." : "Log in →"}
          </button>

          <div className="mt-6 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-[11px] text-amber-800 leading-relaxed">
              <b>Admin login uses Firebase Auth (email/password).</b>
              <br />
              Create an admin user in the Firebase Console → Authentication →
              Add user, then add a doc at <code>admins/{`{uid}`}</code> in Firestore
              with <code>{"{ admin: true }"}</code>.
            </p>
          </div>

          <a
            href="/"
            className="block text-center text-xs text-slate-500 hover:text-slate-700 mt-4 underline underline-offset-4"
          >
            ← Back to game
          </a>
        </motion.div>
      </main>
    );
  }

  // ---- Dashboard ----
  return (
    <main
      className="min-h-screen w-full"
      style={{ background: "#f8fafc", fontFamily: "Poppins, system-ui, sans-serif" }}
    >
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width={32} height={32} viewBox="0 0 64 64" aria-hidden="true">
              <defs>
                <clipPath id="dash-clip">
                  <rect width="64" height="64" rx="17" />
                </clipPath>
                <linearGradient id="dash-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#00b86b" />
                  <stop offset="100%" stopColor="#00875a" />
                </linearGradient>
              </defs>
              <g clipPath="url(#dash-clip)">
                <rect width="64" height="64" fill="url(#dash-grad)" />
                <text x="32" y="40" textAnchor="middle" fontFamily="Poppins" fontWeight="700" fontSize="32" fill="#fff">₦</text>
              </g>
            </svg>
            <div>
              <div className="font-bold text-slate-900 leading-tight">NaijaLavish Admin</div>
              <div className="text-[11px] text-slate-500">Control panel</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="hidden sm:inline-flex px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              View game ↗
            </a>
            <button
              onClick={logout}
              className="px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-56 flex-none">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {([
              { id: "overview", label: "Overview", emoji: "📊" },
              { id: "players", label: "Players", emoji: "👥" },
              { id: "actions", label: "Action log", emoji: "📜" },
              { id: "settings", label: "Settings", emoji: "⚙️" },
            ] as const).map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                  tab === item.id
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="text-base">{item.emoji}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <section className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {tab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <h2 className="text-xl font-bold text-slate-900 mb-1">Overview</h2>
                <p className="text-sm text-slate-500 mb-6">Real-time stats across all NaijaLavish players.</p>

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  <StatCard label="Total players" value={stats.total.toString()} emoji="👥" color="#10b981" />
                  <StatCard label="Active now" value={stats.activeNow.toString()} emoji="🟢" color="#0ea5e9" />
                  <StatCard label="Total cash in game" value={shortNaira(stats.totalCash)} emoji="💰" color="#f59e0b" />
                  <StatCard label="Banned" value={stats.banned.toString()} emoji="🚫" color="#ef4444" />
                </div>

                {/* Recent signups */}
                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white border border-slate-200 p-5">
                    <h3 className="font-semibold text-slate-900 mb-3">Recent players</h3>
                    {loading ? (
                      <p className="text-sm text-slate-400">Loading…</p>
                    ) : players.length === 0 ? (
                      <p className="text-sm text-slate-400">No players yet.</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {players.slice(0, 6).map((p) => (
                          <li key={p.id} className="flex items-center gap-3 text-sm">
                            <span className="flex-none w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                              {(p.name || "?").slice(0, 1).toUpperCase()}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 truncate">
                                {p.name || "Unknown"}
                                {p.username && (
                                  <span className="text-xs text-slate-400 ml-1">@{p.username}</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {p.isGuest ? "Guest" : "Account"} · {naira(p.cash || 0)}
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {timeAgo(p.lastSeen)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-2xl bg-white border border-slate-200 p-5">
                    <h3 className="font-semibold text-slate-900 mb-3">Recent admin actions</h3>
                    {actions.length === 0 ? (
                      <p className="text-sm text-slate-400">No actions logged yet.</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {actions.slice(0, 6).map((a) => (
                          <li key={a.id} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{actionEmoji(a.action)}</span>
                              <span className="font-medium text-slate-900 capitalize">{a.action}</span>
                              <span className="text-xs text-slate-400">→ {a.playerName}</span>
                            </div>
                            {a.note && (
                              <div className="text-[11px] text-slate-500 mt-0.5 ml-7">{a.note}</div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {tab === "players" && (
              <motion.div
                key="players"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <h2 className="text-xl font-bold text-slate-900 mb-1">Players</h2>
                <p className="text-sm text-slate-500 mb-2">
                  Click a player to credit/debit money, set needs, or ban.
                </p>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">
                    ⚠ {error}
                  </div>
                )}
                {successMsg && (
                  <div className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg mb-3">
                    ✅ {successMsg}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Search by name, username, or ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full max-w-md px-4 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm mb-4"
                />

                {loading ? (
                  <p className="text-sm text-slate-400">Loading players…</p>
                ) : firestoreError ? (
                  <FirestoreSetupBanner error={firestoreError} />
                ) : filteredPlayers.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    {players.length === 0 ? "No players yet. Players will appear here when they sign up." : "No matches."}
                  </p>
                ) : (
                  <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold">Name</th>
                            <th className="text-left px-4 py-3 font-semibold">Cash</th>
                            <th className="text-left px-4 py-3 font-semibold">Bank</th>
                            <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Needs</th>
                            <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Last seen</th>
                            <th className="text-left px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPlayers.map((p) => (
                            <>
                              <tr
                                key={p.id}
                                className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                                onClick={() =>
                                  setExpandedPlayer(expandedPlayer === p.id ? null : p.id)
                                }
                              >
                                <td className="px-4 py-3">
                                  <div className="font-medium text-slate-900">
                                    {p.name || "Unknown"}
                                    {p.banned && <span className="ml-2 text-[10px] text-red-600">🚫 BANNED</span>}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {p.username ? `@${p.username}` : p.id}
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-medium tabnum">{naira(p.cash || 0)}</td>
                                <td className="px-4 py-3 tabnum text-slate-600">{naira(p.bank || 0)}</td>
                                <td className="px-4 py-3 hidden sm:table-cell">
                                  <div className="flex gap-2 text-[11px]">
                                    <NeedChip label="🍽️" value={p.hunger} />
                                    <NeedChip label="⚡" value={p.energy} />
                                    <NeedChip label="✨" value={p.vibe} />
                                  </div>
                                </td>
                                <td className="px-4 py-3 hidden sm:table-cell text-[11px] text-slate-400">
                                  {timeAgo(p.lastSeen)}
                                </td>
                                <td className="px-4 py-3">
                                  {Date.now() - (p.lastSeen || 0) < 5 * 60 * 1000 ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                      ● Active
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                      Offline
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-slate-400">
                                  {expandedPlayer === p.id ? "▲" : "▼"}
                                </td>
                              </tr>
                              {expandedPlayer === p.id && (
                                <tr key={p.id + "-expand"} className="bg-slate-50">
                                  <td colSpan={7} className="px-4 py-4">
                                    <PlayerActions
                                      player={p}
                                      onCredit={(amt) => credit(p, amt)}
                                      onDebit={(amt) => debit(p, amt)}
                                      onSetNeed={(need, val) => setNeed(p, need, val)}
                                      onToggleBan={() => toggleBan(p)}
                                      onReset={() => resetPlayer(p)}
                                      onSuspend={(reason) => adminAction(p, "suspend", reason)}
                                      onWarn={(reason) => adminAction(p, "warn", reason)}
                                    />
                                  </td>
                                </tr>
                              )}
                            </>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {tab === "actions" && (
              <motion.div
                key="actions"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <h2 className="text-xl font-bold text-slate-900 mb-1">Action log</h2>
                <p className="text-sm text-slate-500 mb-4">Audit trail of all admin actions.</p>
                {actions.length === 0 ? (
                  <p className="text-sm text-slate-400">No actions logged yet.</p>
                ) : (
                  <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">When</th>
                          <th className="text-left px-4 py-3 font-semibold">Action</th>
                          <th className="text-left px-4 py-3 font-semibold">Player</th>
                          <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Amount</th>
                          <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {actions.map((a) => (
                          <tr key={a.id} className="border-t border-slate-100">
                            <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                              {a.t ? new Date(a.t).toLocaleString() : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5">
                                <span>{actionEmoji(a.action)}</span>
                                <span className="font-medium capitalize text-slate-900">{a.action}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">{a.playerName}</td>
                            <td className="px-4 py-3 tabnum text-slate-600 hidden sm:table-cell">
                              {a.amount ? naira(a.amount) : "—"}
                            </td>
                            <td className="px-4 py-3 text-[11px] text-slate-500 hidden sm:table-cell">
                              {a.note || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

            {tab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <h2 className="text-xl font-bold text-slate-900 mb-1">Settings</h2>
                <p className="text-sm text-slate-500 mb-6">Admin panel configuration & setup notes.</p>

                {/* Firestore setup (most important) */}
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 mb-4">
                  <h3 className="font-semibold text-amber-900 mb-2">⚡ Enable Firestore (one-time setup)</h3>
                  <p className="text-sm text-amber-800 mb-3">
                    Your Firebase project (<code>naijalavish</code>) needs Firestore Database enabled before the
                    admin dashboard can read/write players. Do these steps:
                  </p>
                  <ol className="text-sm text-amber-800 space-y-2 list-decimal list-inside">
                    <li>
                      Go to{" "}
                      <a
                        href="https://console.firebase.google.com/project/naijalavish/firestore"
                        target="_blank"
                        rel="noopener"
                        className="underline font-semibold"
                      >
                        Firebase Console → naijalavish → Firestore Database
                      </a>
                    </li>
                    <li>Click <b>"Create database"</b></li>
                    <li>Choose <b>"Start in production mode"</b> (recommended) or test mode</li>
                    <li>Pick a location (e.g., <code>europe-west1</code> — closest to Africa)</li>
                    <li>Wait ~2 minutes for it to provision</li>
                    <li>Refresh this page — players will appear here</li>
                  </ol>
                  <p className="text-[11px] text-amber-700 mt-3">
                    Already enabled? Check your Firestore Security Rules (below) — they must allow read/write.
                  </p>
                </div>

                {/* Admin credentials */}
                <div className="rounded-2xl bg-white border border-slate-200 p-5 mb-4">
                  <h3 className="font-semibold text-slate-900 mb-2">Admin authentication</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    Admin login uses <b>Firebase Auth (email/password)</b>. The
                    dashboard verifies the ID token server-side and checks that
                    a Firestore doc at <code>admins/{`{uid}`}</code> exists.
                  </p>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs mb-3">
                    <div><span className="text-slate-400">Auth provider:</span> Firebase Email/Password</div>
                    <div><span className="text-slate-400">Admin check:</span> admins/{`{uid}`} doc must exist</div>
                  </div>
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-3 rounded-lg">
                    <b>To grant admin access:</b> Create a user in Firebase Console →
                    Authentication → Add User, then create a Firestore doc at{" "}
                    <code>admins/{`{uid}`}</code> with content <code>{"{ admin: true }"}</code>.
                  </p>
                </div>

                {/* Firebase config */}
                <div className="rounded-2xl bg-white border border-slate-200 p-5 mb-4">
                  <h3 className="font-semibold text-slate-900 mb-2">Firebase config</h3>
                  <pre className="text-[11px] bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto">
{`project:      naijalavish
authDomain:   naijalavish.firebaseapp.com
storageBucket: naijalavish.firebasestorage.app
apiKey:        AIzaSyADIDDptkJkgpOBEn4CfZIDajF1eBWlrXw
appId:         1:925863756982:web:5133ad376f2b2184efd217`}
                  </pre>
                </div>

                {/* Firestore rules */}
                <div className="rounded-2xl bg-white border border-slate-200 p-5">
                  <h3 className="font-semibold text-slate-900 mb-2">Firestore Security Rules</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    Set these in <b>Firebase Console → Firestore → Rules</b>. This MVP config allows all
                    reads/writes — fine for testing, but lock down before going public.
                  </p>
                  <pre className="text-[11px] bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Players can read/write their own doc
    // Admins can read/write all players
    match /players/{playerId} {
      allow read: if true;
      allow write: if true;
    }

    // Admin action log: anyone can read, anyone can write (lock down to admin for prod)
    match /adminActions/{actionId} {
      allow read: if true;
      allow write: if true;
    }
  }
}`}
                  </pre>
                  <p className="text-[11px] text-slate-500 mt-2">
                    To access admin: visit <code>?admin=1</code> in the URL.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StatCard({ label, value, emoji, color }: { label: string; value: string; emoji: string; color: string }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
          style={{ background: color + "20" }}
        >
          {emoji}
        </span>
      </div>
      <div className="text-2xl font-bold text-slate-900 tabnum">{value}</div>
    </div>
  );
}

function NeedChip({ label, value }: { label: string; value: number }) {
  const v = Math.round(value || 0);
  const color = v > 60 ? "text-emerald-600" : v > 30 ? "text-amber-600" : "text-red-600";
  return (
    <span className={`font-semibold ${color}`}>
      {label}{v}
    </span>
  );
}

function PlayerActions({
  player,
  onCredit,
  onDebit,
  onSetNeed,
  onToggleBan,
  onReset,
  onSuspend,
  onWarn,
}: {
  player: PlayerWithId;
  onCredit: (amt: number) => void;
  onDebit: (amt: number) => void;
  onSetNeed: (need: "hunger" | "energy" | "vibe", val: number) => void;
  onToggleBan: () => void;
  onReset: () => void;
  onSuspend: (reason: string) => void;
  onWarn: (reason: string) => void;
}) {
  const [amount, setAmount] = useState(1000);
  const presets = [500, 1000, 5000, 10000, 100000];

  return (
    <div className="flex flex-col gap-4">
      {/* Money controls */}
      <div>
        <div className="text-xs font-semibold text-slate-700 mb-1.5">Money controls</div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  amount === p
                    ? "bg-emerald-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {shortNaira(p)}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-28 px-3 py-1.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => onCredit(amount)}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
          >
            + Credit
          </button>
          <button
            onClick={() => onDebit(amount)}
            className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
          >
            − Debit
          </button>
        </div>
      </div>

      {/* Needs controls */}
      <div>
        <div className="text-xs font-semibold text-slate-700 mb-1.5">Needs (0-100)</div>
        <div className="grid grid-cols-3 gap-3">
          {([
            { key: "hunger" as const, label: "🍽️ Belle", value: player.hunger },
            { key: "energy" as const, label: "⚡ Energy", value: player.energy },
            { key: "vibe" as const, label: "✨ Vibe", value: player.vibe },
          ]).map((n) => (
            <div key={n.key} className="bg-white border border-slate-200 rounded-lg p-2">
              <div className="text-[11px] text-slate-500 mb-1">{n.label}</div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  defaultValue={Math.round(n.value || 0)}
                  className="flex-1 accent-emerald-600"
                  onBlur={(e) => onSetNeed(n.key, parseInt(e.target.value))}
                />
                <span className="text-xs font-semibold tabnum w-7 text-right">
                  {Math.round(n.value || 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
        <button
          onClick={() => {
            if (confirm(`Reset ${player.name}? This sets cash to ₦5,000 and needs to 80/80/70.`)) {
              onReset();
            }
          }}
          className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-semibold hover:bg-amber-200"
        >
          ↻ Reset to defaults
        </button>
        <button
          onClick={() => {
            const reason = prompt(`Warn ${player.name}? Enter reason:`);
            if (reason) onWarn(reason);
          }}
          className="px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 text-xs font-semibold hover:bg-orange-200"
        >
          ⚠ Warn ({(player as any).warnings || 0})
        </button>
        <button
          onClick={() => {
            const reason = prompt(`Suspend ${player.name}? Enter reason:`);
            if (reason) onSuspend(reason);
          }}
          className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 text-xs font-semibold hover:bg-purple-200"
        >
          🔒 Suspend
        </button>
        <button
          onClick={() => {
            if (confirm(`${player.banned ? "Unban" : "Ban"} ${player.name}?`)) {
              onToggleBan();
            }
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            player.banned
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
        >
          {player.banned ? "✓ Unban" : "🚫 Ban"}
        </button>
      </div>

      <div className="text-[11px] text-slate-400">
        Player ID: <code>{player.id}</code> · Created{" "}
        {player.createdAt ? new Date(player.createdAt).toLocaleString() : "—"}
      </div>
    </div>
  );
}

// ---- Helpers ----
function timeAgo(ts: number): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

function actionEmoji(action: string): string {
  switch (action) {
    case "credit": return "💰";
    case "debit":  return "💸";
    case "setNeed": return "⚙️";
    case "ban":    return "🚫";
    case "unban":  return "✅";
    case "reset":  return "↻";
    default:       return "•";
  }
}

function FirestoreSetupBanner({ error }: { error: string }) {
  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-300 p-5 max-w-2xl">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">⚠️</span>
        <div>
          <h3 className="font-bold text-amber-900 mb-1">Can&apos;t reach Firestore</h3>
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      </div>
      <ol className="text-sm text-amber-900 space-y-2 list-decimal list-inside bg-white/50 p-3 rounded-lg">
        <li>
          Open{" "}
          <a
            href="https://console.firebase.google.com/project/naijalavish/firestore"
            target="_blank"
            rel="noopener"
            className="underline font-semibold"
          >
            Firebase Console → naijalavish → Firestore
          </a>
        </li>
        <li>Click <b>&quot;Create database&quot;</b> → choose location → enable</li>
        <li>Wait ~2 minutes, then refresh this page</li>
      </ol>
      <p className="text-[11px] text-amber-700 mt-3">
        Until Firestore is enabled, the game still works (saves to your device only).
        Admin actions (credit/debit/ban) will work after you enable Firestore.
      </p>
    </div>
  );
}
