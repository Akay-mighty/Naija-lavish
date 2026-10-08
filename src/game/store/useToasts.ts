"use client";

import { create } from "zustand";

export type ToastKind = "info" | "success" | "warn" | "danger";
export interface Toast {
  id: string;
  kind: ToastKind;
  text: string;
  icon?: string;
}

interface ToastStore {
  toasts: Toast[];
  push: (text: string, kind?: ToastKind, icon?: string, ttlMs?: number) => void;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (text, kind = "info", icon, ttlMs = 3200) => {
    const id = `t${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts, { id, kind, text, icon }] }));
    if (ttlMs > 0) {
      window.setTimeout(() => get().dismiss(id), ttlMs);
    }
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(text: string, kind: ToastKind = "info", icon?: string) {
  useToasts.getState().push(text, kind, icon);
}
