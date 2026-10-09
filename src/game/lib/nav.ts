"use client";

// Tiny "router" that keeps the browser Back/Forward buttons working inside the game.
// The whole game lives on ONE page, so we mirror the current screen (and open sheet)
// into the URL hash:
//
//   (no hash)     landing page
//   #title        sign up / log in
//   #game         the city
//   #game/map     the city with the Map sheet open  (people, phone, place work too)
//
// Back closes the open sheet first, then goes back a screen — instead of leaving the site.
// Refresh keeps you where you were.

import { useMemo, useSyncExternalStore } from "react";

export type Screen = "landing" | "title" | "game";
export type SheetName = "place" | "map" | "people" | "phone";
export interface Route {
  screen: Screen;
  sheet: SheetName | null;
}

const EVT = "nl:route";
const SHEETS: string[] = ["place", "map", "people", "phone"];

export function parseHash(hash: string): Route {
  const [s, sheet] = hash.replace(/^#\/?/, "").split("/");
  if (s === "game") {
    return { screen: "game", sheet: SHEETS.includes(sheet) ? (sheet as SheetName) : null };
  }
  if (s === "title") return { screen: "title", sheet: null };
  return { screen: "landing", sheet: null };
}

export function toHash(r: Route): string {
  if (r.screen === "game") return r.sheet ? `#game/${r.sheet}` : "#game";
  if (r.screen === "title") return "#title";
  return "";
}

export function getHash(): string {
  return typeof window === "undefined" ? "" : window.location.hash;
}

export function readRoute(): Route {
  return parseHash(getHash());
}

export function subscribe(cb: () => void): () => void {
  window.addEventListener("popstate", cb);
  window.addEventListener("hashchange", cb);
  window.addEventListener(EVT, cb);
  return () => {
    window.removeEventListener("popstate", cb);
    window.removeEventListener("hashchange", cb);
    window.removeEventListener(EVT, cb);
  };
}

/** Move to a route. "push" adds a Back-button step, "replace" swaps the current one. */
export function go(route: Route, mode: "push" | "replace" = "push") {
  if (typeof window === "undefined") return;
  const base = window.location.pathname + window.location.search;
  const url = base + toHash(route);
  if (url === base + window.location.hash) return; // already there
  try {
    if (mode === "push") window.history.pushState({ nl: 1 }, "", url);
    else window.history.replaceState({ nl: 1 }, "", url);
  } catch {
    window.location.hash = toHash(route);
  }
  window.dispatchEvent(new Event(EVT));
}

// ---- Sheets (map / people / phone / place) -------------------------------------------

// true while the sheet that is open right now was opened by a push in THIS page session,
// which means closing it can simply go "back" one step.
let sheetPushed = false;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    sheetPushed = readRoute().sheet !== null;
  });
}

export function openSheet(sheet: SheetName) {
  if (readRoute().sheet) {
    go({ screen: "game", sheet }, "replace"); // switching sheets: no extra Back step
  } else {
    sheetPushed = true;
    go({ screen: "game", sheet }, "push");
  }
}

export function closeSheet() {
  if (!readRoute().sheet) return;
  if (sheetPushed) {
    sheetPushed = false;
    window.history.back();
  } else {
    go({ screen: "game", sheet: null }, "replace");
  }
}

/** React hook: the current route, updates on Back/Forward and on go(). */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => "");
  return useMemo(() => parseHash(hash), [hash]);
}
