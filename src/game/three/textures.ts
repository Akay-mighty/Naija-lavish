// Procedural CanvasTextures for NaijaLavish buildings.
// Windows, doors, awnings, signboards — all drawn on canvas (no asset files).

import * as THREE from "three";

/** Make a canvas + 2D context at given size. */
function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx };
}

function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// ============================================================
// BUILDING FACE TEXTURE (windows + door + AC + awning + signboard)
// ============================================================

export interface FaceOptions {
  baseColor: string;        // wall color
  windowColor?: string;     // window frame
  litWindowColor?: string;  // lit at night
  rows?: number;            // window rows
  cols?: number;            // window columns
  awningColor?: string;     // awning on ground floor
  signText?: string;        // shop signboard text
  signColor?: string;       // sign background
  hasAC?: boolean;          // AC units on side
  withDoor?: boolean;
}

export function makeBuildingFace(opts: FaceOptions): THREE.CanvasTexture {
  const W = 256, H = 256;
  const { canvas, ctx } = makeCanvas(W, H);
  const rows = opts.rows ?? 3;
  const cols = opts.cols ?? 3;

  // Wall (base color, with subtle vertical gradient)
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, opts.baseColor);
  grad.addColorStop(1, shade(opts.baseColor, -15));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle texture noise
  ctx.fillStyle = "rgba(0,0,0,0.04)";
  for (let i = 0; i < 60; i++) {
    ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }

  // Windows grid (skip the door slot)
  const padX = 20, padTop = 30, padBot = 40;
  const cellW = (W - padX * 2) / cols;
  const cellH = (H - padTop - padBot) / rows;
  const winW = cellW * 0.7;
  const winH = cellH * 0.7;
  const winColor = opts.windowColor ?? "#1a3a5c";
  const litColor = opts.litWindowColor ?? "#fde68a";

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Skip one cell for the door
      if (opts.withDoor && r === rows - 1 && c === Math.floor(cols / 2)) continue;
      const x = padX + c * cellW + (cellW - winW) / 2;
      const y = padTop + r * cellH + (cellH - winH) / 2;
      // Frame
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(x - 2, y - 2, winW + 4, winH + 4);
      // Glass (some lit randomly)
      const lit = Math.random() < 0.35;
      ctx.fillStyle = lit ? litColor : winColor;
      ctx.fillRect(x, y, winW, winH);
      // Cross bars
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(x + winW / 2 - 1, y, 2, winH);
      ctx.fillRect(x, y + winH / 2 - 1, winW, 2);
    }
  }

  // Door (ground floor, center)
  if (opts.withDoor) {
    const dx = padX + Math.floor(cols / 2) * cellW + (cellW - winW * 0.8) / 2;
    const dy = H - padBot + 5;
    const dw = winW * 0.8, dh = padBot - 10;
    ctx.fillStyle = "#2a1a0a";
    ctx.fillRect(dx, dy, dw, dh);
    ctx.fillStyle = "#fbbf24"; // handle
    ctx.fillRect(dx + dw - 8, dy + dh / 2 - 1, 3, 3);
  }

  // Awning (ground floor, full width)
  if (opts.awningColor) {
    const ay = H - padBot - 5;
    ctx.fillStyle = opts.awningColor;
    ctx.fillRect(0, ay, W, 12);
    // Stripes
    ctx.fillStyle = shade(opts.awningColor, -25);
    for (let i = 0; i < W; i += 16) {
      ctx.fillRect(i, ay, 8, 12);
    }
  }

  // Signboard (top of building)
  if (opts.signText) {
    const sy = 6;
    ctx.fillStyle = opts.signColor ?? "#0a4a2a";
    ctx.fillRect(8, sy, W - 16, 22);
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 14px Poppins, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(opts.signText.slice(0, 22), W / 2, sy + 12);
  }

  // AC unit (top right corner)
  if (opts.hasAC) {
    ctx.fillStyle = "#7a7a7a";
    ctx.fillRect(W - 30, 8, 18, 10);
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(W - 28, 10, 14, 6);
  }

  return toTexture(canvas);
}

// ============================================================
// ANKARA / KENTE PATTERN TEXTURE (for owambe awnings, rugs, etc.)
// ============================================================

