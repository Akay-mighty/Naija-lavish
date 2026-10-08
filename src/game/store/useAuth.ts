"use client";

import { create } from "zustand";
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
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
  isPlayer: boolean;
  soloMode: boolean;
  error: string | null;

  signIn: () => Promise<void>;
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  signInAdmin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refresh: () => Promise<void>;
}

let unsubProfile: (() => void) | null = null;
let unsubAdmin: (() => void) | null = null;

const googleProvider = new GoogleAuthProvider();

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
      set({ status: "signed-out", soloMode: true, error: e?.message || "Auth failed" });
    }
  },

  signInWithGoogle: async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const token = await cred.user.getIdToken();
      set({
        status: "player",
        user: cred.user,
        uid: cred.user.uid,
        idToken: token,
        soloMode: false,
        error: null,
      });
      if (unsubProfile) unsubProfile();
      unsubProfile = onSnapshot(
        doc(db, "players", cred.user.uid),
        (snap) => {
          set({ isPlayer: snap.exists() });
          if (snap.exists()) set({ status: "player" });
        }
      );
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Google sign-in failed." };
    }
  },

  signInAdmin: async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      const adminDoc = await getDoc(doc(db, "admins", cred.user.uid));
      if (!adminDoc.exists) {
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
          if (!snap.exists()) set({ isAdmin: false, status: "anon" });
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
if (typeof window !== "undefined") {
  onAuthStateChanged(
    auth,
    async (user) => {
      try {
        if (user) {
          // EXISTING SESSION — user is already signed in (Google or anonymous).
          // Just refresh the token + check profile. Do NOT create a new anon user.
          const token = await user.getIdToken();
          const cur = useAuth.getState();
          useAuth.setState({
            user,
            uid: user.uid,
            idToken: token,
            soloMode: false,
            status: cur.status === "admin" ? "admin" : user.isAnonymous ? "anon" : "player",
          });
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
          // NOT signed in — only auto-sign-in anonymously if we've never had a session.
          // This prevents creating a new anon user on every refresh (which would log out
          // the previous session). The TitleScreen triggers sign-in when the user clicks.
          const s = useAuth.getState();
          if (s.status === "loading") {
            // First load — don't auto-sign-in; let user choose from TitleScreen
            useAuth.setState({ status: "signed-out" });
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

  // Safety net: never sit on splash forever
  window.setTimeout(() => {
    if (useAuth.getState().status === "loading") {
      useAuth.setState({ status: "signed-out" });
    }
  }, 8000);
}
