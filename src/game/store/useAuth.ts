"use client";

import { create } from "zustand";
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  type User,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, getDoc } from "firebase/firestore";

export type AuthStatus = "loading" | "anon" | "player" | "admin" | "signed-out";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  uid: string | null;
  idToken: string | null;
  isAdmin: boolean;
  isPlayer: boolean;     // profile exists in players/{uid}
  soloMode: boolean;      // auth failed — fallback to offline solo
  error: string | null;

  signIn: () => Promise<void>;
  signInAdmin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refresh: () => Promise<void>;
}

let unsubProfile: (() => void) | null = null;
let unsubAdmin: (() => void) | null = null;

export const useAuth = create<AuthState>((set, get) => ({
  status: "loading",
  user: null,
  uid: null,
  idToken: null,
  isAdmin: false,
  isPlayer: false,
  soloMode: false,
  error: null,

  signIn: async () => {
    try {
      const cred = await signInAnonymously(auth);
      const token = await cred.user.getIdToken();
      set({
        status: get().status === "player" ? "player" : "anon",
        user: cred.user,
        uid: cred.user.uid,
        idToken: token,
        soloMode: false,
        error: null,
      });
      // Listen for player profile creation
      if (unsubProfile) unsubProfile();
      unsubProfile = onSnapshot(
        doc(db, "players", cred.user.uid),
        (snap) => {
          set({ isPlayer: snap.exists() });
          if (snap.exists() && get().status === "anon") {
            set({ status: "player" });
          }
        }
      );
    } catch (e: any) {
      console.warn("[auth] anonymous sign-in failed — solo mode:", e?.message);
      set({
        status: "signed-out",
        soloMode: true,
        error: e?.message || "Auth failed",
      });
    }
  },

  signInAdmin: async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      // Check admins/{uid}
      const adminDoc = await getDoc(doc(db, "admins", cred.user.uid));
      if (!adminDoc.exists()) {
        await fbSignOut(auth);
        return { ok: false, error: "Not an admin account." };
      }
      set({
        status: "admin",
        user: cred.user,
        uid: cred.user.uid,
        idToken: token,
        isAdmin: true,
        soloMode: false,
        error: null,
      });
      if (unsubAdmin) unsubAdmin();
      unsubAdmin = onSnapshot(
        doc(db, "admins", cred.user.uid),
        (snap) => {
          if (!snap.exists()) {
            // admin privileges revoked
            set({ isAdmin: false, status: "anon" });
          }
        }
      );
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Login failed." };
    }
  },

  signOut: async () => {
    if (unsubProfile) { unsubProfile(); unsubProfile = null; }
    if (unsubAdmin) { unsubAdmin(); unsubAdmin = null; }
    try { await fbSignOut(auth); } catch {}
    set({
      status: "signed-out",
      user: null,
      uid: null,
      idToken: null,
      isAdmin: false,
      isPlayer: false,
    });
  },

  getIdToken: async () => {
    const u = auth.currentUser;
    if (!u) return get().idToken;
    return await u.getIdToken();
  },

  refresh: async () => {
    const u = auth.currentUser;
    if (!u) return;
    const token = await u.getIdToken(true);
    set({ idToken: token });
  },
}));

// Subscribe to auth state changes
// NOTE: `set` only exists inside the create() callback, so module-level code
// must use useAuth.setState (this was the "set is not defined" crash that left
// the app stuck on the splash screen forever).
if (typeof window !== "undefined") {
  onAuthStateChanged(
    auth,
    async (user) => {
      try {
        if (user) {
          const token = await user.getIdToken();
          const cur = useAuth.getState();
          useAuth.setState({
            user,
            uid: user.uid,
            idToken: token,
            soloMode: false,
            status:
              cur.status === "admin" ? "admin" : user.isAnonymous ? "anon" : "player",
          });
          // Check if profile exists (never let a Firestore error block the UI)
          try {
            const snap = await getDoc(doc(db, "players", user.uid));
            if (snap.exists()) {
              useAuth.setState((st) => ({
                isPlayer: true,
                status: st.status === "anon" ? "player" : st.status,
              }));
            }
          } catch (e: any) {
            console.warn("[auth] profile check failed:", e?.message);
          }
        } else {
          // Not signed in — try anonymous sign-in
          const s = useAuth.getState();
          if (s.status !== "admin" && !s.soloMode) {
            if (s.status === "loading") {
              // leave "loading" until signIn resolves (it falls back to solo mode on failure)
            }
            void s.signIn();
          }
        }
      } catch (e: any) {
        console.warn("[auth] state handler failed — solo mode:", e?.message);
        useAuth.setState({ status: "signed-out", soloMode: true, error: e?.message || "Auth failed" });
      }
    },
    (err) => {
      console.warn("[auth] listener error — solo mode:", err?.message);
      useAuth.setState({ status: "signed-out", soloMode: true, error: err?.message || "Auth failed" });
    }
  );

  // Safety net: never sit on the splash screen forever (slow/blocked network)
  window.setTimeout(() => {
    if (useAuth.getState().status === "loading") {
      console.warn("[auth] timed out — continuing in solo mode");
      useAuth.setState({ status: "signed-out", soloMode: true, error: "Auth timed out" });
    }
  }, 8000);
}
