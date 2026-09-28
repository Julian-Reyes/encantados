// Gym badges for the trainer card, styled like military medals: one bold silhouette per
// badge (cross, star, cog, order star...) in antique metal with enamel inlays, and the
// leader's gem (see docs/ROADMAP.md) set as the centre stone, drawn like a game sprite gem:
// flat light/mid/dark facets, a bright table and white glints. Unearned badges are a dark
// silhouette of the medal.

import type { ReactNode } from "react";
import type { L } from "../data/types";

type Pt = [number, number];
type Metal = "silver" | "gold" | "bronze" | "rose" | "iron" | "red" | "white";

interface BadgeDef {
  flag: string;
  name: L;
  color: string;
  cut: Pt[]; // gem outline in a 100×100 box
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

// Gem cuts, 100×100 box centred on (50, 50).
const OCTAGON: Pt[] = [[32, 6], [68, 6], [94, 32], [94, 68], [68, 94], [32, 94], [6, 68], [6, 32]];
const PEAR: Pt[] = [[50, 2], [66, 22], [84, 48], [86, 66], [74, 86], [50, 96], [26, 86], [14, 66], [16, 48], [34, 22]];
const HEX_LONG: Pt[] = [[50, 2], [80, 20], [80, 80], [50, 98], [20, 80], [20, 20]];
const EMERALD_CUT: Pt[] = [[24, 8], [76, 8], [90, 22], [90, 78], [76, 92], [24, 92], [10, 78], [10, 22]];
const TRILLION: Pt[] = [[50, 4], [96, 84], [4, 84]].map(([x, y]) => [x, y + 6] as Pt);
const POINT: Pt[] = [[50, 2], [80, 28], [80, 98], [20, 98], [20, 28]];
const OVAL: Pt[] = Array.from({ length: 12 }, (_, i) => [50 + Math.sin((i / 12) * Math.PI * 2) * 40, 50 - Math.cos((i / 12) * Math.PI * 2) * 48] as Pt);
const BRILLIANT: Pt[] = [[24, 16], [76, 16], [96, 38], [50, 96], [4, 38]];

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
  /** The centre stone: a faceted gem of radius `r` in the badge's cut and colour. */
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
    flag: "badgeTopaz", name: { en: "Topaz Badge", pt: "Insígnia Topázio" }, color: "#f0a030", cut: OCTAGON,
    medal: (m) => (
      <>
        {m.plate(cross(30, 70, 30, 82), "silver")}
        {m.plate(star(5, 34, 15), "gold")}
        {m.stone(25)}
      </>
    ),
  },
  {
    // gold five-point star
    flag: "badgeAquamarine", name: { en: "Aquamarine Badge", pt: "Insígnia Água-Marinha" }, color: "#7cc4f0", cut: PEAR,
    medal: (m) => (
      <>
        {m.plate(star(5, 90, 40), "gold")}
        {m.plate(circle(33), "gold")}
        {m.stone(27)}
      </>
    ),
  },
  {
    // silver cog around an iron disc and gold star
    flag: "badgeTourmaline", name: { en: "Tourmaline Badge", pt: "Insígnia Turmalina" }, color: "#19c9bb", cut: HEX_LONG,
    medal: (m) => (
      <>
        {m.plate(gear(12, 90, 74), "silver")}
        {m.plate(circle(60), "iron")}
        {m.plate(star(5, 56, 24), "gold")}
        {m.stone(27)}
      </>
    ),
  },
  {
    // rose-gold order star with white enamel and gold ball tips
    flag: "badgeEmerald", name: { en: "Emerald Badge", pt: "Insígnia Esmeralda" }, color: "#1fa656", cut: EMERALD_CUT,
    medal: (m) => (
      <>
        {m.plate(star(8, 82, 52), "rose")}
        {star(8, 80, 52)
          .filter((_, i) => i % 2 === 0)
          .map(([x, y], i) => m.plate(circle(7, x, y), "gold", `b${i}`))}
        {m.plate(star(8, 68, 34), "white")}
        {m.plate(circle(32), "gold")}
        {m.stone(26)}
      </>
    ),
  },
  {
    // iron cross pattée with a silver inset
    flag: "badgeAmethyst", name: { en: "Amethyst Badge", pt: "Insígnia Ametista" }, color: "#9b59d0", cut: TRILLION,
    medal: (m) => (
      <>
        {m.plate(cross(16, 88, 25, 88), "iron")}
        {m.plate(scale(cross(16, 88, 25, 88), 0.7), "silver")}
        {m.plate(circle(32), "iron")}
        {m.stone(26)}
      </>
    ),
  },
  {
    // gold sunburst rosette ringed with beads
    flag: "badgeQuartz", name: { en: "Quartz Badge", pt: "Insígnia Quartzo" }, color: "#f2d6e4", cut: POINT,
    medal: (m) => (
      <>
        {m.plate(star(24, 90, 70), "gold")}
        {m.plate(circle(66), "bronze")}
        {Array.from({ length: 14 }, (_, i) => {
          const [x, y] = at(i * (360 / 14), 57);
          return m.plate(circle(6, x, y), "gold", `r${i}`);
        })}
        {m.plate(star(12, 46, 34), "gold")}
        {m.stone(31)}
      </>
    ),
  },
  {
    // red enamel star on silver
    flag: "badgeFireOpal", name: { en: "Fire-Opal Badge", pt: "Insígnia Opala de Fogo" }, color: "#ff6326", cut: OVAL,
    medal: (m) => (
      <>
        {m.plate(star(5, 92, 44), "silver")}
        {m.plate(star(5, 76, 36), "red")}
        {m.plate(circle(35), "gold")}
        {m.stone(29)}
      </>
    ),
  },
  {
    // grand order: silver eight-point star, red star, white enamel medallion
    flag: "badgeDiamond", name: { en: "Diamond Badge", pt: "Insígnia Diamante" }, color: "#cdefff", cut: BRILLIANT,
    medal: (m) => (
      <>
        {m.plate(star(8, 94, 62, 22.5), "silver")}
        {m.plate(star(5, 82, 38), "red")}
        {m.plate(circle(44), "gold")}
        {m.plate(circle(38), "white")}
        {m.stone(29)}
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
    stone: (r) => {
      const gem = badge.cut.map(([x, y]) => [C + ((x - 50) / 50) * r, C + ((y - 50) / 50) * r] as Pt);
      const gx = gem.reduce((t, p) => t + p[0], 0) / gem.length;
      const gy = gem.reduce((t, p) => t + p[1], 0) / gem.length;
      const table = gem.map(([x, y]) => [gx + (x - gx) * 0.48, gy + (y - gy) * 0.48] as Pt);
      const base = earned ? badge.color : "#2a3348";
      // Three flat tones, like a sprite: facets facing the top-left light are light, the far side dark.
      const tone = (lit: number) => shade(base, !earned ? lit * 0.12 : lit > 0.35 ? 0.55 : lit < -0.35 ? -0.5 : lit > 0 ? 0.18 : -0.2);
      const facets = gem.map((p, i) => {
        const q = gem[(i + 1) % gem.length];
        const mx = (p[0] + q[0]) / 2 - gx;
        const my = (p[1] + q[1]) / 2 - gy;
        const lit = (mx * -0.6 + my * -0.8) / (Math.hypot(mx, my) || 1);
        return <polygon key={i} points={pts([p, q, table[(i + 1) % gem.length], table[i]])} fill={tone(lit)} stroke={shade(base, earned ? -0.6 : -0.3)} strokeWidth={1.2} strokeLinejoin="round" />;
      });
      const [t0, t1] = [table[0], table[1]];
      return (
        <g key="stone">
          <polygon points={pts(gem)} fill="none" stroke="#15130e" strokeWidth={5} strokeLinejoin="round" />
          {facets}
          <polygon points={pts(table)} fill={shade(base, earned ? 0.3 : 0.06)} stroke={shade(base, earned ? -0.45 : -0.3)} strokeWidth={1.2} strokeLinejoin="round" />
          {earned && (
            <>
              {/* glints: a streak across the table and a sparkle on the upper-left facet */}
              <polygon points={pts([[t0[0] + (t1[0] - t0[0]) * 0.15, t0[1] + r * 0.12], [t0[0] + (t1[0] - t0[0]) * 0.45, t0[1] + r * 0.12], [t0[0] + (t1[0] - t0[0]) * 0.2, t0[1] + r * 0.42], [t0[0] - (t1[0] - t0[0]) * 0.1, t0[1] + r * 0.42]])} fill="#fff" opacity={0.9} />
              <path d={`M${gx - r * 0.62} ${gy - r * 0.42} l${r * 0.1} ${-r * 0.24} l${r * 0.1} ${r * 0.24} l${r * 0.24} ${r * 0.1} l${-r * 0.24} ${r * 0.1} l${-r * 0.1} ${r * 0.24} l${-r * 0.1} ${-r * 0.24} l${-r * 0.24} ${-r * 0.1} z`} fill="#fff" />
            </>
          )}
        </g>
      );
    },
  };
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
