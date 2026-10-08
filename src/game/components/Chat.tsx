"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "../store/usePlayer";
import { QUICK_LINES, STICKERS, randomNPC, randomLine } from "../data/npcs";
import {
  listenToChat,
  sendChatMessage,
  type ChatDoc,
} from "@/lib/firestore";
import { sfx } from "../lib/sound";

export default function Chat() {
  const chat = usePlayer((s) => s.chat);
  const pushChat = usePlayer((s) => s.pushChat);
  const placeId = usePlayer((s) => s.placeId);
  const playerId = usePlayer((s) => s.playerId);
  const name = usePlayer((s) => s.name);
  const lookId = usePlayer((s) => s.lookId);
  const [showStickers, setShowStickers] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [input, setInput] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  // Real-time messages from Firestore
  const [liveMessages, setLiveMessages] = useState<ChatDoc[]>([]);
  const [connected, setConnected] = useState(false);
  const lastPlayedMsgTs = useRef<number>(0);

  // Subscribe to Firestore global chat
  useEffect(() => {
    const unsub = listenToChat((msgs) => {
      setLiveMessages(msgs);
      setConnected(true);
      // Play message sound if there's a new message from someone else
      const newest = msgs[msgs.length - 1];
      if (
        newest &&
        newest.playerId !== playerId &&
        newest.timestamp > lastPlayedMsgTs.current
      ) {
        lastPlayedMsgTs.current = newest.timestamp;
        sfx.play("message");
      }
    });
    return () => unsub();
  }, [playerId]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [chat, liveMessages]);

  // NPC chatter fallback — only fires if Firestore is offline (no live messages)
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = 18000 + Math.random() * 10000;
      timeout = setTimeout(() => {
        // Only fire NPC chatter if we haven't received live messages recently
        if (liveMessages.length === 0 || Date.now() - (liveMessages[liveMessages.length - 1]?.timestamp || 0) > 30000) {
          const npc = randomNPC();
          const line = randomLine(npc);
          pushChat({ who: "npc", name: npc.name, text: line, emoji: npc.emoji });
        }
        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, [pushChat, placeId, liveMessages]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");

    // Optimistic local echo
    pushChat({ who: "me", text });

    // Send to Firestore (will be picked up by listenToChat)
    if (playerId) {
      await sendChatMessage({
        playerId,
        playerName: name,
        lookId,
        text,
        placeId,
      });
    }
  }

  async function sendQuick(line: string) {
    pushChat({ who: "me", text: line });
    setShowQuick(false);
    if (playerId) {
      await sendChatMessage({
        playerId,
        playerName: name,
        lookId,
        text: line,
        placeId,
      });
    }
  }

  async function sendSticker(sticker: { emoji: string; label: string }) {
    pushChat({ who: "me", text: sticker.emoji, emoji: sticker.emoji });
    setShowStickers(false);
    if (playerId) {
      await sendChatMessage({
        playerId,
        playerName: name,
        lookId,
        text: sticker.emoji,
        placeId,
      });
    }
  }

  // Build the combined message list: live messages + local fallback
  const allMessages = liveMessages.length > 0
    ? liveMessages.map((m) => ({
        id: m.id || m.timestamp.toString(),
        who: m.playerId === playerId ? ("me" as const) : ("npc" as const),
        name: m.playerName,
        text: m.text,
        emoji: m.emoji,
        ts: m.timestamp,
      }))
    : chat.slice(-30);

  return (
    <div
      className="absolute bottom-[64px] left-3 right-3 z-20 pointer-events-none"
      style={{ maxWidth: 360 }}
    >
      {/* Connection indicator */}
      {connected && liveMessages.length > 0 && (
        <div className="flex items-center justify-end mb-1">
          <span className="text-[10px] text-foreground/40 bg-card/80 backdrop-blur px-2 py-0.5 rounded-full">
            <span className="dot" style={{ width: 6, height: 6, marginRight: 4 }} />
            Live chat · {liveMessages.length} messages
          </span>
        </div>
      )}

      {/* Chat log */}
      <div
        ref={logRef}
        className="panel no-scrollbar pointer-events-auto mb-2 max-h-44 overflow-y-auto px-3 py-2"
        style={{ borderRadius: 14 }}
        aria-live="polite"
      >
        <ol className="flex flex-col gap-1.5">
          {allMessages.map((m) => (
            <li
              key={m.id}
              className={`flex items-start gap-1.5 ${
                m.who === "me" ? "justify-end" : ""
              }`}
            >
              {m.emoji && <span className="text-sm mt-0.5">{m.emoji}</span>}
              <div
                className={`text-xs leading-snug ${
                  m.who === "system"
                    ? "text-foreground/50 italic"
                    : m.who === "me"
                    ? "text-primary font-medium"
                    : "text-foreground"
                }`}
              >
                {m.name && (
                  <span className="font-semibold mr-1">{m.name}:</span>
                )}
                <span>{m.text}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

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
                onClick={() => sendQuick(line)}
                className="px-2.5 py-1.5 rounded-full bg-secondary text-xs hover:bg-accent transition"
              >
                {line}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticker tray */}
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
                onClick={() => sendSticker(s)}
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

      {/* Input row */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        autoComplete="off"
        className="pointer-events-auto flex items-center gap-1.5 panel p-1.5"
        style={{ borderRadius: 14 }}
      >
        <button
          type="button"
          className="chip-btn"
          onClick={() => {
            sfx.play("click");
            setShowQuick((v) => !v);
            setShowStickers(false);
          }}
          aria-label="Quick lines"
        >
          💬
        </button>
        <input
          type="text"
          maxLength={120}
          placeholder="Say something..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm px-1"
          aria-label="Chat message"
        />
        <button
          type="button"
          className="chip-btn"
          onClick={() => {
            sfx.play("click");
            setShowStickers((v) => !v);
            setShowQuick(false);
          }}
          aria-label="Stickers and reactions"
        >
          😊
        </button>
        <button
          type="submit"
          className="chip-btn"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          aria-label="Send"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
