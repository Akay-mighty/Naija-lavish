// Firestore client service for NaijaLavish.
// READ-ONLY for chat + admin actions.
// For player profile, client may ONLY update: name, username, lookId, gender, placeId, lastSeen.
// All cash/bank/banned/adult writes go through /api/* route handlers (server-side).

import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  setDoc,
  serverTimestamp,
  getDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db, rtdb } from "./firebase";
import {
  ref as dbRef,
  onValue as dbOnValue,
  onDisconnect as dbOnDisconnect,
  set as dbSet,
  update as dbUpdate,
  remove as dbRemove,
  serverTimestamp as dbServerTimestamp,
} from "firebase/database";

// ============================================================
// PLAYER PROFILE (read + limited write)
// ============================================================

export interface PlayerProfile {
  uid: string;
  name: string;
  username: string;
  isGuest: boolean;
  adult: boolean;
  cash: number;
  bank: number;
  earnedTotal: number;
  spentTotal: number;
  sprayedTotal: number;
  hunger: number;
  energy: number;
  vibe: number;
  placeId: string;
  lookId: string;
  gender: string;
  banned: boolean;
  createdAt: number;
  lastSeen: number;
  quest?: Record<string, any>;
  dailyStreak?: number;
  dailyLastClaim?: string;
}

/** Real-time listener for own player profile. */
export function listenToPlayer(
  uid: string,
  cb: (p: PlayerProfile | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "players", uid),
    (snap) => cb(snap.exists() ? (snap.data() as PlayerProfile) : null),
    (err) => console.warn("[firestore] listenToPlayer:", err)
  );
}

/** Update only the client-writable fields. Server enforces rules. */
export async function updatePlayerClient(
  uid: string,
  fields: Pick<PlayerProfile, "name" | "username" | "lookId" | "gender" | "placeId" | "lastSeen">
): Promise<void> {
  try {
    await setDoc(doc(db, "players", uid), fields as any, { merge: true });
  } catch (e) {
    console.warn("[firestore] updatePlayerClient:", e);
  }
}

// ============================================================
// CHAT (read-only on client; sends via /api/chat)
// ============================================================

export interface ChatDoc {
  id: string;
  uid: string;
  name: string;
  lookId?: string;
  text: string;
  placeId?: string;
  t: number;
}

/** Real-time listener for global chat (last 50, newest at bottom). */
export function listenToChat(cb: (messages: ChatDoc[]) => void): Unsubscribe {
  const q = query(collection(db, "chat"), orderBy("t", "desc"), limit(50));
  return onSnapshot(
    q,
    (snap) => {
      const msgs = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ChatDoc, "id">) }))
        .reverse();
      cb(msgs);
    },
    (err) => console.warn("[firestore] listenToChat:", err)
  );
}

/** Send a chat message via the server route (validates + filters). */
export async function sendChatMessage(
  idToken: string,
  text: string,
  placeId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ text, placeId }),
    });
    // Always try to parse as JSON; if it fails (HTML error page), return friendly error
    const responseText = await res.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      return { ok: false, error: `Server error (status ${res.status}). Check your Firebase service account configuration.` };
    }
    if (!res.ok || !data.ok) return { ok: false, error: data.error || "Chat failed." };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error." };
  }
}

// ============================================================
// PRESENCE + POSITIONS (Realtime Database — low latency, cheap)
// ============================================================

export interface PresenceEntry {
  uid: string;
  name: string;
  lookId: string;
  placeId: string;
  x: number;
  z: number;
  ry: number;     // rotation y
  anim: string;   // "idle" | "walk" | "dance"
  say?: string;   // speech bubble text (5s)
  t: number;      // server timestamp
}

// Players send a heartbeat every 15s (see Game.tsx), so 60s of silence means they left.
const PRESENCE_STALE_MS = 60_000;

/** Everyone walks the same outdoor city, so this zone name means "show all players". */
export const WORLD_ZONE = "city";

// How far this phone's clock is from the Firebase server's clock. Without this, a phone
// whose clock is a minute off makes every other player look "stale" and invisible.
let serverOffset = 0;
if (typeof window !== "undefined") {
  try {
    dbOnValue(dbRef(rtdb, ".info/serverTimeOffset"), (snap) => {
      serverOffset = Number(snap.val()) || 0;
    });
  } catch { /* offline: fall back to the local clock */ }
}
const serverNow = () => Date.now() + serverOffset;

