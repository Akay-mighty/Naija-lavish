"use client";

// Player store: a thin client over the Firestore profile (players/{uid}).
// The server is the source of truth for cash, bank, needs, banned, adult.
// We optimistically mirror the server values here and update via /api/* routes.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { clamp } from "../lib/format";
import { START_PLACE_ID } from "../data/places";
import { LOOK_BY_ID, type Look } from "../data/items";
import type { PlayerProfile } from "@/lib/firestore";

export type Screen = "landing" | "title" | "game";

export interface InventoryEntry {
  id: string;
  equipped: boolean;
  acquiredAt: number;
}

export interface PlayerState {
  // Identity (mirrors Firestore profile)
  uid: string | null;
  name: string;
  username: string;
  gender: "man" | "woman" | "";
  lookId: string;
  isGuest: boolean;
  adult: boolean;
  banned: boolean;

  // Money (server-controlled; client mirrors)
  cash: number;
  bank: number;
  earnedTotal: number;
  spentTotal: number;
  sprayedTotal: number;

  // Needs (0-100)
  hunger: number;
  energy: number;
  vibe: number;

  // World
  placeId: string;
  characterPos: [number, number];
  characterFacing: number;
  inventory: InventoryEntry[];

  // Day/night cycle
  gameHour: number;
  soundOn: boolean;

  // UI
  screen: Screen;

  // Cooldowns (server-controlled)
  cooldowns: Record<string, number>;
}

interface PlayerActions {
  setScreen: (s: Screen) => void;
  /** Hydrate from server profile (called by auth listener). */
  syncFromProfile: (p: PlayerProfile) => void;
  /** Update only client-writable fields (name, look, placeId). */
  setLocalName: (n: string) => void;
  setLook: (id: string) => void;
  setPlace: (id: string) => void;
  moveCharacter: (x: number, z: number, facing?: number) => void;
  adjustNeed: (need: "hunger" | "energy" | "vibe", delta: number) => void;
  setNeed: (need: "hunger" | "energy" | "vibe", value: number) => void;
  /** Apply a server action's result (cash, needs, cooldowns). */
  applyActionResult: (result: any) => void;
  buyItem: (id: string, price: number) => boolean;
  equipItem: (id: string) => void;
  unequipItem: (id: string) => void;
  ownsItem: (id: string) => boolean;
  isEquipped: (id: string) => boolean;
  pushChat: (msg: { who: "me" | "system"; text: string }) => void;
  tick: (dtMs: number) => void;
  setBanned: (b: boolean) => void;
  advanceHour: (deltaHours: number) => void;
  toggleSound: () => void;
  logout: () => void;
}

export type PlayerStore = PlayerState & PlayerActions;

const INITIAL_NEEDS = { hunger: 80, energy: 80, vibe: 70 };

export const usePlayer = create<PlayerStore>()(
  persist(
    (set, get) => ({
      // ---- Initial state ----
      uid: null,
      name: "",
      username: "",
      gender: "",
      lookId: "man-1",
      isGuest: false,
      adult: false,
      banned: false,

      cash: 5000,
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

      gameHour: 9,
      soundOn: true,
      screen: "landing",
      cooldowns: {},

      // ---- Actions ----
      setScreen: (s) => set({ screen: s }),

      syncFromProfile: (p) =>
        set({
          uid: p.uid,
          name: p.name,
          username: p.username,
          isGuest: p.isGuest,
          adult: p.adult,
          cash: p.cash,
          bank: p.bank,
          earnedTotal: p.earnedTotal,
          spentTotal: p.spentTotal,
          sprayedTotal: p.sprayedTotal,
          hunger: p.hunger,
          energy: p.energy,
          vibe: p.vibe,
          placeId: p.placeId,
          lookId: p.lookId,
          gender: p.gender as "man" | "woman",
          banned: p.banned,
          cooldowns: (p as any).cooldowns || {},
        }),

      setLocalName: (n) => set({ name: n }),
      setLook: (id) => set({ lookId: id }),
      setPlace: (id) => set({ placeId: id }),
      moveCharacter: (x, z, facing) =>
        set((s) => ({
          characterPos: [x, z],
          characterFacing: facing ?? s.characterFacing,
        })),

      adjustNeed: (need, delta) =>
        set((s) => ({ [need]: clamp(s[need] + delta) }) as Partial<PlayerState>),
      setNeed: (need, value) =>
        set((s) => ({ [need]: clamp(value) }) as Partial<PlayerState>),

      applyActionResult: (result) =>
        set((s) => {
          if (!result) return {};
          const updates: Partial<PlayerState> = {};
          if (typeof result.cash === "number") updates.cash = result.cash;
          if (typeof result.bank === "number") updates.bank = result.bank;
          if (typeof result.energy === "number") updates.energy = result.energy;
          if (typeof result.vibe === "number") updates.vibe = result.vibe;
          if (typeof result.earnedTotal === "number") updates.earnedTotal = result.earnedTotal;
          if (typeof result.spentTotal === "number") updates.spentTotal = result.spentTotal;
          if (typeof result.sprayedTotal === "number") updates.sprayedTotal = result.sprayedTotal;
          if (result.cooldowns) updates.cooldowns = { ...s.cooldowns, ...result.cooldowns };
          return updates;
        }),

      buyItem: (id, price) => {
        const s = get();
        if (s.cash < price) return false;
        if (s.inventory.some((i) => i.id === id)) {
          set((st) => ({
            inventory: st.inventory.map((i) => (i.id === id ? { ...i, equipped: true } : i)),
          }));
          return true;
        }
        set({
          cash: s.cash - price,
          spentTotal: s.spentTotal + price,
          inventory: [...s.inventory, { id, equipped: false, acquiredAt: Date.now() }],
        });
        return true;
      },

      equipItem: (id) =>
        set((s) => ({
          inventory: s.inventory.map((i) => (i.id === id ? { ...i, equipped: true } : i)),
        })),
      unequipItem: (id) =>
        set((s) => ({
          inventory: s.inventory.map((i) => (i.id === id ? { ...i, equipped: false } : i)),
        })),
      ownsItem: (id) => get().inventory.some((i) => i.id === id),
      isEquipped: (id) => get().inventory.some((i) => i.id === id && i.equipped),

      pushChat: (msg) => {
        // Local-only echo; real chat comes from Firestore listener
        // (kept for optimistic UI)
      },

      tick: (dtMs) => {
        // Needs decay client-side (server is source of truth, will overwrite)
        const s = get();
        const dtSec = dtMs / 1000;
        set({
          hunger: clamp(s.hunger - dtSec / 18),
          energy: clamp(s.energy - (dtSec / 22) * 0.4),
          vibe: clamp(s.vibe - (dtSec / 30) * 0.6),
        });
      },

      setBanned: (b) => set({ banned: b }),
      advanceHour: (delta) => set((s) => ({ gameHour: (s.gameHour + delta + 24) % 24 })),
      toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),

      logout: () =>
        set({
          uid: null,
          name: "",
          username: "",
          gender: "",
          isGuest: false,
          adult: false,
          banned: false,
          cash: 5000,
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
          cooldowns: {},
          screen: "landing",
        }),
    }),
    {
      name: "naijalavish-player",
      storage: createJSONStorage(() => (typeof window === "undefined" ? (undefined as any) : localStorage)),
      partialize: ({ screen, ...rest }) => rest as PlayerState,
      version: 2,
    }
  )
);

export function activeLook(state: PlayerState): Look {
  return LOOK_BY_ID[state.lookId] ?? LOOK_BY_ID["man-1"];
}
