"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "../store/usePlayer";
import { LOOKS } from "../data/items";
import { toast } from "../store/useToasts";

type Tab = "signup" | "login";

export default function TitleScreen() {
  const createGuest = usePlayer((s) => s.createGuest);
  const createAccount = usePlayer((s) => s.createAccount);
  const setScreen = usePlayer((s) => s.setScreen);
  const storedName = usePlayer((s) => s.name);
  const storedUsername = usePlayer((s) => s.username);
  const isGuest = usePlayer((s) => s.isGuest);
  const hasStored = Boolean(storedName && (storedUsername || isGuest));

  const [tab, setTab] = useState<Tab>(hasStored ? "login" : "signup");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<"man" | "woman">("man");
  const [lookId, setLookId] = useState<string>("man-1");
  const [adult, setAdult] = useState(false);
  const [error, setError] = useState("");

  const looks = LOOKS.filter((l) => l.gender === gender);

  function pickLook(g: "man" | "woman") {
    setGender(g);
    const first = LOOKS.find((l) => l.gender === g);
    if (first) setLookId(first.id);
  }

  function submitSignup() {
    setError("");
    if (!name.trim()) return setError("Wetin be your name?");
    if (name.trim().length < 2) return setError("Name too short. Make am 2 letters at least.");
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return setError("Username na letters, numbers, _ only.");
    if (username.length < 3) return setError("Username too short. 3 letters at least.");
    if (password.length < 6) return setError("Password too short. 6 chars at least.");
    if (!adult) return setError("You gats confirm say you be 18+.");
    createAccount(name.trim(), username.trim(), gender, lookId, adult);
    toast(`Welcome to NaijaLavish, ${name.trim()}!`, "success", "🎉");
  }

  function submitLogin() {
    setError("");
    if (!username.trim()) return setError("Enter your username.");
    if (password.length < 6) return setError("Password too short.");
    // Local-only auth: accept any credentials that match stored (or any if no stored)
    const name = storedName || username.trim();
    const useLook =
      LOOKS.find((l) => l.id === (usePlayer.getState().lookId))?.id ||
      (gender === "man" ? "man-1" : "woman-1");
    createAccount(name, username.trim(), gender, useLook, true);
    toast(`Welcome back, ${name}!`, "success", "👋");
  }

  function playAsGuest() {
    setError("");
    if (!name.trim()) {
      // auto-generate a guest name
      const guestNames = ["Tamuno", "Ada", "BigDan", "Sade", "Tunde", "Bola", "Ibrahim"];
      const picked = guestNames[Math.floor(Math.random() * guestNames.length)];
      setName(picked);
      createGuest(picked, gender, lookId);
    } else {
      createGuest(name.trim(), gender, lookId);
    }
    toast("Playing as guest. Progress saves on this device.", "info", "🎮");
  }

  return (
    <main
      className="min-h-screen w-full flex items-stretch sm:items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(180deg, #f8faf8 0%, #eef7f1 60%, #e3f4ea 100%)",
      }}
    >
      <div
        className="w-full max-w-md panel p-5 sm:p-7 relative"
        style={{ borderRadius: 22 }}
      >
        {/* Brand row */}
        <div className="flex items-center gap-3 mb-5">
          <svg width={36} height={36} viewBox="0 0 64 64" aria-hidden="true">
            <defs>
              <clipPath id="title-clip">
                <rect width="64" height="64" rx="17" />
              </clipPath>
              <linearGradient id="title-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00b86b" />
                <stop offset="100%" stopColor="#00875a" />
              </linearGradient>
            </defs>
            <g clipPath="url(#title-clip)">
              <rect width="64" height="64" fill="url(#title-grad)" />
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
            <div className="font-bold leading-tight">
              Naija<span className="text-primary">Lavish</span>
            </div>
            <div className="text-xs text-foreground/50 flex items-center gap-1.5">
              <span className="dot" /> Connecting to FCT Abuja...
            </div>
          </div>
          <button
            onClick={() => setScreen("landing")}
            className="ml-auto text-xs text-foreground/50 hover:text-foreground underline underline-offset-4"
          >
            ← Home
          </button>
        </div>

        {/* Tagline */}
        <p className="text-sm text-foreground/70 mb-5 leading-relaxed">
          Pick a name, choose your look, start with ₦5,000 in your pocket.
          The city is yours.
        </p>

        <AnimatePresence mode="wait">
          {hasStored && tab === "login" ? (
            <motion.div
              key="back"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <div className="rounded-xl bg-secondary p-4 mb-4">
                <div className="text-sm text-foreground/60">Welcome back,</div>
                <div className="text-xl font-bold">
                  {storedName}{" "}
                  <span className="text-sm text-foreground/50 font-normal">
                    {storedUsername ? `@${storedUsername}` : "(guest)"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  usePlayer.getState().setScreen("game");
                  toast(`Welcome back, ${storedName}!`, "success", "👋");
                }}
                className="big-btn mb-3"
              >
                Continue →
              </button>
              <button
                onClick={() => {
                  usePlayer.getState().logout();
                  setTab("signup");
                }}
                className="link-btn w-full text-center"
              >
                Not you? Start a new person
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-secondary rounded-xl mb-4">
                <button
                  onClick={() => setTab("signup")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    tab === "signup"
                      ? "bg-card shadow-sm"
                      : "text-foreground/60"
                  }`}
                >
                  Create account
                </button>
                <button
                  onClick={() => setTab("login")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    tab === "login"
                      ? "bg-card shadow-sm"
                      : "text-foreground/60"
                  }`}
                >
                  Log in
                </button>
              </div>

              {tab === "signup" ? (
                <>
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
                  <Field label="Username">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground/50">@</span>
                      <input
                        type="text"
                        maxLength={16}
                        placeholder="yourhandle"
                        value={username}
                        onChange={(e) =>
                          setUsername(e.target.value.toLowerCase().replace(/\s/g, "_"))
                        }
                        className="nl-input flex-1"
                        autoComplete="username"
                        spellCheck={false}
                      />
                    </div>
                  </Field>
                  <Field label="Password">
                    <input
                      type="password"
                      maxLength={72}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="nl-input"
                      autoComplete="new-password"
                    />
                  </Field>
                  <Field label="Email (optional)">
                    <input
                      type="email"
                      maxLength={254}
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="nl-input"
                      autoComplete="email"
                    />
                  </Field>

                  {/* Gender */}
                  <p className="field-label">Man or woman? Then pick your look</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {(["man", "woman"] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => pickLook(g)}
                        className={`py-2.5 rounded-xl text-sm font-medium border transition ${
                          gender === g
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-foreground/70"
                        }`}
                      >
                        {g === "man" ? "👨 Man" : "👩 Woman"}
                      </button>
                    ))}
                  </div>

                  {/* Look picker */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {looks.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setLookId(l.id)}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition ${
                          lookId === l.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:border-foreground/20"
                        }`}
                      >
                        <span className="text-2xl">{l.emoji}</span>
                        <span className="text-xs font-medium">{l.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Adult */}
                  <label className="flex items-start gap-2 mb-4 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={adult}
                      onChange={(e) => setAdult(e.target.checked)}
                      className="mt-1 accent-primary"
                    />
                    <span>
                      I&apos;m 18 or older and I agree to the{" "}
                      <a
                        href="#"
                        className="text-primary underline underline-offset-2"
                        onClick={(e) => {
                          e.preventDefault();
                          toast("House rules: be kind. No links, no phone numbers in chat. No real money.", "info");
                        }}
                      >
                        house rules
                      </a>
                      .
                    </span>
                  </label>

                  {error && (
                    <div
                      className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg mb-3"
                      role="alert"
                    >
                      {error}
                    </div>
                  )}

                  <button onClick={submitSignup} className="big-btn">
                    Sign up · it&apos;s free
                  </button>
                  <button
                    onClick={playAsGuest}
                    className="link-btn w-full text-center mt-2"
                  >
                    Just looking? Play as a guest →
                  </button>
                </>
              ) : (
                <>
                  <Field label="Username">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground/50">@</span>
                      <input
                        type="text"
                        maxLength={17}
                        placeholder="yourhandle"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="nl-input flex-1"
                        autoComplete="username"
                        spellCheck={false}
                      />
                    </div>
                  </Field>
                  <Field label="Password">
                    <input
                      type="password"
                      maxLength={72}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="nl-input"
                      autoComplete="current-password"
                    />
                  </Field>
                  <p className="text-xs text-foreground/40 mb-4">
                    Tip: this device saves your progress. Use the same
                    username and password to come back.
                  </p>
                  {error && (
                    <div
                      className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg mb-3"
                      role="alert"
                    >
                      {error}
                    </div>
                  )}
                  <button onClick={submitLogin} className="big-btn">
                    Log in →
                  </button>
                  <button
                    onClick={() => setTab("signup")}
                    className="link-btn w-full text-center mt-2"
                  >
                    No account yet? Create one →
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Local styles for inputs */}
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
          box-shadow: 0 0 0 3px var(--primary) / 0.12;
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block mb-3">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
