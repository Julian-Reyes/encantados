// Chiptune sound via WebAudio: square/triangle/noise voices, no audio files.
// Music is a tiny step sequencer; each token in a track string is one eighth note:
//   "C5" = play, "-" = hold the previous note, "." = rest.

import { G } from "./store";

let ctx: AudioContext | null = null;
let master: GainNode;
let musicBus: GainNode;
let sfxBus: GainNode;
let noiseBuf: AudioBuffer;

function ensure(): AudioContext | null {
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  musicBus = ctx.createGain();
  musicBus.gain.value = 0.32;
  musicBus.connect(master);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.7;
  sfxBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

/** Browsers only allow audio after a user gesture; call from any click/keydown. */
export function unlockAudio() {
  ensure();
  if (pendingTrack && G().music) startTrack(pendingTrack);
}

const NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function freq(n: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n);
  if (!m) return 0;
  let semi = NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  semi += (parseInt(m[3]) + 1) * 12;
  return 440 * Math.pow(2, (semi - 69) / 12);
}

function tone(bus: GainNode, f: number, t: number, dur: number, type: OscillatorType, vol: number, slide?: number) {
  if (!ctx || f <= 0) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.008);
  g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.04));
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(bus: GainNode, t: number, dur: number, vol: number, filter = 3000, type: BiquadFilterType = "lowpass") {
  if (!ctx) return;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = filter;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(bus);
  s.start(t);
  s.stop(t + dur + 0.02);
}

// ---------------- SFX ----------------
export type Sfx =
  | "cursor" | "select" | "back" | "bump" | "door" | "encounter" | "hit" | "hitSuper" | "hitWeak"
  | "faint" | "throw" | "shake" | "click" | "breakout" | "exclaim" | "jump" | "run" | "save"
  | "statUp" | "statDown" | "buy" | "flee" | "send" | "evolveTick" | "status";

export function sfx(name: Sfx) {
  if (!G().sound) return;
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + 0.01;
  const b = sfxBus;
  switch (name) {
    case "cursor": tone(b, 1400, t, 0.04, "square", 0.12); break;
    case "select": tone(b, 1000, t, 0.05, "square", 0.15); tone(b, 1500, t + 0.05, 0.07, "square", 0.15); break;
    case "back": tone(b, 900, t, 0.05, "square", 0.12); tone(b, 600, t + 0.05, 0.07, "square", 0.12); break;
    case "bump": tone(b, 110, t, 0.09, "square", 0.25, 70); break;
    case "door": noise(b, t, 0.18, 0.3, 1200); tone(b, 300, t, 0.12, "triangle", 0.3, 150); break;
    case "encounter":
      for (let i = 0; i < 6; i++) tone(b, i % 2 ? 880 : 660, t + i * 0.07, 0.07, "square", 0.18);
      tone(b, 220, t + 0.42, 0.4, "sawtooth", 0.15, 110);
      break;
    case "hit": noise(b, t, 0.16, 0.5, 2500); tone(b, 180, t, 0.1, "square", 0.25, 60); break;
    case "hitSuper": noise(b, t, 0.28, 0.6, 5000); tone(b, 300, t, 0.2, "square", 0.3, 50); noise(b, t + 0.1, 0.2, 0.4, 1500); break;
    case "hitWeak": noise(b, t, 0.1, 0.3, 900); break;
    case "faint": tone(b, 700, t, 0.5, "square", 0.2, 80); break;
    case "throw": tone(b, 300, t, 0.3, "triangle", 0.3, 1200); noise(b, t, 0.3, 0.1, 4000, "highpass"); break;
    case "shake": tone(b, 200, t, 0.06, "square", 0.25); tone(b, 160, t + 0.08, 0.06, "square", 0.25); break;
    case "click": tone(b, 2000, t, 0.03, "square", 0.2); tone(b, 1000, t + 0.04, 0.05, "square", 0.2); break;
    case "breakout": noise(b, t, 0.25, 0.4, 3000); tone(b, 400, t, 0.2, "square", 0.2, 900); break;
    case "exclaim": tone(b, 1200, t, 0.06, "square", 0.2); tone(b, 1800, t + 0.07, 0.12, "square", 0.2); break;
    case "jump": tone(b, 200, t, 0.18, "square", 0.2, 600); break;
    case "run": noise(b, t, 0.1, 0.2, 6000, "highpass"); noise(b, t + 0.12, 0.1, 0.2, 6000, "highpass"); noise(b, t + 0.24, 0.1, 0.2, 6000, "highpass"); break;
    case "save": [523, 659, 784, 1047].forEach((f, i) => tone(b, f, t + i * 0.07, 0.08, "square", 0.14)); break;
    case "statUp": [400, 500, 600, 800].forEach((f, i) => tone(b, f, t + i * 0.06, 0.07, "triangle", 0.3)); break;
    case "statDown": [800, 600, 500, 400].forEach((f, i) => tone(b, f, t + i * 0.06, 0.07, "triangle", 0.3)); break;
    case "buy": tone(b, 1300, t, 0.06, "square", 0.15); tone(b, 1950, t + 0.07, 0.12, "square", 0.15); break;
    case "flee": noise(b, t, 0.4, 0.2, 2000, "bandpass"); tone(b, 500, t, 0.35, "triangle", 0.2, 1500); break;
    case "send": noise(b, t, 0.2, 0.3, 4000, "highpass"); tone(b, 600, t, 0.25, "square", 0.15, 1400); break;
    case "evolveTick": tone(b, 900, t, 0.05, "triangle", 0.25); break;
    case "status": tone(b, 500, t, 0.1, "square", 0.15, 300); tone(b, 500, t + 0.12, 0.1, "square", 0.15, 300); break;
  }
}

