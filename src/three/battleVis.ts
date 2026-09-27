// Shared, mutable state for the battle scene's animations. The battle UI writes it;
// the 3D scene reads it every frame. Kept outside React so animations don't re-render.

import type { SpeciesId } from "../data/species";
import type { AnimKind, Side } from "../game/battle";
import type { TypeId } from "../data/types";

export interface SideVis {
  species: SpeciesId | null;
  anim: AnimKind | null;
  t0: number;
  type: TypeId | null;
  hidden: boolean;
}

export const bv = {
  player: { species: null, anim: null, t0: 0, type: null, hidden: true } as SideVis,
  enemy: { species: null, anim: null, t0: 0, type: null, hidden: true } as SideVis,
  amulet: { visible: false, anim: null as AnimKind | null, t0: 0, shakes: 0 },
};

export const ANIM_MS: Record<AnimKind, number> = {
  enter: 700, send: 950, recall: 450, attack: 380, special: 600, status: 550, hit: 480, faint: 600,
  statUp: 550, statDown: 550, throw: 650, absorb: 600, shake: 800, caught: 600, break: 450,
};

export const now = () => performance.now() / 1000;

export function resetVis() {
  for (const s of ["player", "enemy"] as Side[]) Object.assign(bv[s], { species: null, anim: null, t0: 0, type: null, hidden: true });
  Object.assign(bv.amulet, { visible: false, anim: null, t0: 0, shakes: 0 });
}
