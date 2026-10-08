"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../store/useAuth";
import { usePlayer, activeLook } from "../store/usePlayer";
import { NPCS } from "../data/npcs";
import { ITEMS, ITEM_BY_ID } from "../data/items";
import { naira, shortNaira } from "../lib/format";
import { toast } from "../store/useToasts";
import { sfx } from "../lib/sound";

type App = "gist" | "bank" | "wallet" | "photos" | "contacts" | "settings" | "shop";

const APPS: Array<{ id: App; label: string; emoji: string; color: string }> = [
  { id: "gist",     label: "Gist",     emoji: "💬", color: "#22c55e" },
  { id: "bank",     label: "Bank",     emoji: "🏦", color: "#0ea5e9" },
  { id: "wallet",   label: "Wallet",   emoji: "💵", color: "#f59e0b" },
  { id: "shop",     label: "Boutique", emoji: "🛍️", color: "#d946ef" },
  { id: "photos",   label: "Photos",   emoji: "📷", color: "#ef4444" },
  { id: "contacts", label: "Contacts", emoji: "👥", color: "#6366f1" },
  { id: "settings", label: "Settings", emoji: "⚙️", color: "#64748b" },
];

export default function Phone({ onClose }: { onClose: () => void }) {
  const [app, setApp] = useState<App | null>(null);
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

  return (
    <motion.div
      className="phone-shell"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 mb-3">
        <span className="text-xs font-semibold tabnum">{time}</span>
        <span className="text-xs text-white/70">NaijaLavish</span>
        <button
          className="text-white/70 hover:text-white text-base px-2"
          onClick={onClose}
          aria-label="Close phone"
        >
          ✕
        </button>
      </div>

      <AnimatePresence mode="wait">
        {app === null ? (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-4 gap-3 px-3"
          >
            {APPS.map((a) => (
              <button
                key={a.id}
                onClick={() => setApp(a.id)}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  className="flex items-center justify-center w-14 h-14 rounded-2xl text-2xl"
                  style={{ background: a.color }}
                >
                  {a.emoji}
                </span>
                <span className="text-[11px] text-white/80">{a.label}</span>
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key={app}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="px-2"
          >
            <button
              className="text-white/70 text-xs mb-3 hover:text-white"
              onClick={() => setApp(null)}
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
    case "gist":
      return <GistApp />;
    case "bank":
      return <BankApp />;
    case "wallet":
      return <WalletApp />;
    case "shop":
      return <ShopApp />;
    case "photos":
      return <PhotosApp />;
    case "contacts":
      return <ContactsApp />;
    case "settings":
      return <SettingsApp />;
  }
}

function GistApp() {
  const chat = usePlayer((s) => s.chat);
  return (
    <div className="max-h-[50vh] overflow-y-auto no-scrollbar">
      <h3 className="font-semibold text-white mb-2">Gist</h3>
      <ul className="flex flex-col gap-1.5">
        {chat.slice(-30).map((m) => (
          <li
            key={m.id}
            className={`flex items-start gap-1.5 ${
              m.who === "me" ? "justify-end" : ""
            }`}
          >
            {m.emoji && <span className="text-sm">{m.emoji}</span>}
            <div
              className={`text-xs leading-snug ${
                m.who === "system"
                  ? "text-white/40 italic"
                  : m.who === "me"
                  ? "text-emerald-300 font-medium"
                  : "text-white/90"
              }`}
            >
              {m.name && (
                <span className="font-semibold text-white/80 mr-1">{m.name}:</span>
              )}
              {m.text}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BankApp() {
  const cash = usePlayer((s) => s.cash);
  const bank = usePlayer((s) => s.bank);
  const applyActionResult = usePlayer((s) => s.applyActionResult);
  const earnedTotal = usePlayer((s) => s.earnedTotal);
  const spentTotal = usePlayer((s) => s.spentTotal);
  const idToken = useAuth((s) => s.idToken);
  const [amount, setAmount] = useState(1000);
  const [busy, setBusy] = useState(false);

  async function callBank(actionId: "deposit" | "withdraw") {
    if (!idToken || busy || amount <= 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ action: "bank", actionId, amount }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast(data.error || "Bank failed.", "warn", "💸");
        return;
      }
      applyActionResult(data.result);
      toast(actionId === "deposit" ? `Deposited ${naira(amount)}.` : `Withdrew ${naira(amount)}.`, "success", actionId === "deposit" ? "🏦" : "💵");
      sfx.play(actionId === "deposit" ? "cashSpend" : "cashEarn");
    } finally {
      setBusy(false);
    }
  }

  function deposit() { void callBank("deposit"); }
  function withdraw() { void callBank("withdraw"); }

  return (
    <div>
      <h3 className="font-semibold text-white mb-2">NaijaLavish Bank</h3>
      <div className="rounded-xl bg-white/5 p-3 mb-3">
        <div className="text-[11px] text-white/50">Bank balance</div>
        <div className="text-2xl font-bold tabnum text-white">
          {naira(bank)}
        </div>
        <div className="text-[11px] text-white/40 mt-1">
          Wallet: {naira(cash)}
        </div>
      </div>
      <div className="rounded-xl bg-white/5 p-3 mb-3">
        <div className="text-[11px] text-white/50">Lifetime</div>
        <div className="flex justify-between text-xs text-white/80">
          <span>Earned: {shortNaira(earnedTotal)}</span>
          <span>Spent: {shortNaira(spentTotal)}</span>
        </div>
      </div>

      <label className="block text-[11px] text-white/60 mb-1">Amount (₦)</label>
      <div className="flex gap-1 mb-2">
        {[500, 1000, 5000, 10000].map((amt) => (
          <button
            key={amt}
            onClick={() => setAmount(amt)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
              amount === amt
                ? "bg-emerald-500 text-white"
                : "bg-white/5 text-white/70"
            }`}
          >
            {shortNaira(amt)}
          </button>
        ))}
      </div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
        className="w-full px-3 py-2 rounded-lg bg-white/5 text-white text-sm mb-3 outline-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={deposit}
          className="py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium"
        >
          Deposit
        </button>
        <button
          onClick={withdraw}
          className="py-2.5 rounded-lg bg-white/10 text-white text-sm font-medium"
        >
          Withdraw
        </button>
      </div>
    </div>
  );
}

function WalletApp() {
  const cash = usePlayer((s) => s.cash);
  const bank = usePlayer((s) => s.bank);
  const inventory = usePlayer((s) => s.inventory);
  const totalVibeBoost = inventory
    .filter((i) => i.equipped)
    .reduce((acc, i) => acc + (ITEM_BY_ID[i.id]?.vibeBoost ?? 0), 0);

  // Net worth
  const itemsValue = inventory.reduce(
    (acc, i) => acc + (ITEM_BY_ID[i.id]?.price ?? 0),
    0
  );
  const netWorth = cash + bank + itemsValue;

  return (
    <div>
      <h3 className="font-semibold text-white mb-2">Wallet</h3>
      <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-3 mb-3">
        <div className="text-[11px] text-white/80">Net worth</div>
        <div className="text-2xl font-bold tabnum text-white">
          {naira(netWorth)}
        </div>
        <div className="text-[11px] text-white/70 mt-1">
          Cash {shortNaira(cash)} · Bank {shortNaira(bank)} · Items{" "}
          {shortNaira(itemsValue)}
        </div>
      </div>
      <div className="rounded-xl bg-white/5 p-3 mb-2">
        <div className="text-[11px] text-white/50 mb-1">Outfit vibe bonus</div>
        <div className="text-lg font-bold text-emerald-400">
          +{totalVibeBoost} vibe
        </div>
        <div className="text-[11px] text-white/40 mt-1">
          From {inventory.filter((i) => i.equipped).length} equipped items
        </div>
      </div>
      <div className="text-[11px] text-white/50 text-center mt-4">
        Use Boutique to buy more flex. Equip at Home → Wardrobe.
      </div>
    </div>
  );
}

function ShopApp() {
  const cash = usePlayer((s) => s.cash);
  const buyItem = usePlayer((s) => s.buyItem);
  const ownsItem = usePlayer((s) => s.ownsItem);
  const equipItem = usePlayer((s) => s.equipItem);
  const [filter, setFilter] = useState<string>("all");

  const cats = ["all", "head", "face", "neck", "wrist", "outfit", "phone", "footwear", "vehicle", "home"];
  const filtered = filter === "all" ? ITEMS : ITEMS.filter((i) => i.category === filter);

  return (
    <div>
      <h3 className="font-semibold text-white mb-2">Boutique</h3>
      <div className="text-[11px] text-white/50 mb-2">Wallet: {naira(cash)}</div>
      <div className="flex gap-1 overflow-x-auto no-scrollbar mb-3 -mx-1 px-1">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`flex-none px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
              filter === c ? "bg-emerald-500 text-white" : "bg-white/5 text-white/70"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="max-h-[50vh] overflow-y-auto no-scrollbar">
        <ul className="flex flex-col gap-1.5">
          {filtered.map((item) => {
            const owned = ownsItem(item.id);
            const canAfford = cash >= item.price;
            return (
              <li
                key={item.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-white/5"
              >
                <span className="text-xl">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">
                    {item.name}
                  </div>
                  {item.vibeBoost && (
                    <div className="text-[10px] text-emerald-400">+{item.vibeBoost} vibe</div>
                  )}
                </div>
                {owned ? (
                  <button
                    onClick={() => {
                      equipItem(item.id);
                      toast(`${item.name} equipped!`, "success");
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-[11px] font-medium"
                  >
                    Equip
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (buyItem(item.id, item.price)) {
                        toast(`Bought ${item.name}!`, "success");
                      } else {
                        toast("Not enough cash.", "warn");
                      }
                    }}
                    disabled={!canAfford}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium disabled:opacity-50"
                    style={{
                      background: canAfford ? "var(--primary)" : "rgba(255,255,255,0.1)",
                      color: canAfford ? "white" : "rgba(255,255,255,0.5)",
                    }}
                  >
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
          <div>
            <div className="text-[10px] opacity-70">Wallet</div>
            <div className="font-bold tabnum">{naira(cash)}</div>
          </div>
          <div>
            <div className="text-[10px] opacity-70">Vibe</div>
            <div className="font-bold tabnum">{Math.round(vibe)}/100</div>
          </div>
        </div>
        <div className="flex justify-between mt-2 text-white/80 text-[11px]">
          <span>Energy {Math.round(energy)}</span>
          <span>Belle {Math.round(hunger)}</span>
          <span>Items {inventory.length}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {["🏛️", "🌳", "🌊", "🏙️", "🍽️", "🎉"].map((emoji, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-white/5 flex items-center justify-center text-2xl"
          >
            {emoji}
          </div>
        ))}
      </div>
      <div className="text-[11px] text-white/40 text-center mt-3">
        Memory album coming soon. For now, your Lavish Card is the flex.
      </div>
    </div>
  );
}

function ContactsApp() {
  return (
    <div>
      <h3 className="font-semibold text-white mb-2">Contacts</h3>
      <div className="text-[11px] text-white/50 mb-3">
        People you've met in Abuja
      </div>
      <ul className="flex flex-col gap-1">
        {NPCS.slice(0, 12).map((n) => (
          <li
            key={n.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-white/5"
          >
            <span className="text-xl">{n.emoji}</span>
            <div className="flex-1">
              <div className="text-sm text-white font-medium">{n.name}</div>
              <div className="text-[10px] text-white/40 capitalize">
                {n.vibe}
              </div>
            </div>
            <button className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[11px] font-medium">
              Gist
            </button>
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
        {username && (
          <div className="text-xs text-white/40 mt-1">@{username}</div>
        )}
        <div className="text-[11px] text-white/40 mt-2">
          {isGuest ? "Guest account" : "Full account"} · joined{" "}
          {createdAt ? new Date(createdAt).toLocaleDateString() : "—"}
        </div>
      </div>
      <div className="rounded-xl bg-white/5 p-3 mb-3">
        <div className="text-xs text-white/50 mb-1">About NaijaLavish</div>
        <p className="text-[11px] text-white/70 leading-relaxed">
          A free life game set in Abuja, Nigeria. Hustle, ride, link up and
          spray money at the owambe. Ages 18+. Be kind — no real money, no
          links, no phone numbers in chat.
        </p>
      </div>
      <button
        onClick={async () => {
          if (confirm("Log out? Your progress syncs to your account.")) {
            await signOut();
            logout();
            setScreen("landing");
          }
        }}
        className="w-full py-2.5 rounded-lg bg-red-500/20 text-red-300 text-sm font-medium"
      >
        Log out
      </button>
      <div className="text-[10px] text-white/30 text-center mt-3">
        NaijaLavish v2.0 · Made with love for Naija
      </div>
    </div>
  );
}
