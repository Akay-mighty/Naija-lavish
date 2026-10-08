// Shared helpers for API routes: token verification, ban check, profile load.

import { adminAuth, adminDb } from "./admin";
import type { DecodedIdToken } from "firebase-admin/auth";

export const STARTING_CASH = 5000;
export const CHAT_RATE_LIMIT_MS = 2000;       // 1 message per 2s per uid
export const CHAT_MAX_LEN = 200;
export const PRESENCE_STALE_MS = 30_000;

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
}

/** Verify the Firebase ID token from the Authorization header. */
export async function verifyToken(req: Request): Promise<DecodedIdToken | null> {
  const auth = req.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    return await adminAuth().verifyIdToken(match[1]);
  } catch {
    return null;
  }
}

/** Lighter guard: only require a valid ID token (does not need a player profile). */
export async function requireToken(req: Request): Promise<
  { ok: true; uid: string; token: DecodedIdToken } | { ok: false; res: Response }
> {
  const token = await verifyToken(req);
  if (!token) return { ok: false, res: error("Unauthorized", 401) };
  return { ok: true, uid: token.uid, token };
}

/** Load a player profile. Returns null if not found. */
export async function loadPlayer(uid: string): Promise<PlayerProfile | null> {
  const snap = await adminDb().doc(`players/${uid}`).get();
  if (!snap.exists) return null;
  return snap.data() as PlayerProfile;
}

/** Reject if player is banned. */
export function isBanned(p: PlayerProfile | null): boolean {
  return Boolean(p?.banned);
}

/** Standard JSON response helper. */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Standard error response. */
export function error(message: string, status = 400): Response {
  return json({ ok: false, error: message }, status);
}

/** Guard: must be signed in (valid ID token). Returns decoded token + profile. */
export async function requirePlayer(req: Request): Promise<
  { ok: true; uid: string; token: DecodedIdToken; player: PlayerProfile } | { ok: false; res: Response }
> {
  const token = await verifyToken(req);
  if (!token) return { ok: false, res: error("Unauthorized", 401) };
  const player = await loadPlayer(token.uid);
  if (!player) return { ok: false, res: error("Player not initialized. Call /api/player/init first.", 403) };
  if (isBanned(player)) return { ok: false, res: error("Account banned.", 403) };
  return { ok: true, uid: token.uid, token, player };
}

/** Guard: must be an admin (admins/{uid} doc exists). */
export async function requireAdmin(req: Request): Promise<
  { ok: true; uid: string } | { ok: false; res: Response }
> {
  const token = await verifyToken(req);
  if (!token) return { ok: false, res: error("Unauthorized", 401) };
  const adminDoc = await adminDb().doc(`admins/${token.uid}`).get();
  if (!adminDoc.exists) return { ok: false, res: error("Forbidden — admin only", 403) };
  return { ok: true, uid: token.uid };
}