export function makeAnkaraTexture(colors: string[] = ["#dc2626", "#fbbf24", "#0a4a2a", "#ffffff"]): THREE.CanvasTexture {
  const W = 128, H = 128;
  const { canvas, ctx } = makeCanvas(W, H);
  // Background
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, W, H);
  // Diamond pattern
  const tile = 32;
  for (let y = 0; y < H; y += tile) {
    for (let x = 0; x < W; x += tile) {
      const c = colors[(x / tile + y / tile) % colors.length];
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(x + tile / 2, y);
      ctx.lineTo(x + tile, y + tile / 2);
      ctx.lineTo(x + tile / 2, y + tile);
      ctx.lineTo(x, y + tile / 2);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Dots
  ctx.fillStyle = colors[3] ?? "#fff";
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas);
}

// ============================================================
// ASPHALT TEXTURE (with lane line)
// ============================================================

export function makeAsphaltTexture(withLane: boolean = false): THREE.CanvasTexture {
  const W = 256, H = 256;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(0, 0, W, H);
  // Noise
  for (let i = 0; i < 400; i++) {
    const g = 30 + Math.random() * 25;
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  if (withLane) {
    // Dashed yellow line down the middle
    ctx.fillStyle = "#fde68a";
    for (let y = 0; y < H; y += 32) {
      ctx.fillRect(W / 2 - 1.5, y, 3, 20);
    }
  }
  return toTexture(canvas);
}

// ============================================================
// PLAZA TILE TEXTURE
// ============================================================

export function makePlazaTexture(): THREE.CanvasTexture {
  const W = 256, H = 256;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#d4d4d4";
  ctx.fillRect(0, 0, W, H);
  const tile = 32;
  ctx.strokeStyle = "#a0a0a0";
  ctx.lineWidth = 1;
  for (let i = 0; i <= W; i += tile) {
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i, H);
    ctx.moveTo(0, i); ctx.lineTo(W, i);
    ctx.stroke();
  }
  // Stains
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = "rgba(120,100,60,0.15)";
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, 2 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas);
}

// ============================================================
// GRASS TEXTURE (noisy green)
// ============================================================

export function makeGrassTexture(): THREE.CanvasTexture {
  const W = 256, H = 256;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#4a8c3a";
  ctx.fillRect(0, 0, W, H);
  // Grass blades
  for (let i = 0; i < 800; i++) {
    const g = 80 + Math.random() * 80;
    ctx.fillStyle = `rgb(${g * 0.4},${g},${g * 0.4})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 1, 2 + Math.random() * 2);
  }
  // Dirt patches
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = "rgba(120,80,40,0.25)";
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, 4 + Math.random() * 8, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas);
}

// ============================================================
// ZINC ROOF TEXTURE (corrugated)
// ============================================================

export function makeZincTexture(color: string = "#9ca3af"): THREE.CanvasTexture {
  const W = 256, H = 256;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  // Corrugation lines
  for (let x = 0; x < W; x += 8) {
    ctx.fillStyle = shade(color, -15);
    ctx.fillRect(x, 0, 4, H);
  }
  // Rust spots
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = "rgba(120,60,20,0.4)";
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, 2 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas);
}

// ============================================================
// SIGNBOARD TEXTURE (billboards with Naija slogans)
// ============================================================

const NAIJA_SLOGANS = [
  "NAIJA NO DEY CARRY LAST",
  "WE MOVE 💨",
  "GIDIGBO 24/7",
  "SHARP SHARP",
  "NO TIME TO CHECK TIME",
  "BIG BOY THINGS",
  "OWAMBE LOADING",
  "HUSTLE O, HUSTLE",
];

export function makeBillboardTexture(slogan?: string): THREE.CanvasTexture {
  const W = 256, H = 128;
  const { canvas, ctx } = makeCanvas(W, H);
  const text = slogan ?? NAIJA_SLOGANS[Math.floor(Math.random() * NAIJA_SLOGANS.length)];
  // Background
  ctx.fillStyle = "#0a4a2a";
  ctx.fillRect(0, 0, W, H);
  // Border
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, W - 8, H - 8);
  // Text
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 22px Poppins, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Wrap text
  const words = text.split(" ");
  let line = "", y = H / 2 - 12;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > W - 20) {
      ctx.fillText(line, W / 2, y);
      line = w;
      y += 24;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, W / 2, y);
  return toTexture(canvas);
}

// ============================================================
// HELPERS
// ============================================================

function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + percent));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + percent));
  const b = Math.max(0, Math.min(255, (num & 0xff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Cache textures so we don't re-create them every frame. */
const _cache = new Map<string, THREE.CanvasTexture>();
export function cached(key: string, make: () => THREE.CanvasTexture): THREE.CanvasTexture {
  if (!_cache.has(key)) _cache.set(key, make());
  return _cache.get(key)!;
}
