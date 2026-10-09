"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../store/useAuth";
import { usePlayer, activeLook } from "../store/usePlayer";
import { NPCS } from "../data/npcs";
import { ITEMS, ITEM_BY_ID } from "../data/items";
import { naira, shortNaira } from "../lib/format";
import { toast } from "../store/useToasts";
import { sfx } from "../lib/sound";
import { apiFetch } from "../lib/apiFetch";
import { listenToChat, sendChatMessage, type ChatDoc } from "@/lib/firestore";

type App = "gist" | "bank" | "wallet" | "photos" | "contacts" | "settings" | "shop";

const APPS: Array<{ id: App; label: string; emoji: string; color: string; badge?: string }> = [
  { id: "gist", label: "Gist", emoji: "💬", color: "#22c55e" },
  { id: "bank", label: "Bank", emoji: "🏦", color: "#3b82f6" },
  { id: "wallet", label: "Wallet", emoji: "💰", color: "#f59e0b" },
  { id: "shop", label: "Boutique", emoji: "🛍️", color: "#d946ef" },
  { id: "photos", label: "Photos", emoji: "📷", color: "#ef4444" },
  { id: "contacts", label: "Contacts", emoji: "👥", color: "#6366f1" },
  { id: "settings", label: "Settings", emoji: "⚙️", color: "#64748b" },
];

