"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../store/useAuth";
import { usePlayer } from "../store/usePlayer";
import { QUICK_LINES, STICKERS } from "../data/npcs";
import { listenToChat, sendChatMessage, type ChatDoc } from "@/lib/firestore";
import { sfx } from "../lib/sound";

export default function Chat() {
  const idToken = useAuth((s) => s.idToken);
  const uid = useAuth((s) => s.uid);
  const placeId = usePlayer((s) => s.placeId);
  const name = usePlayer((s) => s.name);
  const [messages, setMessages] = useState<ChatDoc[]>([]);
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const lastPlayedTs = useRef<number>(0);

  // Subscribe to real chat from Firestore
  useEffect(() => {
    const unsub = listenToChat((msgs) => {
      setMessages(msgs);
      setConnected(true);
      // Play sound for new messages from others
      const newest = msgs[msgs.length - 1];
      if (newest && newest.uid !== uid && newest.t > lastPlayedTs.current) {
        lastPlayedTs.current = newest.t;
        sfx.play("message");
      }
    });
    return () => unsub();
  }, [uid]);

  // Auto-scroll
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  async function send(text: string) {
    if (!idToken || !text.trim() || sending) return;
    setSending(true);
    setError(null);
    setInput("");
    const res = await sendChatMessage(idToken, text, placeId);
    if (!res.ok) setError(res.error || "Failed to send.");
    setSending(false);
  }

  async function shareLink() {
    const url = window.location.href;
    const shareData = { title: "NaijaLavish", text: "Come join me in Abuja — multiplayer life game!", url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        sfx.play("click");
        setError("Link copied! Share am with your guys.");
      }
    } catch {
      // user cancelled share — silent
    }
  }

  const isEmpty = messages.length === 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="absolute left-3 z-20 pointer-events-none"
      style={{
        maxWidth: expanded ? 320 : 180,
        bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Collapsed: small chat bar */}
      {!expanded && (
        <button
          onClick={() => { setExpanded(true); }}
          className="pointer-events-auto flex items-center gap-2 px-2.5 py-1.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
        >
          <span style={{ fontSize: 11 }}>💬</span>
          <span className="text-[10px] text-gray-600 truncate" style={{ maxWidth: 100 }}>
            {isEmpty ? "No messages" : messages[messages.length - 1].text.slice(0, 30)}
          </span>
          {!isEmpty && (
            <span className="text-[9px] bg-emerald-500 text-white px-1.5 rounded-full font-bold">
              {messages.length}
            </span>
          )}
        </button>
      )}

      {/* Expanded: full chat */}
      {expanded && (
        <>
      {/* Connection indicator */}
      {connected && !isEmpty && (
        <div className="flex items-center justify-end mb-1">
          <span className="text-[10px] text-foreground/40 bg-card/80 backdrop-blur px-2 py-0.5 rounded-full">
            <span className="dot" style={{ width: 6, height: 6, marginRight: 4 }} />
            Live · {messages.length} {messages.length === 1 ? "msg" : "msgs"}
          </span>
        </div>
      )}

      {/* Chat log — compact, never covers the screen */}
      <div
        ref={logRef}
        className="panel no-scrollbar pointer-events-auto mb-2 overflow-y-auto px-3 py-2"
        style={{ borderRadius: 14, maxHeight: isEmpty ? 56 : 132 }}
        aria-live="polite"
      >
        {isEmpty ? (
          // COMPACT empty state — single line, no big box
          <div className="flex items-center gap-2 text-xs">
            <span className="opacity-50">💬</span>
            <span className="text-foreground/50 flex-1 truncate">No gist yet. Share the link →</span>
            <button
              onClick={shareLink}
              className="px-2 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex-none"
            >
              Share
            </button>
          </div>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`flex items-start gap-1.5 ${m.uid === uid ? "justify-end" : ""}`}
              >
                <div
                  className={`text-xs leading-snug ${
                    m.uid === uid ? "text-primary font-medium" : "text-foreground"
                  }`}
                >
                  {m.uid !== uid && (
                    <span className="font-semibold mr-1">{m.name}:</span>
                  )}
                  <span>{m.text}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Error toast */}
      {error && (
        <div className="panel pointer-events-auto mb-2 px-3 py-1.5 text-[11px] text-destructive">
          {error}
        </div>
      )}

      {/* Quick lines */}
      <AnimatePresence>
        {showQuick && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="panel pointer-events-auto mb-2 p-2 flex flex-wrap gap-1"
            style={{ borderRadius: 12 }}
          >
            {QUICK_LINES.map((line) => (
              <button
                key={line}
                onClick={() => { send(line); setShowQuick(false); }}
                className="px-2.5 py-1.5 rounded-full bg-secondary text-xs hover:bg-accent transition"
              >
                {line}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stickers */}
      <AnimatePresence>
        {showStickers && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="panel pointer-events-auto mb-2 p-2 flex flex-wrap gap-1"
            style={{ borderRadius: 12 }}
          >
            {STICKERS.map((s) => (
              <button
                key={s.id}
                onClick={() => { send(s.emoji); setShowStickers(false); }}
                className="flex flex-col items-center gap-0.5 p-2 rounded-lg hover:bg-secondary transition"
                title={s.label}
              >
                <span className="text-2xl">{s.emoji}</span>
                <span className="text-[9px] text-foreground/50">{s.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        autoComplete="off"
        className="pointer-events-auto flex items-center gap-1.5 panel p-1.5"
        style={{ borderRadius: 14 }}
      >
        <button
          type="button"
          className="chip-btn"
          onClick={() => { sfx.play("click"); setShowQuick((v) => !v); setShowStickers(false); }}
          aria-label="Quick lines"
        >
          💬
        </button>
        <input
          type="text"
          maxLength={200}
          placeholder={idToken ? "Say something..." : "Sign in to chat..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!idToken || sending}
          className="flex-1 bg-transparent outline-none text-sm px-1 disabled:opacity-50"
          aria-label="Chat message"
        />
        <button
          type="button"
          className="chip-btn"
          onClick={() => { sfx.play("click"); setShowStickers((v) => !v); setShowQuick(false); }}
          aria-label="Stickers and reactions"
        >
          😊
        </button>
        <button
          type="submit"
          className="chip-btn"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          disabled={!idToken || sending || !input.trim()}
          aria-label="Send"
        >
          ↑
        </button>
      </form>

      {/* Collapse button */}
      <button
        onClick={() => setExpanded(false)}
        className="pointer-events-auto mt-1 text-[10px] text-white/40 bg-black/40 px-2 py-0.5 rounded-full"
      >
        ▼ Collapse
      </button>
        </>
      )}
    </div>
  );
}
