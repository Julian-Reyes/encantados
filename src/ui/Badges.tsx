// Gym badges for the trainer card, styled like military medals: one bold silhouette per
// badge (cross, star, cog, order star...) in antique metal with enamel inlays, and the
// leader's gem (see docs/ROADMAP.md) set as the centre stone. Unearned badges are a dark
// silhouette of the medal.

import type { ReactNode } from "react";
import type { L } from "../data/types";

type Pt = [number, number];
type Metal = "silver" | "gold" | "bronze" | "rose" | "iron" | "red" | "white";

interface BadgeDef {
  flag: string;
  name: L;
  color: string;
  medal: (m: Painter) => ReactNode;
}

// ---------------------------------------------------------------- shapes (200×200 box)
const C = 100;
const rad = (deg: number) => (deg * Math.PI) / 180;
const at = (deg: number, r: number, cx = C, cy = C): Pt => [cx + Math.cos(rad(deg - 90)) * r, cy + Math.sin(rad(deg - 90)) * r];

function star(n: number, ro: number, ri: number, rot = 0): Pt[] {
  return Array.from({ length: n * 2 }, (_, i) => at(rot + (i * 180) / n, i % 2 ? ri : ro));
}

/** Cross pattée: arms flare from `inner` to `outer`; ends bulge out to `end`, or are straight when `end` equals `outer`. */
function cross(inner: number, outer: number, spread: number, end: number): Pt[] {
  const p: Pt[] = [];
  for (let k = 0; k < 4; k++) {
    const a = k * 90;
    p.push(at(a - 45, inner), at(a - spread, outer));
    if (end > outer) for (let s = -2; s <= 2; s++) p.push(at(a + (s * spread) / 3, end - Math.abs(s) * ((end - outer) / 2.2)));
    p.push(at(a + spread, outer));
  }
  return p;
}

function gear(teeth: number, ro: number, ri: number): Pt[] {
  const p: Pt[] = [];
  const step = 360 / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    p.push(at(a - step * 0.5, ri), at(a - step * 0.28, ri), at(a - step * 0.18, ro), at(a + step * 0.18, ro), at(a + step * 0.28, ri));
  }
  return p;
}

