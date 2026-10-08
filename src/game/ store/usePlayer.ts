"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { clamp } from "../lib/format";
import { START_PLACE_ID } from "../data/places";
import { LOOK_BY_ID, type Look } from "../data/items";

export type Screen = "landing" | "title" | "game";

export interface InventoryEntry {
  id: string;
  equipped: boolean;
  acquiredAt: number;
}

export interface ChatMessage {
  id: string;
  who: "me" | "npc" | "system";
  name?: string;
  text: string;
  emoji?: string;
  ts: number;
}

export interface PlayerState {
  // Identity
  screen: Screen;
  name: string;
  username: string;
  gender: "man" | "woman" | "";
  lookId: string;
  isGuest: boolean;
  adult: boolean;

  // Firebase / Firestore
  playerId: string | null;   // Firestore doc ID (null = local-only / not synced yet)
  banned: boolean;             // set by admin via Firestore

  // Money
  cash: number;          // wallet
  bank: number;          // bank balance
  earnedTotal: number;
  spentTotal: number;
  sprayedTotal: number;

  // Needs (0-100)
  hunger: number;        // Belle
  energy: number;
  vibe: number;

  // World
  placeId: string;
  characterPos: [number, number];  // world x, z
  characterFacing: number;        // radians
  inventory: InventoryEntry[];

  // Chat log (in-place, since no server)
  chat: ChatMessage[];

  // Bookkeeping
  createdAt: number;
  lastSeen: number;
  lastTickAt: number;     // ms epoch of last needs-decay tick
  cooldowns: Record<string, number>; // actionId -> ms epoch when ready

  // Day/night cycle: game hour 0-24 (advances 1 hour every 90 sec real time)
  gameHour: number;
  soundOn: boolean;

  // UI state (not persisted; ephemeral)
  uiReady?: boolean;
}

interface PlayerActions {
  setScreen: (s: Screen) => void;
  createGuest: (name: string, gender: "man" | "woman", lookId: string) => void;
  createAccount: (
    name: string, username: string, gender: "man" | "woman", lookId: string, adult: boolean
  ) => void;
  logout: () => void;
  setPlace: (id: string) => void;
  moveCharacter: (x: number, z: number, facing?: number) => void;
  adjustCash: (delta: number) => void;
  adjustBank: (delta: number) => void;
  adjustNeed: (need: "hunger" | "energy" | "vibe", delta: number) => void;
  setNeed: (need: "hunger" | "energy" | "vibe", value: number) => void;
  buyItem: (id: string, price: number) => boolean;
  equipItem: (id: string) => void;
  unequipItem: (id: string) => void;
  ownsItem: (id: string) => boolean;
  isEquipped: (id: string) => boolean;
  workAction: (actionId: string, reward: number, energy: number, hunger: number, vibe: number) => boolean;
  spray: (amount: number) => boolean;
  rest: (energyGain: number, vibeGain: number) => void;
  pushChat: (msg: Omit<ChatMessage, "id" | "ts">) => void;
  clearChat: () => void;
  tick: (dtMs: number) => void;     // decay needs over time
  setBanned: (b: boolean) => void;  // admin-controlled
  setPlayerId: (id: string | null) => void;
  advanceHour: (deltaHours: number) => void;
  toggleSound: () => void;
}

export type PlayerStore = PlayerState & PlayerActions;

const INITIAL_NEEDS = { hunger: 80, energy: 80, vibe: 70 };
const STARTING_CASH = 5000;