export default function Phone({ onClose }: { onClose: () => void }) {
  const [app, setApp] = useState<App | null>(null);
  const name = usePlayer((s) => s.name);
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });

  return (
    <motion.div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        marginLeft: "auto",
        marginRight: "auto",
        width: "min(400px, 100vw)",
        maxHeight: "88dvh",
        overflowY: "auto",
        background: "#0a0a0a",
        color: "#fff",
        borderRadius: "28px 28px 0 0",
        paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
        boxShadow: "0 -4px 30px rgba(0,0,0,0.3)",
        zIndex: 35,
      }}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
    >
      {/* Dynamic Island style top */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[11px] font-semibold tabnum">{time}</span>
        <div style={{ width: 60, height: 18, background: "#000", borderRadius: 999, margin: "0 auto" }} />
        <span className="text-[11px] opacity-60">4G 🔋</span>
      </div>

      {/* Close button */}
      <button
        onClick={() => { sfx.play("click"); onClose(); }}
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full"
        style={{ background: "rgba(255,255,255,0.15)" }}
        aria-label="Close phone"
      >
        ✕
      </button>

      <AnimatePresence mode="wait">
        {app === null ? (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Clock widget */}
            <div className="text-center py-4 px-4">
              <div style={{ fontSize: 42, fontWeight: 700, lineHeight: 1 }}>{time}</div>
              <div className="text-[11px] opacity-60 mt-1">{dateStr} · Abuja</div>
            </div>

            {/* App grid */}
            <div className="grid grid-cols-4 gap-3 px-4 pb-4">
              {APPS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { sfx.play("click"); setApp(a.id); }}
                  className="flex flex-col items-center gap-1"
                >
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: a.color,
                      fontSize: 22,
                    }}
                  >
                    {a.emoji}
                  </span>
                  <span className="text-[9px] opacity-70">{a.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={app}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="px-3 pt-2 pb-4"
          >
            <button
              className="text-white/50 text-xs mb-3 hover:text-white"
              onClick={() => { sfx.play("click"); setApp(null); }}
            >
              ← Back
            </button>
            <PhoneApp app={app} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PhoneApp({ app }: { app: App }) {
  switch (app) {
    case "gist": return <GistApp />;
    case "bank": return <BankApp />;
    case "wallet": return <WalletApp />;
    case "shop": return <ShopApp />;
    case "photos": return <PhotosApp />;
    case "contacts": return <ContactsApp />;
    case "settings": return <SettingsApp />;
  }
}

function GistApp() {
  const uid = useAuth((s) => s.uid);
  const idToken = useAuth((s) => s.idToken);
  const placeId = usePlayer((s) => s.placeId);
  const [messages, setMessages] = useState<ChatDoc[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = listenToChat((msgs) => {
      setMessages(msgs);
      setConnected(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  async function send() {
    if (!idToken || !input.trim() || sending) return;
    setSending(true);
    setInput("");
    const res = await sendChatMessage(idToken, input, placeId);
    if (!res.ok) toast(res.error || "Failed to send.", "warn");
    setSending(false);
  }

  return (
    <div>
      <h3 className="font-semibold text-white mb-2">Gist</h3>
      {connected && (
        <div className="text-[10px] text-white/40 mb-2 flex items-center gap-1">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
          Live · {messages.length} messages
        </div>
      )}
      <div
        ref={logRef}
        className="rounded-xl bg-white/5 p-2 mb-2 overflow-y-auto no-scrollbar"
        style={{ maxHeight: 200, minHeight: 100 }}
      >
        {messages.length === 0 ? (
          <p className="text-[11px] text-white/40 text-center py-4">
            No gist yet. Be the first to say something!
          </p>
        ) : (
          <ol className="flex flex-col gap-1">
            {messages.slice(-30).map((m) => (
              <li key={m.id} className={`flex ${m.uid === uid ? "justify-end" : ""}`}>
                <div
                  className={`text-[11px] rounded-lg px-2 py-1 max-w-[80%] ${
                    m.uid === uid ? "bg-emerald-500 text-white" : "bg-white/10 text-white"
                  }`}
                >
                  {m.uid !== uid && <span className="font-semibold mr-1">{m.name}:</span>}
                  {m.text}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-center gap-1.5"
      >
        <input
          type="text"
          maxLength={200}
          placeholder="Say something..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!idToken || sending}
          className="flex-1 bg-white/5 text-white text-xs px-2 py-1.5 rounded-lg outline-none"
        />
        <button
          type="submit"
          disabled={!idToken || sending || !input.trim()}
          className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium disabled:opacity-50"
        >
          ↑
        </button>
      </form>
    </div>
  );
}

function BankApp() {
  const cash = usePlayer((s) => s.cash);
  const bank = usePlayer((s) => s.bank);
  const applyActionResult = usePlayer((s) => s.applyActionResult);
  const earnedTotal = usePlayer((s) => s.earnedTotal);
  const spentTotal = usePlayer((s) => s.spentTotal);
  const dailyStreak = usePlayer((s) => s.dailyStreak);
  const idToken = useAuth((s) => s.idToken);
  const [amount, setAmount] = useState(1000);
  const [busy, setBusy] = useState(false);

  async function callBank(actionId: "deposit" | "withdraw") {
    if (!idToken || busy || amount <= 0) return;
    setBusy(true);
    const r = await apiFetch("/api/action", {
      method: "POST",
      body: { action: "bank", actionId, amount },
      idToken,
    });
    setBusy(false);
    if (!r.ok || !r.data?.ok) {
      toast(r.error || "Bank failed.", "warn", "💸");
      return;
    }
    applyActionResult(r.data.result);
    toast(actionId === "deposit" ? `Deposited ${naira(amount)}.` : `Withdrew ${naira(amount)}.`, "success", actionId === "deposit" ? "🏦" : "💵");
    sfx.play(actionId === "deposit" ? "cashSpend" : "cashEarn");
  }

  return (
    <div>
      <h3 className="font-semibold text-white mb-2">NaijaLavish Bank</h3>
      <div className="rounded-xl bg-white/5 p-3 mb-3">
        <div className="text-[11px] text-white/50">Bank balance</div>
        <div className="text-2xl font-bold tabnum text-white">{naira(bank)}</div>
        <div className="text-[11px] text-white/40 mt-1">Wallet: {naira(cash)}</div>
      </div>
      <div className="rounded-xl bg-white/5 p-3 mb-3">
        <div className="text-[11px] text-white/50">Lifetime</div>
        <div className="flex justify-between text-xs text-white/80">
          <span>Earned: {shortNaira(earnedTotal)}</span>
          <span>Spent: {shortNaira(spentTotal)}</span>
        </div>
      </div>
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 mb-3">
        <div className="text-[11px] text-amber-300/80 mb-1">🔥 Daily streak</div>
        <div className="flex items-center gap-2">
          <b className="text-xl text-white tabnum">{dailyStreak || 0}<span className="text-sm text-white/50">/7</span></b>
        </div>
        <div className="flex gap-1 mt-2">
          {[1,2,3,4,5,6,7].map(d => (
            <div key={d} className={`flex-1 h-1 rounded-full ${(dailyStreak||0) >= d ? "bg-amber-400" : "bg-white/10"}`} />
          ))}
        </div>
      </div>
      <label className="block text-[11px] text-white/60 mb-1">Amount (₦)</label>
      <div className="flex gap-1 mb-2">
        {[500, 1000, 5000, 10000].map(amt => (
          <button key={amt} onClick={() => setAmount(amt)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${amount === amt ? "bg-emerald-500 text-white" : "bg-white/5 text-white/70"}`}>
            {shortNaira(amt)}
          </button>
        ))}
      </div>
      <input type="number" value={amount}
        onChange={e => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
        className="w-full px-3 py-2 rounded-lg bg-white/5 text-white text-sm mb-3 outline-none" />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => callBank("deposit")} disabled={busy}
          className="py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium disabled:opacity-50">Deposit</button>
        <button onClick={() => callBank("withdraw")} disabled={busy}
          className="py-2.5 rounded-lg bg-white/10 text-white text-sm font-medium disabled:opacity-50">Withdraw</button>
      </div>
    </div>
  );
}

function WalletApp() {
  const cash = usePlayer((s) => s.cash);
  const bank = usePlayer((s) => s.bank);
  const inventory = usePlayer((s) => s.inventory);
  const itemsValue = inventory.reduce((acc, i) => acc + (ITEM_BY_ID[i.id]?.price || 0), 0);
  const netWorth = cash + bank + itemsValue;
  const totalVibeBoost = inventory.filter(i => i.equipped).reduce((acc, i) => acc + (ITEM_BY_ID[i.id]?.vibeBoost || 0), 0);

  return (
    <div>
      <h3 className="font-semibold text-white mb-2">Wallet</h3>
      <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-3 mb-3">
        <div className="text-[11px] text-white/80">Net worth</div>
        <div className="text-2xl font-bold tabnum text-white">{naira(netWorth)}</div>
        <div className="text-[11px] text-white/70 mt-1">Cash {shortNaira(cash)} · Bank {shortNaira(bank)} · Items {shortNaira(itemsValue)}</div>
      </div>
      <div className="rounded-xl bg-white/5 p-3 mb-2">
        <div className="text-[11px] text-white/50 mb-1">Outfit vibe bonus</div>
        <div className="text-lg font-bold text-emerald-400">+{totalVibeBoost} vibe</div>
        <div className="text-[11px] text-white/40 mt-1">From {inventory.filter(i => i.equipped).length} equipped items</div>
      </div>
    </div>
  );
}

function ShopApp() {
  const cash = usePlayer((s) => s.cash);
  const buyItem = usePlayer((s) => s.buyItem);
  const ownsItem = usePlayer((s) => s.ownsItem);
  const equipItem = usePlayer((s) => s.equipItem);
  const applyActionResult = usePlayer((s) => s.applyActionResult);
  const idToken = useAuth((s) => s.idToken);
  const [filter, setFilter] = useState("all");
  const cats = ["all","head","face","neck","wrist","outfit","phone","footwear","vehicle","home"];
  const filtered = filter === "all" ? ITEMS : ITEMS.filter(i => i.category === filter);

  return (
    <div>
      <h3 className="font-semibold text-white mb-2">Boutique</h3>
      <div className="text-[11px] text-white/50 mb-2">Wallet: {naira(cash)}</div>
      <div className="flex gap-1 overflow-x-auto no-scrollbar mb-3 -mx-1 px-1">
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`flex-none px-2.5 py-1 rounded-full text-[11px] font-medium ${filter === c ? "bg-emerald-500 text-white" : "bg-white/5 text-white/70"}`}>
            {c}
          </button>
        ))}
      </div>
      <div className="max-h-[50vh] overflow-y-auto no-scrollbar">
        <ul className="flex flex-col gap-1.5">
          {filtered.map(item => {
            const owned = ownsItem(item.id);
            const canAfford = cash >= item.price;
            return (
              <li key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                <span className="text-xl">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{item.name}</div>
                  {item.vibeBoost && <div className="text-[10px] text-emerald-400">+{item.vibeBoost} vibe</div>}
                </div>
                {owned ? (
                  <button onClick={() => { sfx.play("click"); equipItem(item.id); toast("Equipped!", "success"); }}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-[11px] font-medium">Equip</button>
                ) : (
                  <button
                    onClick={async () => {
                      if (!idToken) return;
                      const r = await apiFetch("/api/action", {
                        method: "POST",
                        body: { action: "buy-item", actionId: "buy-item", itemId: item.id, itemPrice: item.price, placeId: "boutique" },
                        idToken,
                      });
                      if (r.ok && r.data?.ok) {
                        applyActionResult(r.data.result);
                        toast(`Bought ${item.name}!`, "success");
                        sfx.play("cashSpend");
                      } else {
                        toast(r.error || "Not enough cash.", "warn");
                      }
                    }}
                    disabled={!canAfford}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium disabled:opacity-50"
                    style={{ background: canAfford ? "var(--primary)" : "rgba(255,255,255,0.1)", color: canAfford ? "white" : "rgba(255,255,255,0.5)" }}>
                    {naira(item.price)}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function PhotosApp() {
  const name = usePlayer((s) => s.name);
  const inventory = usePlayer((s) => s.inventory);
  const cash = usePlayer((s) => s.cash);
  const vibe = usePlayer((s) => s.vibe);
  const energy = usePlayer((s) => s.energy);
  const hunger = usePlayer((s) => s.hunger);

  return (
    <div>
      <h3 className="font-semibold text-white mb-2">Photos</h3>
      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 p-4 mb-2">
        <div className="text-white/70 text-[11px] mb-1">Your Lavish Card</div>
        <div className="text-2xl font-bold text-white">{name || "Guest"}</div>
        <div className="flex justify-between mt-3 text-white">
          <div><div className="text-[10px] opacity-70">Wallet</div><div className="font-bold tabnum">{naira(cash)}</div></div>
          <div><div className="text-[10px] opacity-70">Vibe</div><div className="font-bold tabnum">{Math.round(vibe)}/100</div></div>
        </div>
        <div className="flex justify-between mt-2 text-white/80 text-[11px]">
          <span>⚡ {Math.round(energy)}</span><span>🍽️ {Math.round(hunger)}</span><span>🎒 {inventory.length}</span>
        </div>
      </div>
    </div>
  );
}

function ContactsApp() {
  const uid = useAuth((s) => s.uid);
  const name = usePlayer((s) => s.name);

  async function inviteToHouse() {
    sfx.play("click");
    const url = `${window.location.origin}/?house=${uid}`;
    const shareData = { title: "NaijaLavish — come to my house!", text: `Hey! I'm ${name}. Come hang out at my house 🏠`, url };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(url); toast("Link copied!", "success", "📋"); }
    } catch {}
  }

  return (
    <div>
      <h3 className="font-semibold text-white mb-2">Contacts</h3>
      <button onClick={inviteToHouse}
        className="w-full mb-3 p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium flex items-center gap-2">
        🏠 Invite friends to my house
      </button>
      <div className="text-[11px] text-white/50 mb-3">People you've met</div>
      <ul className="flex flex-col gap-1">
        {NPCS.slice(0, 12).map(n => (
          <li key={n.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
            <span className="text-xl">{n.emoji}</span>
            <div className="flex-1">
              <div className="text-sm text-white font-medium">{n.name}</div>
              <div className="text-[10px] text-white/40 capitalize">{n.vibe}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsApp() {
  const name = usePlayer((s) => s.name);
  const username = usePlayer((s) => s.username);
  const isGuest = usePlayer((s) => s.isGuest);
  const createdAt = usePlayer((s) => s.createdAt);
  const logout = usePlayer((s) => s.logout);
  const setScreen = usePlayer((s) => s.setScreen);
  const signOut = useAuth((s) => s.signOut);

  return (
    <div>
      <h3 className="font-semibold text-white mb-2">Settings</h3>
      <div className="rounded-xl bg-white/5 p-3 mb-3">
        <div className="text-xs text-white/50">Display name</div>
        <div className="text-base font-semibold text-white">{name}</div>
        {username && <div className="text-xs text-white/40 mt-1">@{username}</div>}
        <div className="text-[11px] text-white/40 mt-2">
          {isGuest ? "Guest" : "Account"} · joined {createdAt ? new Date(createdAt).toLocaleDateString() : "—"}
        </div>
      </div>
      <div className="rounded-xl bg-white/5 p-3 mb-3">
        <div className="text-xs text-white/50 mb-1">About</div>
        <p className="text-[11px] text-white/70 leading-relaxed">
          A free life game set in Abuja, Nigeria. Hustle, ride, link up and spray money at the owambe. Ages 18+.
        </p>
      </div>
      <button
        onClick={async () => { if (confirm("Log out?")) { await signOut(); logout(); setScreen("landing"); } }}
        className="w-full py-2.5 rounded-lg bg-red-500/20 text-red-300 text-sm font-medium">Log out</button>
      <div className="text-[10px] text-white/30 text-center mt-3">NaijaLavish v2.0 · Made with love for Naija 🇳🇬</div>
    </div>
  );
}