const circle = (r: number, cx = C, cy = C): Pt[] => Array.from({ length: 40 }, (_, i) => at(i * 9, r, cx, cy));
const pts = (p: Pt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const scale = (p: Pt[], k: number) => p.map(([x, y]) => [C + (x - C) * k, C + (y - C) * k] as Pt);

// ---------------------------------------------------------------- painting
// [highlight, mid, shadow] for each finish.
const FINISH: Record<Metal | "locked", [string, string, string]> = {
  silver: ["#f6f5ee", "#a8a79e", "#44433c"],
  gold: ["#fff1b4", "#c99d3c", "#553b0e"],
  bronze: ["#f3cda4", "#a4663a", "#45250e"],
  rose: ["#ffe6d8", "#d6a08e", "#6a3a2e"],
  iron: ["#dcd8bc", "#8a8466", "#36342a"],
  red: ["#ff8a78", "#b8241c", "#4e0806"],
  white: ["#ffffff", "#ece6da", "#9c9488"],
  locked: ["#5a6682", "#36425c", "#182032"],
};

interface Painter {
  /** A bevelled metal/enamel plate with an engraved inner line. */
  plate: (shape: Pt[], metal: Metal, key?: string) => ReactNode;
  /** The centre stone: a polished cabochon of the badge's gem colour. */
  stone: (r: number) => ReactNode;
}

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shade(c: string, k: number): string {
  const t = k > 0 ? 255 : 0;
  const a = Math.min(1, Math.abs(k));
  const [r, g, b] = hex(c).map((v) => Math.round(v + (t - v) * a));
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------- the medals
export const BADGES: BadgeDef[] = [
  {
    // rounded silver cross with a small gold star
    flag: "badgeTopaz", name: { en: "Topaz Badge", pt: "Insígnia Topázio" }, color: "#f0a030",
    medal: (m) => (
      <>
        {m.plate(cross(30, 70, 30, 82), "silver")}
        {m.plate(star(5, 34, 15), "gold")}
        {m.stone(13)}
      </>
    ),
  },
  {
    // gold five-point star
    flag: "badgeAquamarine", name: { en: "Aquamarine Badge", pt: "Insígnia Água-Marinha" }, color: "#7cc4f0",
    medal: (m) => (
      <>
        {m.plate(star(5, 90, 40), "gold")}
        {m.plate(circle(27), "gold")}
        {m.stone(19)}
      </>
    ),
  },
  {
    // silver cog around an iron disc and gold star
    flag: "badgeTourmaline", name: { en: "Tourmaline Badge", pt: "Insígnia Turmalina" }, color: "#19c9bb",
    medal: (m) => (
      <>
        {m.plate(gear(12, 90, 74), "silver")}
        {m.plate(circle(60), "iron")}
        {m.plate(star(5, 56, 24), "gold")}
        {m.stone(15)}
      </>
    ),
  },
  {
    // rose-gold order star with white enamel and gold ball tips
    flag: "badgeEmerald", name: { en: "Emerald Badge", pt: "Insígnia Esmeralda" }, color: "#1fa656",
    medal: (m) => (
      <>
        {m.plate(star(8, 82, 52), "rose")}
        {star(8, 80, 52)
          .filter((_, i) => i % 2 === 0)
          .map(([x, y], i) => m.plate(circle(7, x, y), "gold", `b${i}`))}
        {m.plate(star(8, 68, 34), "white")}
        {m.plate(circle(26), "gold")}
        {m.stone(20)}
      </>
    ),
  },
  {
    // iron cross pattée with a silver inset
    flag: "badgeAmethyst", name: { en: "Amethyst Badge", pt: "Insígnia Ametista" }, color: "#9b59d0",
    medal: (m) => (
      <>
        {m.plate(cross(16, 88, 25, 88), "iron")}
        {m.plate(scale(cross(16, 88, 25, 88), 0.7), "silver")}
        {m.plate(circle(26), "iron")}
        {m.stone(19)}
      </>
    ),
  },
  {
    // gold sunburst rosette ringed with beads
    flag: "badgeQuartz", name: { en: "Quartz Badge", pt: "Insígnia Quartzo" }, color: "#f2d6e4",
    medal: (m) => (
      <>
        {m.plate(star(24, 90, 70), "gold")}
        {m.plate(circle(66), "bronze")}
        {Array.from({ length: 14 }, (_, i) => {
          const [x, y] = at(i * (360 / 14), 57);
          return m.plate(circle(6, x, y), "gold", `r${i}`);
        })}
        {m.plate(star(12, 46, 34), "gold")}
        {m.stone(24)}
      </>
    ),
  },
  {
    // red enamel star on silver
    flag: "badgeFireOpal", name: { en: "Fire-Opal Badge", pt: "Insígnia Opala de Fogo" }, color: "#ff6326",
    medal: (m) => (
      <>
        {m.plate(star(5, 92, 44), "silver")}
        {m.plate(star(5, 76, 36), "red")}
        {m.plate(circle(29), "gold")}
        {m.stone(22)}
      </>
    ),
  },
  {
    // grand order: silver eight-point star, red star, white enamel medallion
    flag: "badgeDiamond", name: { en: "Diamond Badge", pt: "Insígnia Diamante" }, color: "#cdefff",
    medal: (m) => (
      <>
        {m.plate(star(8, 94, 62, 22.5), "silver")}
        {m.plate(star(5, 82, 38), "red")}
        {m.plate(circle(40), "gold")}
        {m.plate(circle(33), "white")}
        {m.stone(21)}
      </>
    ),
  },
];

// ---------------------------------------------------------------- badge
const ALL_FINISHES = Object.keys(FINISH) as (Metal | "locked")[];

export function BadgeIcon({ badge, earned }: { badge: BadgeDef; earned: boolean }) {
  const id = `${badge.flag}-${earned ? "on" : "off"}`;
  let n = 0;
  const painter: Painter = {
    plate: (shape, metal, key) => {
      const f = earned ? metal : "locked";
      const [hi, , lo] = FINISH[f];
      return (
        <g key={key ?? `p${n++}`}>
          <polygon points={pts(shape)} fill={`url(#${id}-${f})`} stroke="#15130e" strokeWidth={3.5} strokeLinejoin="round" />
          <polygon points={pts(scale(shape, 0.9))} fill="none" stroke={hi} strokeOpacity={0.55} strokeWidth={1.6} strokeLinejoin="round" />
          <polygon points={pts(scale(shape, 0.8))} fill="none" stroke={lo} strokeOpacity={0.45} strokeWidth={1.2} strokeLinejoin="round" />
        </g>
      );
    },
    stone: (r) => (
      <g key="stone">
        <circle cx={C} cy={C} r={r + 3} fill="#15130e" />
        <circle cx={C} cy={C} r={r} fill={`url(#${id}-stone)`} />
        {earned && (
          <>
            <ellipse cx={C - r * 0.32} cy={C - r * 0.38} rx={r * 0.34} ry={r * 0.2} transform={`rotate(-30 ${C - r * 0.32} ${C - r * 0.38})`} fill="#fff" opacity={0.85} />
            <circle cx={C + r * 0.35} cy={C + r * 0.4} r={r * 0.08} fill="#fff" opacity={0.6} />
          </>
        )}
      </g>
    ),
  };
  const gem = earned ? badge.color : "#252d40";
  return (
    <svg viewBox="0 0 200 200" className={`badge-icon ${earned ? "earned" : ""}`} aria-hidden="true">
      <defs>
        {ALL_FINISHES.map((f) => {
          const [hi, mid, lo] = FINISH[f];
          return (
            <linearGradient key={f} id={`${id}-${f}`} x1="0.15" y1="0" x2="0.85" y2="1">
              <stop offset="0" stopColor={hi} />
              <stop offset="0.5" stopColor={mid} />
              <stop offset="1" stopColor={lo} />
            </linearGradient>
          );
        })}
        <radialGradient id={`${id}-stone`} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor={shade(gem, 0.55)} />
          <stop offset="0.55" stopColor={gem} />
          <stop offset="1" stopColor={shade(gem, -0.6)} />
        </radialGradient>
        {/* antique grain over the metal */}
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" result="dark" />
          <feComposite in="dark" in2="SourceGraphic" operator="in" result="speckle" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="speckle" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${id}-grain)`}>{badge.medal(painter)}</g>
    </svg>
  );
}
