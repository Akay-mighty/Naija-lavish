"use client";

// SoundManager — generates simple SFX using the Web Audio API.
// No asset files needed; works offline; respects user's mute preference.

type SfxName =
  | "cashEarn"      // ka-ching (rising tones)
  | "cashSpend"     // whoosh down
  | "spray"         // rapid clicks (money rain)
  | "arrive"        // ascending chime
  | "message"       // soft pop
  | "warn"          // low beep
  | "click"         // soft click
  | "ban"           // low buzzer
  | "rest"          // soft hum
  | "phone";        // phone vibration

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor() {
    if (typeof window === "undefined") return;
    // Load mute preference from localStorage
    try {
      const saved = localStorage.getItem("naijalavish-muted");
      if (saved === "true") this.muted = true;
    } catch {}
  }

  /** Lazily create the AudioContext (browser policy: requires user gesture). */
  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      try {
        const AC =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      } catch {
        return null;
      }
    }
    // Resume if suspended (Chrome autoplay policy)
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      localStorage.setItem("naijalavish-muted", m ? "true" : "false");
    } catch {}
  }

  isMuted() {
    return this.muted;
  }

  /** Play a single tone with envelope. */
  private tone(
    ctx: AudioContext,
    freq: number,
    durationMs: number,
    opts: {
      type?: OscillatorType;
      startGain?: number;
      endFreq?: number;
      delayMs?: number;
    } = {}
  ) {
    const {
      type = "sine",
      startGain = 0.15,
      endFreq,
      delayMs = 0,
    } = opts;
    const now = ctx.currentTime + delayMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFreq),
        now + durationMs / 1000
      );
    }
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(startGain, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.05);
  }

  /** Play a named SFX. */
  play(name: SfxName): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    switch (name) {
      case "cashEarn":
        // Ka-ching: 2 rising tones
        this.tone(ctx, 880, 100, { type: "triangle", startGain: 0.18 });
        this.tone(ctx, 1320, 220, {
          type: "triangle",
          startGain: 0.18,
          delayMs: 90,
        });
        break;

      case "cashSpend":
        // Whoosh down
        this.tone(ctx, 660, 280, {
          type: "sine",
          startGain: 0.14,
          endFreq: 220,
        });
        break;

      case "spray":
        // Money rain: 5 quick high clicks
        for (let i = 0; i < 5; i++) {
          this.tone(ctx, 1200 + i * 80, 60, {
            type: "square",
            startGain: 0.08,
            delayMs: i * 50,
          });
        }
        break;

      case "arrive":
        // Ascending chime: 3 notes up
        this.tone(ctx, 523, 120, { type: "sine", startGain: 0.16 }); // C5
        this.tone(ctx, 659, 120, {
          type: "sine",
          startGain: 0.16,
          delayMs: 100,
        }); // E5
        this.tone(ctx, 784, 200, {
          type: "sine",
          startGain: 0.16,
          delayMs: 200,
        }); // G5
        break;

      case "message":
        // Soft pop
        this.tone(ctx, 440, 80, {
          type: "sine",
          startGain: 0.10,
          endFreq: 660,
        });
        break;

      case "warn":
        // Low beep (warning)
        this.tone(ctx, 220, 200, { type: "sawtooth", startGain: 0.12 });
        break;

      case "click":
        // Soft click
        this.tone(ctx, 800, 40, {
          type: "square",
          startGain: 0.06,
          endFreq: 600,
        });
        break;

      case "ban":
        // Low buzzer (banned)
        this.tone(ctx, 110, 400, {
          type: "sawtooth",
          startGain: 0.20,
          endFreq: 80,
        });
        break;

      case "rest":
        // Soft hum (resting)
        this.tone(ctx, 330, 600, { type: "sine", startGain: 0.08 });
        this.tone(ctx, 440, 600, {
          type: "sine",
          startGain: 0.06,
          delayMs: 100,
        });
        break;

      case "phone":
        // Phone vibration: 3 short pulses
        for (let i = 0; i < 3; i++) {
          this.tone(ctx, 180, 100, {
            type: "square",
            startGain: 0.10,
            delayMs: i * 150,
          });
        }
        break;
    }
  }
}

// Singleton
export const sfx = new SoundManager();
