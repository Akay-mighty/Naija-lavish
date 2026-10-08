// Naira formatting helpers (no Intl naira polyfill needed)

export function naira(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  // Use Naira sign ₦ with thousands separators
  return sign + "₦" + abs.toLocaleString("en-NG");
}

export function shortNaira(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}₦${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000)     return `${sign}₦${(abs / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}k`;
  return `${sign}₦${abs}`;
}

// Clamp helper
export function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

// Promise sleep
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Color utils for Three.js
export function hexToInt(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

// Distance helper (2D, used for pathing)
export function dist2(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz);
}

// Lerp
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Time-of-day string from game hour 0-24
export function clockFromHour(h: number): string {
  const hr = Math.floor(h) % 24;
  const mn = Math.floor((h % 1) * 60);
  return `${hr.toString().padStart(2, "0")}:${mn.toString().padStart(2, "0")}`;
}

// Whether it's "night" in the game (for mood)
export function isNight(h: number): boolean {
  const hr = h % 24;
  return hr < 6 || hr >= 19;
}
