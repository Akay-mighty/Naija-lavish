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

// Looping ambient sounds (start/stop controlled)
type LoopName = "generator" | "afrobeat";

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;
  private loops: Record<LoopName, { stop: () => void } | null> = {
    generator: null,
    afrobeat: null,
  };

  constructor() {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("naijalavish-muted");
      if (saved === "true") this.muted = true;
    } catch {}
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      try {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      } catch { return null; }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setMuted(m: boolean) {
    this.muted = m;
    try { localStorage.setItem("naijalavish-muted", m ? "true" : "false"); } catch {}
    if (m) this.stopAllLoops();
  }

  isMuted() { return this.muted; }

  private tone(ctx: AudioContext, freq: number, durationMs: number, opts: {
    type?: OscillatorType; startGain?: number; endFreq?: number; delayMs?: number;
  } = {}) {
    const { type = "sine", startGain = 0.15, endFreq, delayMs = 0 } = opts;
    const now = ctx.currentTime + delayMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + durationMs / 1000);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(startGain, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.05);
  }

  play(name: SfxName): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    switch (name) {
      case "cashEarn":
        this.tone(ctx, 880, 100, { type: "triangle", startGain: 0.18 });
        this.tone(ctx, 1320, 220, { type: "triangle", startGain: 0.18, delayMs: 90 });
        break;
      case "cashSpend":
        this.tone(ctx, 660, 280, { type: "sine", startGain: 0.14, endFreq: 220 });
        break;
      case "spray":
        for (let i = 0; i < 5; i++) this.tone(ctx, 1200 + i * 80, 60, { type: "square", startGain: 0.08, delayMs: i * 50 });
        break;
      case "arrive":
        this.tone(ctx, 523, 120, { type: "sine", startGain: 0.16 });
        this.tone(ctx, 659, 120, { type: "sine", startGain: 0.16, delayMs: 100 });
        this.tone(ctx, 784, 200, { type: "sine", startGain: 0.16, delayMs: 200 });
        break;
      case "message":
        this.tone(ctx, 440, 80, { type: "sine", startGain: 0.10, endFreq: 660 });
        break;
      case "warn":
        this.tone(ctx, 220, 200, { type: "sawtooth", startGain: 0.12 });
        break;
      case "click":
        this.tone(ctx, 800, 40, { type: "square", startGain: 0.06, endFreq: 600 });
        break;
      case "ban":
        this.tone(ctx, 110, 400, { type: "sawtooth", startGain: 0.20, endFreq: 80 });
        break;
      case "rest":
        this.tone(ctx, 330, 600, { type: "sine", startGain: 0.08 });
        this.tone(ctx, 440, 600, { type: "sine", startGain: 0.06, delayMs: 100 });
        break;
      case "phone":
        for (let i = 0; i < 3; i++) this.tone(ctx, 180, 100, { type: "square", startGain: 0.10, delayMs: i * 150 });
        break;
    }
  }

  /** Start a looping ambient sound. Safe to call multiple times — only one instance per name. */
  startLoop(name: LoopName): void {
    if (this.muted) return;
    if (this.loops[name]) return; // already playing
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (name === "generator") {
      // Low-pitched generator hum + slight detune for realism
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = "sawtooth";
      osc1.frequency.value = 80;
      osc2.type = "sawtooth";
      osc2.frequency.value = 82; // slight detune
      gain.gain.value = 0.04;
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc2.start();
      this.loops.generator = {
        stop: () => {
          try { osc1.stop(); osc2.stop(); osc1.disconnect(); osc2.disconnect(); gain.disconnect(); } catch {}
        },
      };
    } else if (name === "afrobeat") {
      // Simple ~100 BPM afrobeat loop: kick on 1 and 3, clap on 2 and 4, hat every 8th
      const bpm = 100;
      const beatMs = 60_000 / bpm;
      let step = 0;
      const interval = setInterval(() => {
        if (this.muted) return;
        const pos = step % 8;
        if (pos === 0 || pos === 4) this.tone(ctx, 60, 120, { type: "sine", startGain: 0.18 }); // kick
        if (pos === 2 || pos === 6) this.tone(ctx, 1500, 50, { type: "square", startGain: 0.04 }); // clap
        this.tone(ctx, 8000, 20, { type: "square", startGain: 0.02 }); // hat
        step++;
      }, beatMs / 2); // 8th notes
      this.loops.afrobeat = {
        stop: () => clearInterval(interval),
      };
    }
  }

  stopLoop(name: LoopName): void {
    if (this.loops[name]) {
      this.loops[name]!.stop();
      this.loops[name] = null;
    }
  }

  stopAllLoops(): void {
    (Object.keys(this.loops) as LoopName[]).forEach((n) => this.stopLoop(n));
  }
}

export const sfx = new SoundManager();
