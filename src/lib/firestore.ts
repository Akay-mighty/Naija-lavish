// Firestore service layer for NaijaLavish
// Handles player sync + admin actions.
// All calls degrade gracefully to localStorage-only if Firestore is unreachable.

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  addDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

// ---- Collection names ----
export const PLAYERS_COL = "players";
export const ADMIN_ACTIONS_COL = "adminActions";

// ---- Types ----
export interface PlayerDoc {
  name: string;
  username: string;
  isGuest: boolean;
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
  adult: boolean;
  banned: boolean;
  createdAt: number;
  lastSeen: number;
}

export interface AdminAction {
  id?: string;
  adminId: string;
  playerId: string;
  playerName: string;
  action: string; // "credit" | "debit" | "setNeed" | "ban" | "unban" | "reset"
  field?: string;
  amount?: number;
  note?: string;
  timestamp: number;
}

// ============================================================
// PLAYER SYNC
// ============================================================

/** Create or update a player doc in Firestore. */
export async function upsertPlayer(
  playerId: string,
  data: Partial<PlayerDoc>
): Promise<void> {
  try {
    await setDoc(
      doc(db, PLAYERS_COL, playerId),
      { ...data, lastSeen: Date.now() },
      { merge: true }
    );
  } catch (e) {
    // Silent fail — game continues on localStorage
    console.warn("[firestore] upsertPlayer failed:", e);
  }
}

/** Read a single player doc. */
export async function getPlayer(playerId: string): Promise<PlayerDoc | null> {
  try {
    const snap = await getDoc(doc(db, PLAYERS_COL, playerId));
    if (!snap.exists()) return null;
    return snap.data() as PlayerDoc;
  } catch (e) {
    console.warn("[firestore] getPlayer failed:", e);
    return null;
  }
}

/** Real-time listener for a single player. Returns unsubscribe fn. */
export function listenToPlayer(
  playerId: string,
  cb: (data: PlayerDoc | null) => void
): () => void {
  try {
    return onSnapshot(
      doc(db, PLAYERS_COL, playerId),
      (snap) => {
        cb(snap.exists() ? (snap.data() as PlayerDoc) : null);
      },
      (err) => {
        console.warn("[firestore] listenToPlayer error:", err);
      }
    );
  } catch (e) {
    console.warn("[firestore] listenToPlayer failed:", e);
    return () => {};
  }
}

// ============================================================
// ADMIN QUERIES
// ============================================================

/** List all players (most recent first). Used by admin dashboard. */
export async function listPlayers(): Promise<Array<{ id: string } & PlayerDoc>> {
  try {
    const q = query(
      collection(db, PLAYERS_COL),
      orderBy("lastSeen", "desc"),
      limit(200)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as PlayerDoc) }));
  } catch (e) {
    console.warn("[firestore] listPlayers failed:", e);
    return [];
  }
}

/** Real-time listener for ALL players. Used by admin dashboard. */
export function listenToPlayers(
  cb: (players: Array<{ id: string } & PlayerDoc>) => void
): () => void {
  try {
    const q = query(
      collection(db, PLAYERS_COL),
      orderBy("lastSeen", "desc"),
      limit(200)
    );
    return onSnapshot(
      q,
      (snap) => {
        cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as PlayerDoc) })));
      },
      (err) => {
        console.warn("[firestore] listenToPlayers error:", err);
      }
    );
  } catch (e) {
    console.warn("[firestore] listenToPlayers failed:", e);
    return () => {};
  }
}

/** Admin updates a player's doc directly. */
export async function adminUpdatePlayer(
  playerId: string,
  updates: Partial<PlayerDoc>
): Promise<void> {
  try {
    await updateDoc(doc(db, PLAYERS_COL, playerId), {
      ...updates,
      lastSeen: Date.now(),
    });
  } catch (e) {
    console.warn("[firestore] adminUpdatePlayer failed:", e);
    throw e;
  }
}

/** Log an admin action (audit trail). */
export async function logAdminAction(action: Omit<AdminAction, "timestamp">): Promise<void> {
  try {
    await addDoc(collection(db, ADMIN_ACTIONS_COL), {
      ...action,
      timestamp: Date.now(),
      serverTime: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[firestore] logAdminAction failed:", e);
  }
}

/** List recent admin actions (newest first). */
export async function listAdminActions(): Promise<AdminAction[]> {
  try {
    const q = query(
      collection(db, ADMIN_ACTIONS_COL),
      orderBy("timestamp", "desc"),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as AdminAction) }));
  } catch (e) {
    console.warn("[firestore] listAdminActions failed:", e);
    return [];
  }
}

/** Real-time listener for admin actions. */
export function listenToAdminActions(cb: (actions: AdminAction[]) => void): () => void {
  try {
    const q = query(
      collection(db, ADMIN_ACTIONS_COL),
      orderBy("timestamp", "desc"),
      limit(100)
    );
    return onSnapshot(
      q,
      (snap) => {
        cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as AdminAction) })));
      },
      (err) => {
        console.warn("[firestore] listenToAdminActions error:", err);
      }
    );
  } catch (e) {
    console.warn("[firestore] listenToAdminActions failed:", e);
    return () => {};
  }
}

// ============================================================
// PLAYER SYNC MANAGER
// ============================================================
// Watches the local Zustand store and syncs to Firestore (debounced).
// Listens for remote changes (from admin) and updates the local store.
// Prevents sync loops with an `isRemoteUpdate` flag.

import { usePlayer } from "@/game/store/usePlayer";

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let unsubStore: (() => void) | null = null;
let unsubRemote: (() => void) | null = null;
let isRemoteUpdate = false;
let activePlayerId: string | null = null;

