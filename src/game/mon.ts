import { SPECIES, type BaseStats, type SpeciesId } from "../data/species";
import { MOVES, type MoveId, type Status } from "../data/moves";

export interface MonMove {
  id: MoveId;
  pp: number;
}

export interface Mon {
  uid: string;
  species: SpeciesId;
  nickname?: string;
  level: number;
  exp: number;
  ivs: BaseStats;
  hp: number;
  status: Status | null;
  sleepTurns: number;
  moves: MonMove[];
}

export const MAX_LEVEL = 50;

/** Everyone uses the "medium fast" curve: total exp for level n is n³. */
export function expForLevel(n: number): number {
  return n * n * n;
}

export function calcStats(m: Pick<Mon, "species" | "level" | "ivs">): BaseStats {
  const b = SPECIES[m.species].base;
  const s = (base: number, iv: number) => Math.floor(((2 * base + iv) * m.level) / 100) + 5;
  return {
    hp: Math.floor(((2 * b.hp + m.ivs.hp) * m.level) / 100) + m.level + 10,
    atk: s(b.atk, m.ivs.atk),
    def: s(b.def, m.ivs.def),
    spa: s(b.spa, m.ivs.spa),
    spd: s(b.spd, m.ivs.spd),
    spe: s(b.spe, m.ivs.spe),
  };
}

export const maxHp = (m: Mon) => calcStats(m).hp;

export function displayName(m: Mon): string {
  return m.nickname || SPECIES[m.species].name;
}

/** The last four moves a species knows by `level` (what a wild one would have). */
export function movesAtLevel(species: SpeciesId, level: number): MoveId[] {
  const out: MoveId[] = [];
  for (const [lv, id] of SPECIES[species].learnset) {
    if (lv > level) break;
    if (!out.includes(id)) out.push(id);
    if (out.length > 4) out.shift();
  }
  return out;
}

let uidCounter = 0;
const rnd = (n: number) => Math.floor(Math.random() * n);

export function createMon(species: SpeciesId, level: number, opts: { perfect?: boolean } = {}): Mon {
  const iv = () => (opts.perfect ? 20 + rnd(12) : rnd(32));
  const ivs = { hp: iv(), atk: iv(), def: iv(), spa: iv(), spd: iv(), spe: iv() };
  const m: Mon = {
    uid: `${Date.now().toString(36)}-${(uidCounter++).toString(36)}-${rnd(1e6).toString(36)}`,
    species,
    level,
    exp: expForLevel(level),
    ivs,
    hp: 0,
    status: null,
    sleepTurns: 0,
    moves: movesAtLevel(species, level).map((id) => ({ id, pp: MOVES[id].pp })),
  };
  m.hp = maxHp(m);
  return m;
}

export function healMon(m: Mon) {
  m.hp = maxHp(m);
  m.status = null;
  m.sleepTurns = 0;
  for (const mv of m.moves) mv.pp = MOVES[mv.id].pp;
}

/** Moves a species learns exactly at `level`. */
export function newMovesAt(species: SpeciesId, level: number): MoveId[] {
  return SPECIES[species].learnset.filter(([lv]) => lv === level).map(([, id]) => id);
}