// Generate a stable player ID for Firestore
function genPlayerId(prefix: "guest" | "user", username?: string): string {
  if (prefix === "user" && username) return `user_${username.toLowerCase()}`;
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export const usePlayer = create<PlayerStore>()(
  persist(
    (set, get) => ({
      // ---- Initial state ----
      screen: "landing",
      name: "",
      username: "",
      gender: "",
      lookId: "man-1",
      isGuest: false,
      adult: false,

      playerId: null,
      banned: false,

      cash: STARTING_CASH,
      bank: 0,
      earnedTotal: 0,
      spentTotal: 0,
      sprayedTotal: 0,

      hunger: INITIAL_NEEDS.hunger,
      energy: INITIAL_NEEDS.energy,
      vibe: INITIAL_NEEDS.vibe,

      placeId: START_PLACE_ID,
      characterPos: [0, 0],
      characterFacing: 0,
      inventory: [],

      chat: [
        {
          id: "sys-welcome",
          who: "system",
          text: "Welcome to NaijaLavish. Tap any place on the map to walk there. Tap People to talk to who's around.",
          ts: Date.now(),
        },
      ],

      createdAt: Date.now(),
      lastSeen: Date.now(),
      lastTickAt: Date.now(),
      cooldowns: {},

      gameHour: 9,  // start at 9 AM
      soundOn: true,

      // ---- Actions ----
      setScreen: (s) => set({ screen: s }),

      createGuest: (name, gender, lookId) =>
        set({
          screen: "game",
          name,
          gender,
          lookId,
          isGuest: true,
          adult: true,
          playerId: genPlayerId("guest"),
          banned: false,
          createdAt: Date.now(),
          lastTickAt: Date.now(),
        }),

      createAccount: (name, username, gender, lookId, adult) =>
        set({
          screen: "game",
          name,
          username,
          gender,
          lookId,
          isGuest: false,
          adult,
          playerId: genPlayerId("user", username),
          banned: false,
          createdAt: Date.now(),
          lastTickAt: Date.now(),
        }),

      logout: () =>
        set({
          screen: "landing",
          name: "",
          username: "",
          gender: "",
          isGuest: false,
          adult: false,
          playerId: null,
          banned: false,
          cash: STARTING_CASH,
          bank: 0,
          earnedTotal: 0,
          spentTotal: 0,
          sprayedTotal: 0,
          hunger: INITIAL_NEEDS.hunger,
          energy: INITIAL_NEEDS.energy,
          vibe: INITIAL_NEEDS.vibe,
          placeId: START_PLACE_ID,
          characterPos: [0, 0],
          inventory: [],
          chat: [],
          cooldowns: {},
        }),

      setBanned: (b) => set({ banned: b }),
      setPlayerId: (id) => set({ playerId: id }),

      advanceHour: (deltaHours) =>
        set((s) => ({ gameHour: (s.gameHour + deltaHours + 24) % 24 })),

      toggleSound: () =>
        set((s) => ({ soundOn: !s.soundOn })),

      setPlace: (id) => set({ placeId: id }),
      moveCharacter: (x, z, facing) =>
        set((s) => ({
          characterPos: [x, z],
          characterFacing: facing ?? s.characterFacing,
        })),

      adjustCash: (delta) =>
        set((s) => ({
          cash: Math.max(0, s.cash + delta),
          earnedTotal: delta > 0 ? s.earnedTotal + delta : s.earnedTotal,
          spentTotal: delta < 0 ? s.spentTotal + Math.abs(delta) : s.spentTotal,
        })),

      adjustBank: (delta) =>
        set((s) => ({ bank: Math.max(0, s.bank + delta) })),

      adjustNeed: (need, delta) =>
        set((s) => ({ [need]: clamp(s[need] + delta) }) as Partial<PlayerState>),

      setNeed: (need, value) =>
        set((s) => ({ [need]: clamp(value) }) as Partial<PlayerState>),

      buyItem: (id, price) => {
        const s = get();
        if (s.cash < price) return false;
        if (s.inventory.some((i) => i.id === id)) {
          // Already owned, just equip
          set((st) => ({
            inventory: st.inventory.map((i) =>
              i.id === id ? { ...i, equipped: true } : i
            ),
          }));
          return true;
        }
        set({
          cash: s.cash - price,
          spentTotal: s.spentTotal + price,
          inventory: [
            ...s.inventory,
            { id, equipped: false, acquiredAt: Date.now() },
          ],
        });
        return true;
      },

      equipItem: (id) =>
        set((s) => ({
          inventory: s.inventory.map((i) =>
            i.id === id ? { ...i, equipped: true } : i
          ),
        })),

      unequipItem: (id) =>
        set((s) => ({
          inventory: s.inventory.map((i) =>
            i.id === id ? { ...i, equipped: false } : i
          ),
        })),

      ownsItem: (id) => get().inventory.some((i) => i.id === id),

      isEquipped: (id) =>
        get().inventory.some((i) => i.id === id && i.equipped),

      workAction: (actionId, reward, energy, hunger, vibe) => {
        const s = get();
        // Energy gate
        if (s.energy < energy) return false;
        // Cooldown gate
        const now = Date.now();
        const ready = s.cooldowns[actionId] ?? 0;
        if (now < ready) return false;

        set({
          cash: Math.max(0, s.cash + reward),
          earnedTotal: s.earnedTotal + Math.max(0, reward),
          spentTotal: reward < 0 ? s.spentTotal + Math.abs(reward) : s.spentTotal,
          hunger: clamp(s.hunger - hunger),
          energy: clamp(s.energy - energy),
          vibe: clamp(s.vibe - vibe),
          cooldowns: { ...s.cooldowns, [actionId]: now + 25_000 },
          lastSeen: now,
        });
        return true;
      },

      spray: (amount) => {
        const s = get();
        if (s.cash < amount) return false;
        set({
          cash: s.cash - amount,
          sprayedTotal: s.sprayedTotal + amount,
          spentTotal: s.spentTotal + amount,
          vibe: clamp(s.vibe + Math.floor(amount / 30)),
          lastSeen: Date.now(),
        });
        return true;
      },

      rest: (energyGain, vibeGain) =>
        set((s) => ({
          energy: clamp(s.energy + energyGain),
          vibe: clamp(s.vibe + vibeGain),
          hunger: clamp(s.hunger - 4),
          lastSeen: Date.now(),
        })),

      pushChat: (msg) =>
        set((s) => ({
          chat: [
            ...s.chat.slice(-49),
            {
              ...msg,
              id: `m${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              ts: Date.now(),
            },
          ],
        })),

      clearChat: () => set({ chat: [] }),

      tick: (dtMs) => {
        const s = get();
        // Decay needs by ~1 per 18 seconds (slow), vibes 1 per 30 seconds
        const dtSec = dtMs / 1000;
        const dh = dtSec / 18;
        const de = dtSec / 22;
        const dv = dtSec / 30;
        set({
          hunger: clamp(s.hunger - dh),
          energy: clamp(s.energy - de * 0.4), // energy decays slower
          vibe: clamp(s.vibe - dv * 0.6),
          lastTickAt: Date.now(),
        });
      },
    }),
    {
      name: "naijalavish-player",
      storage: createJSONStorage(() => (typeof window === "undefined" ? (undefined as any) : localStorage)),
      // Don't persist screen (we always start on landing for a fresh UX)
      partialize: ({ screen, ...rest }) => rest as PlayerState,
      version: 1,
    }
  )
);

// Selector helper: vibe bonus from equipped items
import { ITEM_BY_ID } from "../data/items";
export function totalVibeBonus(inv: InventoryEntry[]): number {
  return inv
    .filter((i) => i.equipped)
    .reduce((acc, i) => acc + (ITEM_BY_ID[i.id]?.vibeBoost ?? 0), 0);
}

// Get the active look (with equipped outfit override if any)
export function activeLook(state: PlayerState): Look {
  return LOOK_BY_ID[state.lookId] ?? LOOK_BY_ID["man-1"];
}
