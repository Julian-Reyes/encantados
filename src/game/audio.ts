// Chiptune sound via WebAudio: square/triangle/noise voices, no audio files.
// Music is a tiny step sequencer; each token in a track string is one step (an eighth note,
// or a sixteenth for tracks with div: 4): "C5" = play, "-" = hold the previous note, "." = rest.
// "C5:4" / ".:4" is shorthand for a note or rest lasting 4 steps.

import { G } from "./store";

let ctx: AudioContext | null = null;
let master: GainNode;
let musicBus: GainNode;
let sfxBus: GainNode;
let noiseBuf: AudioBuffer;
type Duty = 0.125 | 0.25 | 0.5;
const pulses = new Map<Duty, PeriodicWave>();

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
  // Game Boy style pulse channels: Fourier series of a pulse wave at each duty cycle.
  for (const duty of [0.125, 0.25, 0.5] as Duty[]) {
    const real = new Float32Array(48);
    const imag = new Float32Array(48);
    for (let n = 1; n < 48; n++) real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    pulses.set(duty, ctx.createPeriodicWave(real, imag));
  }
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

function tone(bus: GainNode, f: number, t: number, dur: number, type: OscillatorType | Duty, vol: number, slide?: number, vibrato = false) {
  if (!ctx || f <= 0) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  if (typeof type === "number") o.setPeriodicWave(pulses.get(type)!);
  else o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  if (vibrato && dur > 0.3) {
    // Delayed wobble on held notes, like the Game Boy sound engine.
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 6;
    depth.gain.setValueAtTime(0, t);
    depth.gain.setValueAtTime(0, t + 0.15);
    depth.gain.linearRampToValueAtTime(14, t + 0.3);
    lfo.connect(depth).connect(o.detune);
    lfo.start(t);
    lfo.stop(t + dur + 0.02);
  }
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
interface Voices {
  lead: string;
  harmony?: string; // second pulse voice, quieter
  bass: string;
  drums?: string; // k = kick, h = hat, s = snare, . = none
}

interface Track extends Voices {
  bpm: number;
  div?: 2 | 4; // steps per beat: 2 = eighths (default), 4 = sixteenths
  intro?: Voices; // plays once before the body starts looping
  leadDuty?: Duty;
  harmonyDuty?: Duty;
}

const SEMI = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function up(n: string, semis: number): string {
  const m = /^([A-G]#?)(\d)$/.exec(n)!;
  const v = SEMI.indexOf(m[1]) + parseInt(m[2]) * 12 + semis;
  return SEMI[v % 12] + Math.floor(v / 12);
}

/** Battle bass: sixteenth-note octave bounce, one root per bar ("A1|B1" splits the bar). */
function bounce(...bars: string[]): string {
  return bars
    .map((bar) => {
      const roots = bar.split("|");
      return roots.map((r) => `${r} ${up(r, 12)} `.repeat(8 / roots.length)).join("");
    })
    .join("");
}

const bars = (...b: string[]) => b.join(" ");

// All melodies are original compositions for this game. The battle themes borrow the
// Game Boy arrangement: a one-shot intro, thin pulse lead plus harmony, a busy sixteenth
// bass, and a separate theme per kind of opponent.
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
  // Wild encounter: E minor, urgent.
  battle: {
    bpm: 164,
    div: 4,
    leadDuty: 0.25,
    harmonyDuty: 0.125,
    intro: {
      lead: bars("E6 D#6 D6 C#6 C6 B5 A#5 A5 G#5 G5 F#5 F5 E5 D#5 D5 C#5", "E5:3 . E5:3 . E5:2 D#5:2 D5:2 C#5:2"),
      harmony: bars(".:16", "B4:3 . B4:3 . B4:2 A#4:2 A4:2 G#4:2"),
      bass: bars("E3 D#3 D3 C#3 C3 B2 A#2 A2 G#2 G2 F#2 F2 E2 D#2 D2 C#2", bounce("B1")),
      drums: bars(".:16", "k . . . k . . . s . h . s . s s"),
    },
    lead: bars(
      "E5:3 B4 E5:2 G5:2 F#5:2 E5:2 D5:2 E5:2", "G5:6 E5:2 C5:4 E5:4",
      "F#5:3 D5 F#5:2 A5:2 G5:2 F#5:2 E5:2 F#5:2", "D#5:8 F#5:4 B5:4",
      "E6:3 B5 G5:2 E5:2 B5:3 G5 E5:4", "C6:3 G5 E5:2 C5:2 E5:2 G5:2 C6:2 B5:2",
      "A5:4 C6:4 B5:4 D#6:4", "E6:8 B5:4 D#5:4",
      "A5:4 B5:4 C6:4 E6:4", "D6:8 B5:4 G5:4",
      "C6:4 A5:4 F5:4 A5:4", "B5:8 A5:4 F#5:4",
      "A5:2 B5:2 C6:2 D6:2 E6:4 C6:4", "D6:2 C6:2 B5:2 A5:2 G5:4 B5:4",
      "C6:4 E6:4 D6:4 F#6:4", "B5:2 A#5 A5 G#5 G5 F#5 F5 E5:2 D#5:2 .:4",
    ),
    harmony: bars(
      "G4:8 B4:8", "E4:8 G4:8", "A4:8 D5:8", "B4:8 A4:8",
      "B4:8 G4:8", "G4:8 E5:8", "E4:4 A4:4 D#4:4 F#4:4", "G4:8 F#4:8",
      "C5:8 E5:8", "B4:8 G4:8", "A4:8 F4:8", "D#5:8 B4:8",
      "C5:8 A4:8", "B4:8 D5:8", "G4:8 A4:8", "F#4:8 .:8",
    ),
    bass: bounce("E2", "C2", "D2", "B1", "E2", "C2", "A1|B1", "E2|B1", "A1", "G1", "F1", "B1", "A1", "G1", "C2|D2", "B1"),
    drums: "k . h . s . h . k . h k s . h h ".repeat(16),
  },
  // Trainer battle: A minor, heroic march.
  trainer: {
    bpm: 170,
    div: 4,
    leadDuty: 0.25,
    harmonyDuty: 0.125,
    intro: {
      lead: bars("A6 E6 C6 A5 E6 C6 A5 E5 C6 A5 E5 C5 A5 E5 C5 A4", "E5:2 . E5 E5:2 . E5 G#5:4 B5:4"),
      harmony: bars(".:16", "B4:2 . B4 B4:2 . B4 E5:4 G#5:4"),
      bass: bounce("A1", "E2"),
      drums: bars("k . . . k . . . k . . . k . . .", "s . . s s . . s k . h . s s s s"),
    },
    lead: bars(
      "A5:4 E5:2 A5:2 C6:4 B5:2 A5:2", "F5:4 A5:2 C6:2 F6:6 E6:2",
      "D6:4 B5:2 G5:2 D6:2 E6:2 D6:2 B5:2", "G#5:8 B5:4 E6:4",
      "A5:4 E5:2 A5:2 C6:4 D6:2 E6:2", "F6:4 E6:2 D6:2 C6:4 A5:4",
      "D6:4 F6:4 E6:4 G#5:4", "A5:12 .:4",
      "C6:2 . C6 E6:2 G6:2 E6:4 C6:4", "B5:2 . B5 D6:2 G6:2 D6:4 B5:4",
      "C6:2 . C6 E6:2 A6:2 G6:4 E6:4", "G#6:8 E6:4 B5:4",
      "A5:4 C6:4 F6:4 E6:4", "D6:4 B5:4 G5:4 B5:4",
      "E6:2 D#6:2 E6:2 F6:2 E6:2 D6:2 C6:2 B5:2", "G#5:4 B5:4 E6:4 .:4",
    ),
    harmony: bars(
      "C5:8 E5:8", "A4:8 C5:8", "B4:8 G4:8", "E5:8 D5:8",
      "C5:8 E5:8", "A5:8 F5:8", "A5:4 D6:4 B5:4 E5:4", "E5:12 .:4",
      "E5:8 G5:8", "D5:8 G5:8", "E5:8 C6:8", "B5:8 G#5:8",
      "F5:8 C6:8", "B5:4 G5:4 D5:4 G5:4", "B5:8 G#5:8", "E5:4 G#5:4 B5:4 .:4",
    ),
    bass: bounce("A1", "F1", "G1", "E2", "A1", "F1", "D2|E2", "A1", "C2", "G1", "A1", "E2", "F1", "G1", "E2", "E2"),
    drums: "k . h . s . h k k . h . s . s s ".repeat(16),
  },
  // Rival battle: D minor, cocky and syncopated.
  rival: {
    bpm: 176,
    div: 4,
    leadDuty: 0.125,
    harmonyDuty: 0.25,
    intro: {
      lead: bars("D6:3 D6:3 D6:2 C6:2 A5:2 F5:2 D5:2", "C#5:2 E5:2 G5:2 A#5:2 A5:8"),
      harmony: bars("A5:3 A5:3 A5:2 .:8", "A4:2 C#5:2 E5:2 G5:2 E5:8"),
      bass: bars("D2:3 D2:3 D2:2 .:8", bounce("A1")),
      drums: bars("k . . k . . k . . . . . . . . .", "k . h s . h k . s s s s s s s s"),
    },
    lead: bars(
      "D5:2 . D5 F5:2 A5:2 G5:2 F5:2 E5:2 F5:2", "D5:6 A#4:2 D5:2 F5:2 A#5:4",
      "C6:2 . C6 A#5:2 A5:2 G5:2 E5:2 G5:4", "A5:8 C#6:4 E6:4",
      "D6:2 . D6 C6:2 A5:2 F5:2 A5:2 D6:4", "A#5:2 . A#5 A5:2 F5:2 D5:2 F5:2 A#5:4",
      "G5:4 A#5:4 A5:4 C#6:4", "D6:8 A5:4 F5:4",
      "F5:4 A5:4 C6:6 A5:2", "E5:4 G5:4 C6:6 G5:2",
      "D5:4 G5:4 A#5:6 G5:2", "C#5:4 E5:4 A5:8",
      "A#5:2 A5:2 G5:2 F5:2 A#5:4 D6:4", "C6:2 A#5:2 A5:2 G5:2 C6:4 E6:4",
      "C#6:2 . C#6 E6:2 A6:2 G6:2 E6:2 C#6:4", "A5:2 . A5 A5:2 . A5 A5:2 A5:2 A5:4",
    ),
    harmony: bars(
      "A4:8 D5:8", "A#4:8 F4:8", "E5:8 C5:8", "E5:8 A5:8",
      "A5:8 F5:8", "F5:8 D5:8", "D5:8 E5:8", "A5:8 D5:8",
      "C5:8 F5:8", "C5:8 E5:8", "A#4:8 D5:8", "A4:8 C#5:8",
      "D5:8 F5:8", "E5:8 G5:8", "A5:8 E5:8", "C#5:8 E5:8",
    ),
    bass: bounce("D2", "A#1", "C2", "A1", "D2", "A#1", "G1|A1", "D2", "F1", "C2", "G1", "A1", "A#1", "C2", "A1", "A1"),
    drums: "k . h s . h k . k . h s . h s s ".repeat(16),
  },
  // Arena leader: C minor into E-flat major, heavy and epic.
  leader: {
    bpm: 152,
    div: 4,
    leadDuty: 0.25,
    harmonyDuty: 0.125,
    intro: {
      lead: bars(
        "C6 B5 A#5 A5 G#5 G5 F#5 F5 E5 D#5 D5 C#5 C5 B4 A#4 A4",
        "G#4:2 . G#4 G#4:2 . G#4 G#4:4 A#4:4", "C5:2 . C5 C5:2 . C5 D5:4 D#5:4", "D5:4 F5:4 G5:8",
      ),
      harmony: bars(".:16", "D#4:2 . D#4 D#4:2 . D#4 D#4:4 F4:4", "G4:2 . G4 G4:2 . G4 A#4:4 C5:4", "B4:4 D5:4 D5:8"),
      bass: bars("C3 B2 A#2 A2 G#2 G2 F#2 F2 E2 D#2 D2 C#2 C2 B1 A#1 A1", bounce("G#1", "C2", "G1")),
      drums: bars(".:16", "k . . k k . . k s . s . s . s .", "k . . k k . . k s . s . s . s .", "s s s s s s s s k . . . k . . ."),
    },
    lead: bars(
      "C5:4 D#5:2 G5:2 C6:6 A#5:2", "G#5:4 G5:2 D#5:2 C5:6 D#5:2",
      "D5:4 F5:2 A#5:2 D6:6 C6:2", "B5:8 G5:4 D5:4",
      "C6:4 D6:2 D#6:2 G6:6 F6:2", "D#6:4 D6:2 C6:2 G#5:6 C6:2",
      "C6:4 G#5:4 B5:4 D6:4", "C6:12 .:4",
      "G5:2 A#5:2 D#6:4 D6:2 C6:2 A#5:4", "F5:2 A#5:2 D6:4 C6:2 A#5:2 A5:4",
      "G#5:2 C6:2 D#6:4 D6:2 C6:2 G#5:4", "G5:8 B5:4 D6:4",
      "D#6:2 . D#6 D6:2 C6:2 A#5:2 G5:2 D#6:4", "D6:2 . D6 C6:2 A#5:2 F5:2 A#5:2 D6:4",
      "C6:2 . C6 D6:2 D#6:2 F6:2 D#6:2 C6:4", "B5:2 C6:2 D6:2 F6:2 G6:4 G5:4",
    ),
    harmony: bars(
      "G4:8 D#5:8", "D#5:8 G#4:8", "A#4:8 F5:8", "D5:8 B4:8",
      "G5:8 A#5:8", "C6:8 D#5:8", "G#5:8 G5:8", "G5:12 .:4",
      "D#5:8 G5:8", "D5:8 F5:8", "D#5:8 C5:8", "D5:8 G5:8",
      "G5:8 D#5:8", "F5:8 D5:8", "G#5:16", "G5:8 B5:4 D5:4",
    ),
    bass: bounce("C2", "G#1", "A#1", "G1", "C2", "G#1", "F1|G1", "C2", "D#2", "A#1", "G#1", "G1", "D#2", "A#1", "G#1", "G1"),
    drums: "k . h . s . h . k k h . s . h s ".repeat(16),
  },
  // Plays after beating a trainer, while the prize money is handed over.
  victoryTrainer: {
    bpm: 140,
    div: 4,
    leadDuty: 0.25,
    harmonyDuty: 0.125,
    lead: bars(
      "E5:2 G5:2 C6:4 G5:2 E5:2 G5:4", "F5:2 A5:2 C6:4 A5:2 F5:2 A5:4",
      "G5:2 B5:2 D6:4 B5:2 G5:2 D6:4", "C6:8 E6:4 .:4",
      "A5:2 C6:2 E6:4 D6:2 C6:2 A5:4", "A5:2 C6:2 F6:4 E6:2 D6:2 C6:4",
      "B5:2 D6:2 G6:4 F6:2 D6:2 B5:4", "C6:4 G5:4 C6:4 .:4",
    ),
    harmony: bars(
      "C5:8 E5:8", "A4:8 C5:8", "B4:8 D5:8", "E5:12 .:4",
      "E5:8 C5:8", "F5:8 A5:8", "G5:8 D5:8", "E5:12 .:4",
    ),
    bass: bounce("C2", "F1", "G1", "C2", "A1", "F1", "G1", "C2"),
    drums: "k . h . s . h . k . h . s . h . ".repeat(8),
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
  const out: string[] = [];
  for (const tok of s.trim().split(/\s+/)) {
    const [n, d] = tok.split(":");
    out.push(n);
    for (let i = 1; i < (d ? parseInt(d) : 1); i++) out.push(n === "." ? "." : "-");
  }
  return out;
}

function parseVoices(v: Voices) {
  return {
    lead: parse(v.lead),
    harmony: v.harmony ? parse(v.harmony) : [],
    bass: parse(v.bass),
    drums: v.drums ? parse(v.drums) : [],
  };
}

function startTrack(name: string, withIntro = true) {
  const c = ensure();
  if (!c) return;
  stopTimer();
  current = name;
  pendingTrack = null;
  step = 0;
  nextTime = Math.max(c.currentTime + 0.05, jingleUntil);
  const tr = TRACKS[name];
  const body = parseVoices(tr);
  let part = tr.intro && withIntro ? parseVoices(tr.intro) : body;
  const stepLen = 60 / tr.bpm / (tr.div ?? 2);
  const leadType = tr.leadDuty ?? "square";
  const harmonyType = tr.harmonyDuty ?? 0.25;
  const schedule = () => {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.25) {
      if (step >= part.lead.length) {
        part = body;
        step = 0;
      }
      const i = step;
      playStep(part.lead, i, nextTime, stepLen, leadType, 0.13, musicBus, true);
      if (part.harmony.length) playStep(part.harmony, i % part.harmony.length, nextTime, stepLen, harmonyType, 0.07, musicBus, true);
      playStep(part.bass, i % part.bass.length, nextTime, stepLen, "triangle", 0.3, musicBus);
      const d = part.drums[i % (part.drums.length || 1)];
      if (d === "k") tone(musicBus, 120, nextTime, 0.08, "sine", 0.5, 40);
      else if (d === "s") noise(musicBus, nextTime, 0.08, 0.25, 2500);
      else if (d === "h") noise(musicBus, nextTime, 0.03, 0.08, 8000, "highpass");
      nextTime += stepLen;
      step++;
    }
  };
  schedule();
  timer = window.setInterval(schedule, 60);
}

function playStep(notes: string[], i: number, t: number, stepLen: number, type: OscillatorType | Duty, vol: number, bus: GainNode, vibrato = false) {
  const n = notes[i];
  if (!n || n === "-" || n === ".") return;
  let len = 1;
  while (notes[i + len] === "-") len++;
  tone(bus, freq(n), t, stepLen * len * 0.92, type, vol, undefined, vibrato);
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
      if (resume && current === resume && G().music) startTrack(resume, false);
      r();
    }, dur * 1000 + 60),
  );
}
