"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../store/useAuth";
import { usePlayer } from "../store/usePlayer";
import { LOOKS } from "../data/items";
import { toast } from "../store/useToasts";
import { sfx } from "../lib/sound";
import { apiFetch } from "../lib/apiFetch";
import { getPlayer, type PlayerProfile } from "@/lib/firestore";

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

/** Read a saved profile straight from Firestore (no server call). Returns null if none / unreachable. */
async function loadProfile(uid: string): Promise<PlayerProfile | null> {
  try {
    return await Promise.race([
      getPlayer(uid),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
    ]);
  } catch {
    return null;
  }
}

function friendlyAuthError(msg?: string): string {
  const m = msg || "";
  if (m.includes("popup-closed-by-user") || m.includes("cancelled-popup-request"))
    return "You closed the Google window. Tap the button to try again.";
  if (m.includes("popup-blocked"))
    return "Your browser blocked the Google window. Allow pop-ups for this site and try again.";
  if (m.includes("unauthorized-domain"))
    return "This site's address is not allowed for Google sign-in yet. In Firebase: Authentication → Settings → Authorized domains → add your Vercel address.";
  if (m.includes("operation-not-allowed"))
    return "This sign-in method is switched off. In Firebase: Authentication → Sign-in method → enable it.";
  if (m.includes("network-request-failed")) return "No internet. Check your connection and try again.";
  return m || "Sign-in failed. Try again.";
}

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function TitleScreen() {
  const signIn = useAuth((s) => s.signIn);
  const signInWithGoogle = useAuth((s) => s.signInWithGoogle);
  const getIdToken = useAuth((s) => s.getIdToken);
  const setScreen = usePlayer((s) => s.setScreen);
  const syncFromProfile = usePlayer((s) => s.syncFromProfile);

  const [tab, setTab] = useState<Tab>("signup");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"man" | "woman">("man");
  const [lookId, setLookId] = useState<string>("man-1");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const looks = LOOKS.filter((l) => l.gender === gender);
  const age = calcAge(dob);

  function pickLook(g: "man" | "woman") {
    setGender(g);
    const first = LOOKS.find((l) => l.gender === g);
    if (first) setLookId(first.id);
  }

  // ---- Google sign-in (signup OR login) ----
  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    sfx.play("click");
    try {
      const result = await signInWithGoogle();
      if (!result.ok) {
        setError(friendlyAuthError(result.error));
        return;
      }
      const uid = useAuth.getState().uid;
      const token = await getIdToken();
      if (!uid || !token) throw new Error("Auth failed after Google sign-in. Try again.");

      // Returning player? Their profile is already saved, so no server call is needed.
      let profile = await loadProfile(uid);

      if (!profile) {
        // New player: we need the 18+ details first.
        if (!name.trim() || !dob || age < 18 || !agreed) {
          setTab("signup");
          setError("Almost there! Fill your name and date of birth (18+), tick the box, then tap Sign up.");
          if (!name.trim()) setName(useAuth.getState().user?.displayName?.split(" ")[0]?.slice(0, 16) || "");
          return;
        }
        const r = await apiFetch("/api/player/init", {
          method: "POST",
          body: { name: name.trim(), username: username.trim(), lookId, gender, adult: true },
          idToken: token,
        });
        if (!r.ok || !r.data?.player) throw new Error(r.error || "Could not create your player.");
        profile = r.data.player as PlayerProfile;
      }

      syncFromProfile(profile);
      setScreen("game");
      toast(`Welcome to NaijaLavish, ${profile.name}!`, "success", "🎉");
    } catch (e: any) {
      setError(friendlyAuthError(e?.message));
    } finally {
      setGoogleLoading(false);
    }
  }

  // ---- Guest / new account signup ----
  async function submitSignup() {
    setError("");
    sfx.play("click");
    if (!name.trim() || name.trim().length < 2) return setError("Wetin be your name? (2+ letters)");
    if (!dob) return setError("Enter your date of birth.");
    if (age < 18) return setError("You must be 18+ to play NaijaLavish.");
    if (username && !/^[a-z0-9_]+$/.test(username)) return setError("Username: letters, numbers, _ only.");
    if (username && username.length < 3) return setError("Username too short (3+).");
    if (!agreed) return setError("Tick the box to confirm you are 18+ and agree to the house rules.");

    setLoading(true);
    try {
      await signIn(); // reuses an existing session (e.g. Google); otherwise creates a guest one
      const token = await getIdToken();
      if (!token) throw new Error("Could not sign you in. Check your internet and try again.");

      const result = await apiFetch("/api/player/init", {
        method: "POST",
        body: { name: name.trim(), username: username.trim(), lookId, gender, adult: true },
        idToken: token,
      });
      if (!result.ok || !result.data?.player) {
        throw new Error(result.error || "Sign-up failed.");
      }

      syncFromProfile(result.data.player);
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

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary rounded-xl mb-4">
          <button
            onClick={() => { sfx.play("click"); setTab("signup"); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              tab === "signup" ? "bg-card shadow-sm" : "text-foreground/60"
            }`}
          >
            Create account
          </button>
          <button
            onClick={() => { sfx.play("click"); setTab("login"); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              tab === "login" ? "bg-card shadow-sm" : "text-foreground/60"
            }`}
          >
            Log in
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === "login" ? (
            /* ==================== LOGIN TAB ==================== */
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <p className="text-sm text-foreground/70 mb-4 leading-relaxed">
                Sign in with Google to continue your hustle in Abuja. Your progress syncs across devices.
              </p>

              {/* Google sign-in button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border border-border bg-white hover:bg-gray-50 transition disabled:opacity-50 mb-3"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
              >
                <GoogleIcon size={20} />
                <span className="text-sm font-medium text-gray-700">
                  {googleLoading ? "Signing in..." : "Continue with Google"}
                </span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-foreground/40">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Quick guest play */}
              <button
                onClick={() => { sfx.play("click"); setTab("signup"); }}
                className="w-full py-2.5 rounded-xl bg-secondary text-foreground/70 text-sm font-medium hover:bg-secondary/80 transition mb-3"
              >
                New here? Create a free account →
              </button>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg mb-3" role="alert">
                  {error}
                </div>
              )}

              <p className="text-[11px] text-foreground/40 text-center">
                18+ only. Be kind — no real money, no links or phone numbers in chat.
              </p>
            </motion.div>
          ) : (
            /* ==================== SIGNUP TAB ==================== */
            <motion.div
              key="signup"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {/* Google signup (fastest path) */}
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border border-border bg-white hover:bg-gray-50 transition disabled:opacity-50 mb-3"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
              >
                <GoogleIcon size={20} />
                <span className="text-sm font-medium text-gray-700">
                  {googleLoading ? "Signing in..." : "Sign up with Google"}
                </span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-foreground/40">or play as guest</span>
                <div className="flex-1 h-px bg-border" />
              </div>

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
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
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
                disabled={loading || googleLoading || (dob !== "" && age < 18)}
                className="big-btn disabled:opacity-50"
              >
                {loading ? "Loading..." : "Sign up · it's free →"}
              </button>
              <p className="text-[11px] text-foreground/40 text-center mt-3">
                You&apos;ll be signed in anonymously. Your progress syncs to this device.
              </p>
            </motion.div>
          )}
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
