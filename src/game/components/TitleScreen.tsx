"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../store/useAuth";
import { usePlayer } from "../store/usePlayer";
import { LOOKS } from "../data/items";
import { toast } from "../store/useToasts";
import { sfx } from "../lib/sound";

type Tab = "signup" | "login";

function calcAge(dob: string): number {
  if (!dob) return 0;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export default function TitleScreen() {
  const signIn = useAuth((s) => s.signIn);
  const getIdToken = useAuth((s) => s.getIdToken);
  const setScreen = usePlayer((s) => s.setScreen);
  const setLocalName = usePlayer((s) => s.setLocalName);
  const setLook = usePlayer((s) => s.setLook);
  const syncFromProfile = usePlayer((s) => s.syncFromProfile);

  const [tab, setTab] = useState<Tab>("signup");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"man" | "woman">("man");
  const [lookId, setLookId] = useState<string>("man-1");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const looks = LOOKS.filter((l) => l.gender === gender);
  const age = calcAge(dob);

  function pickLook(g: "man" | "woman") {
    setGender(g);
    const first = LOOKS.find((l) => l.gender === g);
    if (first) setLookId(first.id);
  }

  async function submitSignup() {
    setError("");
    sfx.play("click");
    if (!name.trim() || name.trim().length < 2) return setError("Wetin be your name? (2+ letters)");
    if (!dob) return setError("Enter your date of birth.");
    if (age < 18) return setError("You must be 18+ to play NaijaLavish.");
    if (username && !/^[a-z0-9_]+$/.test(username)) return setError("Username: letters, numbers, _ only.");
    if (username && username.length < 3) return setError("Username too short (3+).");

    setLoading(true);
    try {
      // 1. Sign in anonymously
      await signIn();
      const token = await getIdToken();
      if (!token) throw new Error("Auth failed — try again.");

      // 2. Create player profile on server
      const res = await fetch("/api/player/init", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          lookId,
          gender,
          adult: true, // server trusts the DOB check we did here; in production use a 3rd-party age verification
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Sign-up failed.");

      syncFromProfile(data.player);
      setScreen("game");
      toast(`Welcome to NaijaLavish, ${name.trim()}!`, "success", "🎉");
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen w-full flex items-stretch sm:items-center justify-center p-4"
      style={{ background: "linear-gradient(180deg, #f8faf8 0%, #eef7f1 60%, #e3f4ea 100%)" }}
    >
      <div className="w-full max-w-md panel p-5 sm:p-7 relative" style={{ borderRadius: 22 }}>
        {/* Brand */}
        <div className="flex items-center gap-3 mb-5">
          <svg width={36} height={36} viewBox="0 0 64 64" aria-hidden="true">
            <defs>
              <clipPath id="title-clip"><rect width="64" height="64" rx="17" /></clipPath>
              <linearGradient id="title-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00b86b" />
                <stop offset="100%" stopColor="#00875a" />
              </linearGradient>
            </defs>
            <g clipPath="url(#title-clip)">
              <rect width="64" height="64" fill="url(#title-grad)" />
              <text x="32" y="40" textAnchor="middle" fontFamily="Poppins" fontWeight="700" fontSize="32" fill="#fff">₦</text>
            </g>
          </svg>
          <div>
            <div className="font-bold leading-tight">Naija<span className="text-primary">Lavish</span></div>
            <div className="text-xs text-foreground/50 flex items-center gap-1.5">
              <span className="dot" /> Connecting to Abuja...
            </div>
          </div>
          <button
            onClick={() => { sfx.play("click"); setScreen("landing"); }}
            className="ml-auto text-xs text-foreground/50 hover:text-foreground underline underline-offset-4"
          >
            ← Home
          </button>
        </div>

        <p className="text-sm text-foreground/70 mb-5 leading-relaxed">
          Pick a name, choose your look, start with ₦5,000. The city is yours.
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key="signup"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <Field label="Your name">
              <input
                type="text"
                maxLength={16}
                placeholder="e.g. Tamuno, Ada, BigDan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="nl-input"
                autoComplete="nickname"
              />
            </Field>
            <Field label="Date of birth (must be 18+)">
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="nl-input"
                max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
              />
              {dob && age < 18 && (
                <div className="text-xs text-destructive mt-1">You must be 18 or older.</div>
              )}
              {dob && age >= 18 && (
                <div className="text-xs text-primary mt-1">✓ {age} years old</div>
              )}
            </Field>
            <Field label="Username (optional)">
              <div className="flex items-center gap-2">
                <span className="text-foreground/50">@</span>
                <input
                  type="text"
                  maxLength={16}
                  placeholder="yourhandle"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, "_"))}
                  className="nl-input flex-1"
                  spellCheck={false}
                />
              </div>
            </Field>

            <p className="field-label">Man or woman? Then pick your look</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(["man", "woman"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => pickLook(g)}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition ${
                    gender === g ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground/70"
                  }`}
                >
                  {g === "man" ? "👨 Man" : "👩 Woman"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {looks.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLookId(l.id)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition ${
                    lookId === l.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-foreground/20"
                  }`}
                >
                  <span className="text-2xl">{l.emoji}</span>
                  <span className="text-xs font-medium">{l.label}</span>
                </button>
              ))}
            </div>

            <label className="flex items-start gap-2 mb-4 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={true}
                readOnly
                className="mt-1 accent-primary"
              />
              <span>
                I&apos;m 18 or older and I agree to the house rules: be kind, no real money, no links or phone numbers in chat.
              </span>
            </label>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg mb-3" role="alert">
                {error}
              </div>
            )}

            <button
              onClick={submitSignup}
              disabled={loading || (dob !== "" && age < 18)}
              className="big-btn disabled:opacity-50"
            >
              {loading ? "Loading..." : "Sign up · it's free →"}
            </button>
            <p className="text-[11px] text-foreground/40 text-center mt-3">
              You&apos;ll be signed in anonymously. Your progress syncs to this device.
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <style jsx>{`
        :global(.nl-input) {
          width: 100%;
          padding: 11px 14px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--foreground);
          font-size: 15px;
          font-family: inherit;
          transition: border-color .15s, box-shadow .15s;
        }
        :global(.nl-input:focus) {
          outline: none;
          border-color: var(--primary);
        }
        :global(.field-label) {
          font-size: 13px;
          font-weight: 600;
          color: var(--foreground);
          margin-bottom: 8px;
          display: block;
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
