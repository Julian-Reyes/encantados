// Hand-off between the overworld and the full-screen modes (battle, evolution).
// World scripts `await startBattle(...)`; the Battle component picks up the pending setup,
// runs the engine and calls finishBattle().

import type { BattleResult, BattleSetup } from "./battle";
import { G, markCaught, touch, tr } from "./store";
import { music, sfx, jingle } from "./audio";
import { SPECIES, type SpeciesId } from "../data/species";
import { displayName, calcStats, newMovesAt, type Mon } from "./mon";
import { say } from "./dialog";
import { learnMove } from "./progression";

interface Pending {
  setup: BattleSetup;
  resolve: (r: BattleResult) => void;
}
let pending: Pending | null = null;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function startBattle(setup: BattleSetup): Promise<BattleResult> {
  sfx("encounter");
  music(setup.music ?? (setup.kind === "wild" ? "battle" : "trainer"));
  G().set({ wipe: true });
  await wait(1150);
  return new Promise((resolve) => {
    pending = { setup, resolve };
    G().set({ mode: "battle" });
    setTimeout(() => G().set({ wipe: false }), 50);
  });
}

export function currentBattle(): BattleSetup | null {
  return pending?.setup ?? null;
}

export function finishBattle(r: BattleResult) {
  const p = pending;
  pending = null;
  G().set({ mode: "world" });
  p?.resolve(r);
}

// ---------- Evolution ----------
export interface EvoState {
  mon: Mon;
  from: SpeciesId;
  to: SpeciesId;
  resolve: (cancelled: boolean) => void;
}
let evo: EvoState | null = null;
export const currentEvo = () => evo;

export async function runEvolutions(uids: string[]) {
  for (const uid of uids) {
    const mon = G().party.find((m) => m.uid === uid);
    if (!mon) continue;
    const e = SPECIES[mon.species].evolves;
    if (!e || mon.level < e.level) continue;
    const from = mon.species;
    const oldName = displayName(mon);
    const cancelled = await new Promise<boolean>((resolve) => {
      evo = { mon, from, to: e.to, resolve };
      G().set({ mode: "evolve" });
    });
    if (cancelled) {
      await say(tr({ en: "Huh? {n} stopped evolving!", pt: "Hã? {n} parou de evoluir!" }, { n: oldName }));
    } else {
      const before = calcStats(mon);
      mon.species = e.to;
      const after = calcStats(mon);
      mon.hp += after.hp - before.hp;
      markCaught(e.to);
      void jingle("evolve");
      await say(
        tr({ en: "Congratulations! Your {o} evolved into {n}!", pt: "Parabéns! Seu {o} evoluiu para {n}!" }, { o: oldName, n: SPECIES[e.to].name }),
      );
      for (const mv of newMovesAt(e.to, mon.level)) await learnMove(mon, mv);
      touch();
    }
    evo = null;
    G().set({ mode: "world" });
  }
}
