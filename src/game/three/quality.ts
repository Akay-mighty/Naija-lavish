// Quality settings: Low / Med / High, with auto-downgrade on low FPS.
// Persisted to localStorage. Used by Scene3D to scale shadow map size,
// pixel ratio, fog density, and prop density.

export type Quality = "low" | "med" | "high";

export interface QualityConfig {
  pixelRatio: number;        // devicePixelRatio cap
  shadowMapSize: number;     // shadow map resolution
  fogDensity: number;        // fog near/far
  propDensity: number;       // 0..1 multiplier for instanced props
  trafficCount: number;
  shadowsEnabled: boolean;
  toneMapping: boolean;
}

export const QUALITY_CONFIG: Record<Quality, QualityConfig> = {
  high: {
    pixelRatio: 2,
    shadowMapSize: 2048,
    fogDensity: 1.0,
    propDensity: 1.0,
    trafficCount: 6,
    shadowsEnabled: true,
    toneMapping: true,
  },
  med: {
    pixelRatio: 1.5,
    shadowMapSize: 1024,
    fogDensity: 0.85,
    propDensity: 0.7,
    trafficCount: 4,
    shadowsEnabled: true,
    toneMapping: true,
  },
  low: {
    pixelRatio: 1,
    shadowMapSize: 512,
    fogDensity: 0.6,
    propDensity: 0.4,
    trafficCount: 2,
    shadowsEnabled: false,
    toneMapping: false,
  },
};

const STORAGE_KEY = "naijalavish-quality";

/** Load saved quality (default: med). */
export function loadQuality(): Quality {
  if (typeof window === "undefined") return "med";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Quality | null;
    if (saved && ["low", "med", "high"].includes(saved)) return saved;
  } catch {}
  return "med";
}

/** Save quality setting. */
export function saveQuality(q: Quality): void {
  try { localStorage.setItem(STORAGE_KEY, q); } catch {}
}

/** Auto-downgrade: if FPS < 30 for 2 seconds, drop one level. Returns true if downgraded. */
export class FpsMonitor {
  private frames = 0;
  private lastCheck = performance.now();
  private lowFpsStreak = 0;
  private current: Quality;
  private onDowngrade?: (q: Quality) => void;

  constructor(start: Quality, onDowngrade?: (q: Quality) => void) {
    this.current = start;
    this.onDowngrade = onDowngrade;
  }

  tick(): void {
    this.frames++;
    const now = performance.now();
    const elapsed = now - this.lastCheck;
    if (elapsed >= 1000) {
      const fps = (this.frames * 1000) / elapsed;
      this.frames = 0;
      this.lastCheck = now;
      if (fps < 30) {
        this.lowFpsStreak++;
        if (this.lowFpsStreak >= 2) {
          // Drop one level
          const order: Quality[] = ["high", "med", "low"];
          const idx = order.indexOf(this.current);
          if (idx < order.length - 1) {
            this.current = order[idx + 1];
            saveQuality(this.current);
            console.warn(`[quality] auto-downgrade to ${this.current} (fps=${fps.toFixed(1)})`);
            this.onDowngrade?.(this.current);
          }
          this.lowFpsStreak = 0;
        }
      } else {
        this.lowFpsStreak = 0;
      }
    }
  }

  get currentQuality(): Quality { return this.current; }

  setQuality(q: Quality): void {
    this.current = q;
    saveQuality(q);
  }
}