/** Start syncing the local player store to/from Firestore. */
export function initPlayerSync(playerId: string): () => void {
  // Clean up any existing sync
  stopPlayerSync();
  activePlayerId = playerId;

  // Debounced sync (3 seconds after last change)
  const scheduleSync = () => {
    if (isRemoteUpdate) return; // Skip if updating from remote
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      const s = usePlayer.getState();
      if (!s.playerId) return;
      void upsertPlayer(s.playerId, {
        name: s.name,
        username: s.username,
        isGuest: s.isGuest,
        cash: s.cash,
        bank: s.bank,
        earnedTotal: s.earnedTotal,
        spentTotal: s.spentTotal,
        sprayedTotal: s.sprayedTotal,
        hunger: s.hunger,
        energy: s.energy,
        vibe: s.vibe,
        placeId: s.placeId,
        lookId: s.lookId,
        gender: s.gender,
        adult: s.adult,
        banned: s.banned,
        createdAt: s.createdAt,
      });
      // Also update presence
      void updatePresence(playerId, s.name, s.placeId, s.lookId);
    }, 3000);
  };

  // Subscribe to local store changes
  unsubStore = usePlayer.subscribe(scheduleSync);

  // Listen for remote changes (admin actions)
  unsubRemote = listenToPlayer(playerId, (remote) => {
    if (!remote) return;
    const local = usePlayer.getState();
    // Only update if remote is newer (admin made a change)
    if (remote.lastSeen > local.lastSeen + 1000) {
      isRemoteUpdate = true;
      usePlayer.setState({
        cash: remote.cash ?? local.cash,
        bank: remote.bank ?? local.bank,
        hunger: remote.hunger ?? local.hunger,
        energy: remote.energy ?? local.energy,
        vibe: remote.vibe ?? local.vibe,
        banned: remote.banned ?? false,
        lastSeen: remote.lastSeen,
      });
      isRemoteUpdate = false;
    }
  });

  // Heartbeat: refresh presence every 20 seconds so presence TTL stays alive
  // even when the player isn't changing state.
  const s0 = usePlayer.getState();
  void updatePresence(playerId, s0.name, s0.placeId, s0.lookId);
  heartbeatInterval = setInterval(() => {
    const s = usePlayer.getState();
    if (!s.playerId) return;
    void updatePresence(s.playerId, s.name, s.placeId, s.lookId);
  }, 20_000);

  return stopPlayerSync;
}

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

/** Stop syncing and clean up listeners. */
export function stopPlayerSync(): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  if (unsubStore) {
    unsubStore();
    unsubStore = null;
  }
  if (unsubRemote) {
    unsubRemote();
    unsubRemote = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  activePlayerId = null;
}

// ============================================================
// REAL-TIME CHAT
// ============================================================

export interface ChatDoc {
  id?: string;
  playerId: string;
  playerName: string;
  lookId?: string;
  text: string;
  emoji?: string;
  placeId?: string;       // optional: filter by place
  isSystem?: boolean;
  timestamp: number;
}

/** Send a chat message to the global chat collection. */
export async function sendChatMessage(
  msg: Omit<ChatDoc, "id" | "timestamp">
): Promise<void> {
  try {
    await addDoc(collection(db, "chat"), {
      ...msg,
      timestamp: Date.now(),
      serverTime: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[firestore] sendChatMessage failed:", e);
  }
}

/** Real-time listener for global chat (last 50 messages). */
export function listenToChat(cb: (messages: ChatDoc[]) => void): () => void {
  try {
    const q = query(
      collection(db, "chat"),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    return onSnapshot(
      q,
      (snap) => {
        // Reverse so newest is at the bottom
        const msgs = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as ChatDoc) }))
          .reverse();
        cb(msgs);
      },
      (err) => console.warn("[firestore] listenToChat error:", err)
    );
  } catch (e) {
    console.warn("[firestore] listenToChat failed:", e);
    return () => {};
  }
}

// ============================================================
// PRESENCE (who's online + where)
// ============================================================

export interface PresenceDoc {
  id?: string;
  playerId: string;
  playerName: string;
  lookId: string;
  placeId: string;
  lastSeen: number;
}

const PRESENCE_TTL_MS = 60 * 1000; // 1 minute

/** Update / create a player's presence record. */
export async function updatePresence(
  playerId: string,
  playerName: string,
  placeId: string,
  lookId: string
): Promise<void> {
  try {
    await setDoc(
      doc(db, "presence", playerId),
      {
        playerId,
        playerName,
        lookId,
        placeId,
        lastSeen: Date.now(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("[firestore] updatePresence failed:", e);
  }
}

/** Real-time listener for all online players (active in the last minute). */
export function listenToPresence(
  cb: (presence: PresenceDoc[]) => void
): () => void {
  try {
    // We listen to ALL presence docs, but filter client-side by TTL
    // (Firestore `where` on timestamp requires an index — simpler this way)
    const q = query(collection(db, "presence"), limit(200));
    return onSnapshot(
      q,
      (snap) => {
        const now = Date.now();
        const active = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as PresenceDoc) }))
          .filter((p) => now - (p.lastSeen || 0) < PRESENCE_TTL_MS);
        cb(active);
      },
      (err) => console.warn("[firestore] listenToPresence error:", err)
    );
  } catch (e) {
    console.warn("[firestore] listenToPresence failed:", e);
    return () => {};
  }
}

/** Remove a player's presence (called on logout). */
export async function clearPresence(playerId: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "presence", playerId),
      { lastSeen: 0 },
      { merge: true }
    );
  } catch (e) {
    console.warn("[firestore] clearPresence failed:", e);
  }
}
