import { create } from "zustand";
import type { Mon } from "./mon";
import type { ItemId } from "../data/items";
import type { SpeciesId } from "../data/species";
import type { L } from "../data/types";

export type Lang = "en" | "pt";
export type Dir = "up" | "down" | "left" | "right";
export type MapId = "overworld" | "home" | "rivalhouse" | "lab" | "center1" | "mart1" | "center2" | "mart2" | "arena1";

export interface Spot {
  map: MapId;
  x: number;
  y: number;
  facing: Dir;
}

export interface SaveData {
  v: 1;
  lang: Lang;
  playerName: string;
  rivalName: string;
  money: number;
  party: Mon[];
  box: Mon[];
  bag: Partial<Record<ItemId, number>>;
  flags: Record<string, boolean>;
  seen: SpeciesId[];
  caught: SpeciesId[];
  pos: Spot;
  heal: Spot;
  playTime: number;
  starter?: SpeciesId;
}

export type Screen = null | "menu" | "team" | "bag" | "almanaque" | "shop" | "pc" | "card" | "options";

export interface DialogState {
  id: number;
  text: string;
  choices?: string[];
  input?: { value: string; max: number };
  auto?: number; // ms, closes by itself (battle messages)
  resolve: (v: number | string) => void;
}

export interface GameState extends SaveData {
  mode: "title" | "intro" | "world" | "battle" | "evolve";
  screen: Screen;
  shopKind: "town" | "city";
  dialog: DialogState | null;
  fade: boolean;
  wipe: boolean;
  sound: boolean;
  music: boolean;
  lowGfx: boolean;
  /** Amulets sitting on the Healing Center machine; they glow while the heal jingle plays. */
  healSlots: number;
  healGlow: boolean;
  touch: boolean;
  rev: number;
  preview: SpeciesId | null;
  introShow: "prof" | "player" | "rival";
  touchRev: () => void;
  set: (p: Partial<GameState>) => void;
}

export function newSave(): SaveData {
  return {
    v: 1,
    lang: (navigator.language || "en").toLowerCase().startsWith("pt") ? "pt" : "en",
    playerName: "Caju",
    rivalName: "Caio",
    money: 3000,
    party: [],
    box: [],
    bag: { pocao: 1 },
    flags: {},
    seen: [],
    caught: [],
    pos: { map: "home", x: 6, y: 4, facing: "down" },
    heal: { map: "home", x: 4, y: 5, facing: "up" },
    playTime: 0,
  };
}

const isTouch = typeof window !== "undefined" && (matchMedia("(pointer: coarse)").matches || "ontouchstart" in window);

export const useGame = create<GameState>((set) => ({
  ...newSave(),
  mode: "title",
  screen: null,
  shopKind: "town",
  dialog: null,
  fade: false,
  wipe: false,
  sound: true,
  music: true,
  lowGfx: false,
  healSlots: 0,
  healGlow: false,
  touch: isTouch,
  rev: 0,
  preview: null,
  introShow: "prof",
  touchRev: () => set((s) => ({ rev: s.rev + 1 })),
  set: (p) => set(p),
}));

export const G = () => useGame.getState();
/** Call after mutating party/box/bag objects in place so React re-renders. */
export const touch = () => useGame.getState().touchRev();

export function tr(l: L | string, params: Record<string, string | number> = {}): string {
  const s = G();
  let out = typeof l === "string" ? l : l[s.lang];
  const all: Record<string, string | number> = { player: s.playerName, rival: s.rivalName, ...params };
  out = out.replace(/\{(\w+)\}/g, (m, k) => (k in all ? String(all[k]) : m));
  return out;
}

export function flag(k: string): boolean {
  return !!G().flags[k];
}
export function setFlag(k: string, v = true) {
  const s = G();
  s.set({ flags: { ...s.flags, [k]: v } });
}

export function addItem(id: ItemId, n = 1) {
  const s = G();
  const bag = { ...s.bag };
  bag[id] = Math.max(0, (bag[id] ?? 0) + n);
  if (!bag[id]) delete bag[id];
  s.set({ bag });
}

export function markSeen(id: SpeciesId) {
  const s = G();
  if (!s.seen.includes(id)) s.set({ seen: [...s.seen, id] });
}
export function markCaught(id: SpeciesId) {
  markSeen(id);
  const s = G();
  if (!s.caught.includes(id)) s.set({ caught: [...s.caught, id] });
}

// ---- persistence ----
const KEY = "encantados-save-v1";

export function hasSave(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function saveGame(pos: Spot): boolean {
  const s = G();
  const data: SaveData = {
    v: 1,
    lang: s.lang,
    playerName: s.playerName,
    rivalName: s.rivalName,
    money: s.money,
    party: s.party,
    box: s.box,
    bag: s.bag,
    flags: s.flags,
    seen: s.seen,
    caught: s.caught,
    pos,
    heal: s.heal,
    playTime: s.playTime,
    starter: s.starter,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    localStorage.setItem(KEY + "-prefs", JSON.stringify({ sound: s.sound, music: s.music, lang: s.lang, lowGfx: s.lowGfx }));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    if (d.v !== 1) return null;
    return { ...newSave(), ...d };
  } catch {
    return null;
  }
}

export function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY + "-prefs") || "{}");
    const s = G();
    s.set({ sound: p.sound ?? true, music: p.music ?? true, lang: p.lang ?? s.lang, lowGfx: p.lowGfx ?? false });
  } catch {
    /* private mode: defaults are fine */
  }
}

export function savePrefs() {
  const s = G();
  try {
    localStorage.setItem(KEY + "-prefs", JSON.stringify({ sound: s.sound, music: s.music, lang: s.lang, lowGfx: s.lowGfx }));
  } catch {
    /* ignore */
  }
}