/** Write own presence to RTDB. Auto-removed on disconnect. */
export function initPresence(
  uid: string,
  name: string,
  lookId: string,
  placeId: string,
  x = 0,
  z = 0,
  ry = 0
) {
  const r = dbRef(rtdb, `presence/${uid}`);
  dbOnDisconnect(r).remove();
  dbSet(r, {
    uid, name, lookId, placeId,
    x, z, ry, anim: "idle",
    t: dbServerTimestamp(),
  }).catch((e) => console.warn("[rtdb] initPresence failed (check Realtime Database rules + databaseURL):", e?.message || e));
  return r;
}

/**
 * Update own presence (call max 4x/sec, only when state changes).
 * Uses update(), NOT set(): set() would wipe every field that is not in `patch`
 * (uid, look, position...) and the player would vanish for everyone else.
 */
export async function updatePresence(
  uid: string,
  patch: Partial<PresenceEntry>
): Promise<void> {
  try {
    await dbUpdate(dbRef(rtdb, `presence/${uid}`), {
      ...patch,
      t: dbServerTimestamp(),
    });
  } catch (e) {
    console.warn("[rtdb] updatePresence:", e);
  }
}

/** Remove own presence (on logout / leave). */
export async function clearPresence(uid: string): Promise<void> {
  try {
    await dbRemove(dbRef(rtdb, `presence/${uid}`));
  } catch (e) {
    console.warn("[rtdb] clearPresence:", e);
  }
}

function readPresence(snap: any, keep: (v: PresenceEntry) => boolean): PresenceEntry[] {
  const now = serverNow();
  const list: PresenceEntry[] = [];
  snap.forEach((child: any) => {
    const v = child.val() as PresenceEntry;
    if (!v || !v.uid) return;
    if (v.t && now - v.t > PRESENCE_STALE_MS) return;
    if (!keep(v)) return;
    list.push(v);
  });
  return list;
}

/** Subscribe to presence in a zone. The WORLD_ZONE ("city") shows everyone. */
export function listenToPresence(
  placeId: string,
  cb: (entries: PresenceEntry[]) => void
): Unsubscribe {
  const unsub = dbOnValue(
    dbRef(rtdb, "presence"),
    (snap) => cb(readPresence(snap, (v) => placeId === WORLD_ZONE || v.placeId === placeId)),
    (err) => console.warn("[rtdb] listenToPresence denied (fix the Realtime Database rules):", err?.message || err)
  );
  return unsub as unknown as Unsubscribe;
}

/** Subscribe to ALL presence entries (online count + PeopleSheet). */
export function listenToAllPresence(
  cb: (entries: PresenceEntry[]) => void
): Unsubscribe {
  const unsub = dbOnValue(
    dbRef(rtdb, "presence"),
    (snap) => cb(readPresence(snap, () => true)),
    (err) => console.warn("[rtdb] listenToAllPresence denied (fix the Realtime Database rules):", err?.message || err)
  );
  return unsub as unknown as Unsubscribe;
}

// ============================================================
// ADMIN ACTIONS (read-only on client)
// ============================================================

export interface AdminAction {
  id: string;
  adminId: string;
  playerId: string;
  playerName: string;
  action: string;
  field?: string | null;
  amount?: number | null;
  note?: string;
  t: number;
}

export function listenToAdminActions(cb: (actions: AdminAction[]) => void): Unsubscribe {
  const q = query(collection(db, "adminActions"), orderBy("t", "desc"), limit(100));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminAction, "id">) }))),
    (err) => console.warn("[firestore] listenToAdminActions:", err)
  );
}

export function listenToAllPlayers(cb: (players: Array<{ id: string } & PlayerProfile>) => void): Unsubscribe {
  const q = query(collection(db, "players"), orderBy("lastSeen", "desc"), limit(200));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as PlayerProfile) }))),
    (err) => console.warn("[firestore] listenToPlayers:", err)
  );
}

// ============================================================
// HELPERS
// ============================================================

/** Fetch a player profile (one-time read). */
export async function getPlayer(uid: string): Promise<PlayerProfile | null> {
  const snap = await getDoc(doc(db, "players", uid));
  return snap.exists() ? (snap.data() as PlayerProfile) : null;
}