// ---------------- Music ----------------
interface Track {
  bpm: number;
  lead: string;
  bass: string;
  drums?: string; // k = kick, h = hat, s = snare, . = none
  loop?: boolean;
}

// All melodies are original compositions for this game.
const TRACKS: Record<string, Track> = {
  town: {
    bpm: 108,
    lead:
      "E5 - G5 - C6 - B5 A5 G5 - E5 - C5 - D5 E5 F5 - A5 - G5 - F5 E5 D5 - - - - - . . " +
      "E5 - G5 - C6 - D6 E6 D6 - C6 - A5 - B5 C6 B5 - G5 - A5 - B5 - C6 - - - - - . .",
    bass:
      "C3 . G3 . C3 . G3 . A2 . E3 . A2 . E3 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 . " +
      "C3 . G3 . C3 . G3 . A2 . E3 . A2 . E3 . G2 . D3 . G2 . D3 . C3 . G3 . C3 . C3 .",
    drums: "k . h . s . h . ".repeat(8),
  },
  route: {
    bpm: 132,
    lead:
      "G5 - A5 B5 - D6 - B5 A5 - F#5 - D5 - E5 F#5 G5 - E5 - B4 - E5 G5 E5 - D5 - C5 - - - " +
      "G5 - A5 B5 - D6 - E6 F#6 - E6 - D6 - A5 - E6 - D6 - C6 - B5 A5 A5 - - - D5 - - - " +
      "B5 - B5 - A5 B5 - G5 A5 - A5 - F#5 A5 - D5 E5 - G5 - B5 - A5 G5 F#5 - - - A5 - - - " +
      "B5 - B5 - A5 B5 - G5 A5 - A5 - F#5 - D5 - C6 - B5 - A5 - F#5 - G5 - - - . . . .",
    bass:
      "G2 . D3 . G2 . D3 . D3 . A2 . D3 . A2 . E2 . B2 . E2 . B2 . C3 . G2 . C3 . G2 . " +
      "G2 . D3 . G2 . D3 . D3 . A2 . D3 . A2 . C3 . G2 . C3 . G2 . D3 . A2 . D3 . A2 . " +
      "E2 . B2 . E2 . B2 . D3 . A2 . D3 . A2 . C3 . G2 . C3 . G2 . D3 . A2 . D3 . A2 . " +
      "E2 . B2 . E2 . B2 . D3 . A2 . D3 . A2 . C3 . G2 . D3 . A2 . G2 . D3 . G2 . . .",
    drums: "k . h k s . h . ".repeat(16),
  },
  battle: {
    bpm: 168,
    lead:
      "A5 - - C6 - - B5 - A5 - E5 - A5 - B5 - C6 - - D6 - - E6 - D6 - C6 - B5 - G5 - " +
      "A5 - - C6 - - B5 - A5 - E5 - F5 - G5 - A5 - C6 - F6 - E6 - E6 - - - G#5 - B5 - " +
      "C6 - B5 - A5 - G5 - F5 - G5 - A5 - - - G5 - F5 - E5 - D5 - E5 - F5 - G5 - - - " +
      "A5 - B5 - C6 - D6 - E6 - - - C6 - - - D6 - - - B5 - - - G#5 - - - E5 - - - ",
    bass:
      "A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 F2 F3 F2 F3 F2 F3 F2 F3 G2 G3 G2 G3 G2 G3 G2 G3 " +
      "A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 F2 F3 F2 F3 F2 F3 F2 F3 E2 E3 E2 E3 E2 E3 E2 E3 " +
      "F2 F3 F2 F3 F2 F3 F2 F3 E2 E3 E2 E3 E2 E3 E2 E3 D2 D3 D2 D3 D2 D3 D2 D3 C3 C4 C3 C4 C3 C4 C3 C4 " +
      "F2 F3 F2 F3 F2 F3 F2 F3 G2 G3 G2 G3 G2 G3 G2 G3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3",
    drums: "k h s h k k s h ".repeat(16),
  },
  trainer: {
    bpm: 176,
    lead:
      "E5 - E5 - G5 - E5 - A5 - - - G5 - E5 - D5 - D5 - F5 - D5 - G5 - - - F5 - D5 - " +
      "C5 - E5 - G5 - C6 - B5 - A5 - G5 - E5 - F5 - - - A5 - - - G#5 - - - B5 - - - " +
      "E5 - E5 - G5 - E5 - A5 - - - G5 - E5 - D5 - D5 - F5 - D5 - G5 - - - F5 - D5 - " +
      "C6 - B5 - A5 - G5 - F5 - E5 - D5 - C5 - B4 - - - E5 - - - E5 - - - . . . . ",
    bass:
      "A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 " +
      "F2 F3 F2 F3 F2 F3 F2 F3 C3 C4 C3 C4 C3 C4 C3 C4 D3 D4 D3 D4 D3 D4 D3 D4 E2 E3 E2 E3 E2 E3 E2 E3 " +
      "A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 " +
      "F2 F3 F2 F3 F2 F3 F2 F3 D2 D3 D2 D3 D2 D3 D2 D3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3",
    drums: "k h s h k h s s ".repeat(16),
  },
  lab: {
    bpm: 100,
    lead:
      "C5 - E5 - G5 - E5 - F5 - A5 - C6 - A5 - G5 - E5 - D5 - E5 - C5 - - - . . . . " +
      "C5 - E5 - G5 - E5 - F5 - A5 - C6 - D6 - E6 - D6 - C6 - B5 - C6 - - - . . . . ",
    bass:
      "C3 . E3 . G3 . E3 . F2 . A2 . C3 . A2 . C3 . G2 . G2 . B2 . C3 . G2 . C3 . . . " +
      "C3 . E3 . G3 . E3 . F2 . A2 . C3 . A2 . G2 . B2 . D3 . G2 . C3 . G2 . C3 . . . ",
  },
};

const JINGLES: Record<string, Track> = {
  victory: { bpm: 150, lead: "C5 E5 G5 C6 - G5 C6 - E6 - - - . .", bass: "C3 . C3 . - G2 C3 - C3 - - - . ." },
  heal: { bpm: 140, lead: "C5 E5 G5 E5 C6 - G5 - C6 - - - .", bass: "C3 . . . A2 - G2 - C3 - - - ." },
  level: { bpm: 200, lead: "C5 E5 G5 C6 E6 G6 - - .", bass: "C3 . G3 . C4 - - - ." },
  item: { bpm: 170, lead: "G5 - G5 A5 B5 - D6 - - - G6 - - - .", bass: "G2 - - - D3 - - - - - G2 - - - ." },
  caught: { bpm: 160, lead: "E5 G5 C6 - G5 - C6 E6 - G6 - - - .", bass: "C3 - E3 - G3 - C3 - - C3 - - - ." },
  evolve: { bpm: 150, lead: "C5 D5 E5 F5 G5 A5 B5 C6 D6 E6 - G6 - - - C7 - - - - .", bass: "C3 - - - F2 - - - G2 - - - C3 - - - - - - - ." },
  flee: { bpm: 200, lead: "E6 C6 A5 E5 .", bass: ". . . . ." },
};

let current: string | null = null;
let pendingTrack: string | null = null;
let timer: number | null = null;
let step = 0;
let nextTime = 0;
let jingleUntil = 0;

function parse(s: string): string[] {
  return s.trim().split(/\s+/);
}

function startTrack(name: string) {
  const c = ensure();
  if (!c) return;
  stopTimer();
  current = name;
  pendingTrack = null;
  step = 0;
  nextTime = Math.max(c.currentTime + 0.05, jingleUntil);
  const tr = TRACKS[name];
  const lead = parse(tr.lead);
  const bass = parse(tr.bass);
  const drums = tr.drums ? parse(tr.drums) : [];
  const len = lead.length;
  const eighth = 60 / tr.bpm / 2;
  const schedule = () => {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.25) {
      const i = step % len;
      playStep(lead, i, nextTime, eighth, "square", 0.13, musicBus);
      playStep(bass, i % bass.length, nextTime, eighth, "triangle", 0.3, musicBus);
      const d = drums[i % (drums.length || 1)];
      if (d === "k") tone(musicBus, 120, nextTime, 0.08, "sine", 0.5, 40);
      else if (d === "s") noise(musicBus, nextTime, 0.08, 0.25, 2500);
      else if (d === "h") noise(musicBus, nextTime, 0.03, 0.08, 8000, "highpass");
      nextTime += eighth;
      step++;
    }
  };
  schedule();
  timer = window.setInterval(schedule, 60);
}

function playStep(notes: string[], i: number, t: number, eighth: number, type: OscillatorType, vol: number, bus: GainNode) {
  const n = notes[i];
  if (!n || n === "-" || n === ".") return;
  let len = 1;
  while (notes[i + len] === "-") len++;
  tone(bus, freq(n), t, eighth * len * 0.92, type, vol);
}

function stopTimer() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
}

export function music(name: string | null) {
  if (name === current && timer !== null) return;
  if (!name || !G().music) {
    stopTimer();
    current = name;
    pendingTrack = name;
    return;
  }
  if (!ctx) {
    pendingTrack = name;
    current = name;
    return;
  }
  startTrack(name);
}

export function refreshMusic() {
  const name = current;
  current = null;
  stopTimer();
  if (G().music && name) music(name);
  else pendingTrack = name;
}

/** Plays a short fanfare over a paused track, resolving when it ends. */
export function jingle(name: keyof typeof JINGLES): Promise<void> {
  const c = G().music || G().sound ? ensure() : null;
  const tr = JINGLES[name];
  const lead = parse(tr.lead);
  const eighth = 60 / tr.bpm / 2;
  const dur = lead.length * eighth;
  if (!c) return new Promise((r) => setTimeout(r, dur * 1000));
  const resume = current;
  stopTimer();
  const t0 = c.currentTime + 0.05;
  const bass = parse(tr.bass);
  for (let i = 0; i < lead.length; i++) {
    playStep(lead, i, t0 + i * eighth, eighth, "square", 0.16, sfxBus);
    playStep(bass, i, t0 + i * eighth, eighth, "triangle", 0.3, sfxBus);
  }
  jingleUntil = t0 + dur;
  return new Promise((r) =>
    setTimeout(() => {
      if (resume && current === resume && G().music) startTrack(resume);
      r();
    }, dur * 1000 + 60),
  );
}
