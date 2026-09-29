// Turn-based battle engine. Pure game logic written as one async function; it talks to the
// screen only through the BattleUI interface (animations, HP bars, menus) and the dialog box.

import { SPECIES } from "../data/species";
import { MOVES, type MoveId, type StatKey, type Status } from "../data/moves";
import { ITEMS, type ItemId } from "../data/items";
import { TYPES, effectiveness, type L, type TypeId } from "../data/types";
import { calcStats, displayName, maxHp, type Mon } from "./mon";
import { note, say, yesno, promptText } from "./dialog";
import { G, addItem, markCaught, markSeen, touch, tr } from "./store";
import { gainExp, canEvolve } from "./progression";
import { jingle, sfx, music } from "./audio";

export type Side = "player" | "enemy";
export type Outcome = "win" | "lose" | "run" | "caught";
export type AnimKind =
  | "enter" | "send" | "recall" | "attack" | "special" | "status" | "hit" | "faint"
  | "statUp" | "statDown" | "throw" | "absorb" | "shake" | "caught" | "break";

export type Action =
  | { kind: "move"; index: number }
  | { kind: "switch"; index: number }
  | { kind: "item"; item: ItemId; target: number }
  | { kind: "run" };

export interface BattleSetup {
  kind: "wild" | "trainer";
  enemy: Mon[];
  trainer?: { id: string; name: L; reward: number; win: L };
  music?: string;
}

export interface BattleUI {
  setActive(side: Side, mon: Mon | null): void;
  anim(kind: AnimKind, side: Side, opts?: { type?: TypeId; great?: boolean; eff?: number; crit?: boolean }): Promise<void>;
  hp(side: Side): Promise<void>;
  xp(from: number, to: number): Promise<void>;
  refresh(): void;
  chooseAction(mon: Mon, canRun: boolean): Promise<Action>;
  choosePartyForced(): Promise<number>;
  /** Optional switch before the trainer's next creature comes out; -1 = keep the current one. */
  chooseShift(): Promise<number>;
}

export interface BattleResult {
  outcome: Outcome;
  evolve: string[]; // uids of mons that leveled and can evolve
}

type Stages = Record<StatKey, number>;
interface Fighter {
  mon: Mon;
  stages: Stages;
  flinch: boolean;
}

const XP_MULT = 3;
const fresh = (): Stages => ({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 });
const rand = (n: number) => Math.floor(Math.random() * n);

const STAT_NAMES: Record<StatKey, L> = {
  atk: { en: "Attack", pt: "Ataque" },
  def: { en: "Defense", pt: "Defesa" },
  spa: { en: "Sp. Atk", pt: "At. Esp." },
  spd: { en: "Sp. Def", pt: "Def. Esp." },
  spe: { en: "Speed", pt: "Velocidade" },
  acc: { en: "accuracy", pt: "precisão" },
};

const STATUS_GAIN: Record<Status, L> = {
  brn: { en: "{n} was burned!", pt: "{n} foi queimado!" },
  psn: { en: "{n} was poisoned!", pt: "{n} foi envenenado!" },
  par: { en: "{n} is paralyzed! It may be unable to move!", pt: "{n} está paralisado! Talvez não consiga se mover!" },
  slp: { en: "{n} fell asleep!", pt: "{n} adormeceu!" },
};

export const STATUS_TAG: Record<Status, L> = {
  brn: { en: "BRN", pt: "QMD" },
  psn: { en: "PSN", pt: "ENV" },
  par: { en: "PAR", pt: "PAR" },
  slp: { en: "SLP", pt: "DRM" },
};

function stageMult(s: number) {
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}
function accMult(s: number) {
  return s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
}

function stat(f: Fighter, k: Exclude<StatKey, "acc">): number {
  let v = calcStats(f.mon)[k] * stageMult(f.stages[k]);
  if (k === "spe" && f.mon.status === "par") v *= 0.5;
  return Math.max(1, Math.floor(v));
}

function nameOf(f: Fighter, side: Side, wild: boolean): string {
  const n = displayName(f.mon);
  if (side === "enemy") return tr(wild ? { en: "The wild {n}", pt: "O {n} selvagem" } : { en: "The foe's {n}", pt: "O {n} inimigo" }, { n });
  return n;
}

export async function runBattle(setup: BattleSetup, ui: BattleUI): Promise<BattleResult> {
  const party = G().party;
  const wild = setup.kind === "wild";
  const evolve = new Set<string>();
  let enemyIdx = 0;
  const E: Fighter = { mon: setup.enemy[0], stages: fresh(), flinch: false };
  let pIdx = party.findIndex((m) => m.hp > 0);
  if (pIdx < 0) return { outcome: "lose", evolve: [] };
  const P: Fighter = { mon: party[pIdx], stages: fresh(), flinch: false };
  let participants = new Set<string>([P.mon.uid]);
  let runAttempts = 0;
  const trainerName = setup.trainer ? tr(setup.trainer.name) : "";

  const N = (side: Side) => nameOf(side === "player" ? P : E, side, wild);
  const msg = (l: L | string, p: Record<string, string | number> = {}) => note(tr(l, p), 850);

  // ---------- Intro ----------
  markSeen(E.mon.species);
  ui.setActive("enemy", E.mon);
  await ui.anim("enter", "enemy");
  if (wild) {
    await say(tr({ en: "A wild {n} appeared!", pt: "Um {n} selvagem apareceu!" }, { n: displayName(E.mon) }));
  } else {
    await say(tr({ en: "{t} would like to battle!", pt: "{t} quer batalhar!" }, { t: trainerName }));
    await msg({ en: "{t} sent out {n}!", pt: "{t} enviou {n}!" }, { t: trainerName, n: displayName(E.mon) });
  }
  await sendOut(P.mon);

  async function sendOut(mon: Mon) {
    P.mon = mon;
    P.stages = fresh();
    P.flinch = false;
    participants.add(mon.uid);
    ui.setActive("player", mon);
    await Promise.all([
      msg({ en: "Go! {n}!", pt: "Vai, {n}!" }, { n: displayName(mon) }),
      ui.anim("send", "player"),
    ]);
  }

  // ---------- Moves ----------
  async function changeStage(target: Fighter, tSide: Side, k: StatKey, n: number) {
    const cur = target.stages[k];
    const next = Math.max(-6, Math.min(6, cur + n));
    if (next === cur) {
      await msg(
        n > 0 ? { en: "{n}'s {s} won't go any higher!", pt: "{s} de {n} não sobe mais!" } : { en: "{n}'s {s} won't go any lower!", pt: "{s} de {n} não cai mais!" },
        { n: N(tSide), s: tr(STAT_NAMES[k]) },
      );
      return;
    }
    target.stages[k] = next;
    sfx(n > 0 ? "statUp" : "statDown");
    await ui.anim(n > 0 ? "statUp" : "statDown", tSide);
    const sharp = Math.abs(n) > 1;
    await msg(
      n > 0
        ? sharp ? { en: "{n}'s {s} sharply rose!", pt: "{s} de {n} subiu muito!" } : { en: "{n}'s {s} rose!", pt: "{s} de {n} subiu!" }
        : sharp ? { en: "{n}'s {s} harshly fell!", pt: "{s} de {n} caiu muito!" } : { en: "{n}'s {s} fell!", pt: "{s} de {n} caiu!" },
      { n: N(tSide), s: tr(STAT_NAMES[k]) },
    );
  }

  function immuneToStatus(mon: Mon, s: Status) {
    const t = SPECIES[mon.species].types;
    return (s === "brn" && t.includes("fire")) || (s === "par" && t.includes("electric")) || (s === "psn" && t.includes("poison"));
  }

  async function inflict(target: Fighter, tSide: Side, s: Status, fromStatusMove: boolean) {
    if (target.mon.status || immuneToStatus(target.mon, s)) {
      if (fromStatusMove) await msg({ en: "But it failed!", pt: "Mas falhou!" });
      return;
    }
    target.mon.status = s;
    if (s === "slp") target.mon.sleepTurns = 1 + rand(3);
    sfx("status");
    ui.refresh();
    await msg(STATUS_GAIN[s], { n: N(tSide) });
  }

  /** Returns true if the defender fainted. */
  async function doMove(att: Fighter, aSide: Side, def: Fighter, dSide: Side, moveIdx: number): Promise<boolean> {
    const aName = N(aSide);
    // Status checks before acting
    if (att.mon.status === "slp") {
      att.mon.sleepTurns--;
      if (att.mon.sleepTurns > 0) {
        await msg({ en: "{n} is fast asleep.", pt: "{n} está dormindo profundamente." }, { n: aName });
        return false;
      }
      att.mon.status = null;
      ui.refresh();
      await msg({ en: "{n} woke up!", pt: "{n} acordou!" }, { n: aName });
    }
    if (att.flinch) {
      await msg({ en: "{n} flinched and couldn't move!", pt: "{n} hesitou e não se moveu!" }, { n: aName });
      return false;
    }
    if (att.mon.status === "par" && Math.random() < 0.25) {
      await msg({ en: "{n} is paralyzed! It can't move!", pt: "{n} está paralisado! Não consegue se mover!" }, { n: aName });
      return false;
    }

    const slot = att.mon.moves[moveIdx];
    let moveId: MoveId = slot?.id ?? "tackle";
    if (slot && slot.pp > 0) slot.pp--;
    else if (!att.mon.moves.some((m) => m.pp > 0)) {
      await msg({ en: "{n} has no moves left!", pt: "{n} não tem mais golpes!" }, { n: aName });
      moveId = "tackle";
    }
    const mv = MOVES[moveId];
    await msg({ en: "{n} used {m}!", pt: "{n} usou {m}!" }, { n: aName, m: tr(mv.name) });

    // Accuracy
    if (mv.acc > 0) {
      const chance = mv.acc * accMult(att.stages.acc);
      if (Math.random() * 100 >= chance) {
        await msg({ en: "{n}'s attack missed!", pt: "O ataque de {n} errou!" }, { n: aName });
        return false;
      }
    }

    if (mv.cat === "status") {
      await ui.anim("status", aSide, { type: mv.type });
      const eff = mv.effect;
      if (eff?.kind === "stat") await changeStage(eff.target === "self" ? att : def, eff.target === "self" ? aSide : dSide, eff.stat, eff.stages);
      else if (eff?.kind === "status") await inflict(def, dSide, eff.status, true);
      return false;
    }

    // Damage
    const types = SPECIES[def.mon.species].types;
    const eff = effectiveness(mv.type, types);
    if (eff === 0) {
      await msg({ en: "It doesn't affect {n}...", pt: "Não afeta {n}..." }, { n: N(dSide) });
      return false;
    }
    let dmg: number;
    let crit = false;
    if (mv.effect?.kind === "fixedLevel") {
      dmg = att.mon.level;
    } else {
      const physical = mv.cat === "physical";
      const A = stat(att, physical ? "atk" : "spa");
      const D = stat(def, physical ? "def" : "spd");
      crit = Math.random() < (mv.highCrit ? 1 / 8 : 1 / 16);
      const base = Math.floor(Math.floor((Math.floor((2 * att.mon.level) / 5 + 2) * mv.power * A) / D) / 50) + 2;
      const stab = SPECIES[att.mon.species].types.includes(mv.type) ? 1.5 : 1;
      const burn = physical && att.mon.status === "brn" ? 0.5 : 1;
      const roll = (85 + rand(16)) / 100;
      dmg = Math.max(1, Math.floor(base * stab * eff * (crit ? 1.5 : 1) * roll * burn));
    }
    await ui.anim(mv.cat === "physical" ? "attack" : "special", aSide, { type: mv.type });
    dmg = Math.min(dmg, def.mon.hp);
    sfx(eff > 1 ? "hitSuper" : eff < 1 ? "hitWeak" : "hit");
    def.mon.hp -= dmg;
    await Promise.all([ui.anim("hit", dSide, { type: mv.type, eff, crit }), ui.hp(dSide)]);
    if (crit) await msg({ en: "A critical hit!", pt: "Um golpe crítico!" });
    if (mv.effect?.kind !== "fixedLevel") {
      if (eff > 1) await msg({ en: "It's super effective!", pt: "É super eficaz!" });
      else if (eff < 1) await msg({ en: "It's not very effective...", pt: "Não é muito eficaz..." });
    }

    const e = mv.effect;
    if (e?.kind === "drain" && dmg > 0 && att.mon.hp > 0) {
      att.mon.hp = Math.min(maxHp(att.mon), att.mon.hp + Math.max(1, Math.floor(dmg / 2)));
      await ui.hp(aSide);
      await msg({ en: "{n} had its energy drained!", pt: "{n} teve a energia drenada!" }, { n: N(dSide) });
    }
    if (def.mon.hp <= 0) return true;
    if (e?.kind === "status" && Math.random() * 100 < (e.chance ?? 100)) await inflict(def, dSide, e.status, false);
    if (e?.kind === "stat" && Math.random() * 100 < (e.chance ?? 100))
      await changeStage(e.target === "self" ? att : def, e.target === "self" ? aSide : dSide, e.stat, e.stages);
    if (e?.kind === "flinch" && Math.random() * 100 < e.chance) def.flinch = true;
    return false;
  }

  function enemyChoice(): number {
    const usable = E.mon.moves.map((m, i) => ({ m, i })).filter((x) => x.m.pp > 0);
    if (!usable.length) return 0;
    if (wild || Math.random() < 0.35) return usable[rand(usable.length)].i;
    let best = usable[0].i;
    let bestScore = -1;
    for (const { m, i } of usable) {
      const mv = MOVES[m.id];
      let score: number;
      if (mv.cat === "status") score = mv.effect?.kind === "status" && P.mon.status ? 0 : 25;
      else {
        const stab = SPECIES[E.mon.species].types.includes(mv.type) ? 1.5 : 1;
        score = mv.power * stab * effectiveness(mv.type, SPECIES[P.mon.species].types);
      }
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  // ---------- Fainting ----------
  /** Returns "win" when the battle is over. */
  async function onEnemyFaint(): Promise<"win" | "next"> {
    sfx("faint");
    await ui.anim("faint", "enemy");
    await msg({ en: "{n} fainted!", pt: "{n} desmaiou!" }, { n: N("enemy") });

    // Exp, split among the team members that battled this foe and are still standing.
    const gainers = party.filter((m) => participants.has(m.uid) && m.hp > 0);
    const total = Math.floor(((SPECIES[E.mon.species].baseExp * E.mon.level) / 7) * (wild ? 1 : 1.5) * XP_MULT);
    const each = Math.max(1, Math.floor(total / Math.max(1, gainers.length)));
    for (const m of gainers) {
      await say(tr({ en: "{n} gained {x} Exp. Points!", pt: "{n} ganhou {x} pontos de Exp.!" }, { n: displayName(m), x: each }));
      const active = m === P.mon;
      const leveled = await gainExp(m, each, {
        onBar: active ? (from, to) => ui.xp(from, to) : undefined,
        onLevel: () => ui.refresh(),
      });
      if (leveled && canEvolve(m)) evolve.add(m.uid);
      ui.refresh();
    }

    if (!wild && enemyIdx + 1 < setup.enemy.length) {
      enemyIdx++;
      E.mon = setup.enemy[enemyIdx];
      E.stages = fresh();
      E.flinch = false;
      markSeen(E.mon.species);
      participants = new Set([P.mon.uid]);
      await msg({ en: "{t} is about to send out {n}.", pt: "{t} vai enviar {n}." }, { t: trainerName, n: displayName(E.mon) });
      if (party.some((m) => m !== P.mon && m.hp > 0) && (await yesno(tr({ en: "Will {p} change creatures?", pt: "{p} vai trocar de criatura?" }, { p: G().playerName })))) {
        const idx = await ui.chooseShift();
        if (idx >= 0) {
          await msg({ en: "{n}, come back!", pt: "{n}, volte!" }, { n: displayName(P.mon) });
          await ui.anim("recall", "player");
          pIdx = idx;
          await sendOut(party[idx]);
        }
      }
      ui.setActive("enemy", E.mon);
      sfx("send");
      await ui.anim("send", "enemy");
      await msg({ en: "{t} sent out {n}!", pt: "{t} enviou {n}!" }, { t: trainerName, n: displayName(E.mon) });
      return "next";
    }

    if (!wild && setup.trainer) {
      music(null);
      void jingle("victory");
      // Starts once the fanfare ends and loops through the prize dialog.
      music("victoryTrainer");
      await say(tr({ en: "{p} defeated {t}!", pt: "{p} derrotou {t}!" }, { p: G().playerName, t: trainerName }));
      await say(tr(setup.trainer.win));
      const money = setup.trainer.reward;
      G().set({ money: G().money + money });
      await say(tr({ en: "{p} got R${m} for winning!", pt: "{p} ganhou R${m} pela vitória!" }, { p: G().playerName, m: money }));
    }
    return "win";
  }

  /** Returns "lose" when no one can fight. */
  async function onPlayerFaint(): Promise<"lose" | "next"> {
    sfx("faint");
    await ui.anim("faint", "player");
    await msg({ en: "{n} fainted!", pt: "{n} desmaiou!" }, { n: displayName(P.mon) });
    participants.delete(P.mon.uid);
    if (!party.some((m) => m.hp > 0)) {
      await say(tr({ en: "{p} is out of usable creatures!", pt: "{p} não tem mais criaturas em condições de lutar!" }, { p: G().playerName }));
      return "lose";
    }
    const idx = await ui.choosePartyForced();
    pIdx = idx;
    await sendOut(party[idx]);
    return "next";
  }

  // ---------- Catching ----------
  async function throwAmulet(item: ItemId): Promise<boolean> {
    addItem(item, -1);
    await msg({ en: "{p} threw an {i}!", pt: "{p} jogou um {i}!" }, { p: G().playerName, i: tr(ITEMS[item].name) });
    sfx("throw");
    await ui.anim("throw", "enemy", { great: item === "superamuleto" });
    if (!wild) {
      await ui.anim("break", "enemy");
      await say(tr({ en: "The trainer blocked the Amulet!", pt: "O treinador bloqueou o Amuleto!" }), tr({ en: "Don't be a thief!", pt: "Não seja ladrão!" }));
      return false;
    }
    await ui.anim("absorb", "enemy");
    const max = maxHp(E.mon);
    const statusBonus = E.mon.status === "slp" ? 2 : E.mon.status ? 1.5 : 1;
    const a = (((3 * max - 2 * E.mon.hp) * SPECIES[E.mon.species].catchRate * (ITEMS[item].ball ?? 1)) / (3 * max)) * statusBonus;
    let shakes = 0;
    let caught = false;
    if (a >= 255) {
      shakes = 3;
      caught = true;
    } else {
      const b = 1048560 / Math.sqrt(Math.sqrt(16711680 / Math.max(1, a)));
      while (shakes < 4 && rand(65536) < b) shakes++;
      caught = shakes >= 4;
      shakes = Math.min(3, shakes);
    }
    for (let i = 0; i < shakes; i++) {
      sfx("shake");
      await ui.anim("shake", "enemy");
    }
    if (!caught) {
      sfx("breakout");
      await ui.anim("break", "enemy");
      const lines: L[] = [
        { en: "Oh no! It broke free!", pt: "Ah, não! Ele escapou!" },
        { en: "Argh! It looked like it was caught!", pt: "Argh! Parecia que tinha capturado!" },
        { en: "Ahh! So close!", pt: "Ahh! Foi por pouco!" },
        { en: "Nooo! It was just about caught!", pt: "Nãão! Estava quase capturado!" },
      ];
      await say(tr(lines[shakes]));
      return false;
    }
    sfx("click");
    await ui.anim("caught", "enemy");
    music(null);
    const isNew = !G().caught.includes(E.mon.species);
    void jingle("caught");
    await say(tr({ en: "Gotcha! {n} was caught!", pt: "Isso! {n} foi capturado!" }, { n: SPECIES[E.mon.species].name }));
    markCaught(E.mon.species);
    if (isNew) await say(tr({ en: "{n}'s data was added to the Almanaque!", pt: "Os dados de {n} foram registrados no Almanaque!" }, { n: SPECIES[E.mon.species].name }));
    E.mon.status = E.mon.status === "slp" ? null : E.mon.status;
    if (await yesno(tr({ en: "Give a nickname to the caught {n}?", pt: "Dar um apelido ao {n} capturado?" }, { n: SPECIES[E.mon.species].name }))) {
      const nick = (await promptText(tr({ en: "{n}'s nickname?", pt: "Apelido de {n}?" }, { n: SPECIES[E.mon.species].name }), SPECIES[E.mon.species].name, 10)).trim();
      if (nick && nick !== SPECIES[E.mon.species].name) E.mon.nickname = nick;
    }
    const s = G();
    if (s.party.length < 6) {
      s.party.push(E.mon);
    } else {
      s.box.push(E.mon);
      await say(tr({ en: "{n} was sent to the Healing Center PC.", pt: "{n} foi enviado ao PC do Centro de Cura." }, { n: displayName(E.mon) }));
    }
    touch();
    return true;
  }

  // ---------- Items ----------
  async function useItem(item: ItemId, target: number): Promise<boolean> {
    const it = ITEMS[item];
    const mon = party[target];
    if (it.ball) return false;
    const name = displayName(mon);
    const max = maxHp(mon);
    if (it.revive) {
      if (mon.hp > 0) return false;
      mon.hp = Math.floor(max / 2);
      mon.status = null;
      addItem(item, -1);
      await msg({ en: "{n} was revived!", pt: "{n} foi revivido!" }, { n: name });
      return true;
    }
    if (mon.hp <= 0) return false;
    let did = false;
    if (it.heal && mon.hp < max) {
      const before = mon.hp;
      mon.hp = Math.min(max, mon.hp + it.heal);
      did = true;
      addItem(item, -1);
      if (mon === P.mon) await ui.hp("player");
      await msg({ en: "{n}'s HP was restored by {x} points.", pt: "{n} recuperou {x} PV." }, { n: name, x: mon.hp - before });
    }
    if (it.cures && mon.status && (it.cures === "all" || it.cures.includes(mon.status))) {
      mon.status = null;
      mon.sleepTurns = 0;
      if (!did) addItem(item, -1);
      did = true;
      ui.refresh();
      await msg({ en: "{n} is healthy again!", pt: "{n} está saudável de novo!" }, { n: name });
    }
    touch();
    return did;
  }

  // ---------- End of turn ----------
  async function residual(f: Fighter, side: Side): Promise<boolean> {
    if (f.mon.hp <= 0) return false;
    if (f.mon.status === "brn" || f.mon.status === "psn") {
      const d = Math.max(1, Math.floor(maxHp(f.mon) / (f.mon.status === "brn" ? 16 : 8)));
      f.mon.hp = Math.max(0, f.mon.hp - d);
      sfx("hitWeak");
      await Promise.all([ui.anim("hit", side), ui.hp(side)]);
      await msg(
        f.mon.status === "brn" ? { en: "{n} is hurt by its burn!", pt: "{n} sofre com a queimadura!" } : { en: "{n} is hurt by poison!", pt: "{n} sofre com o veneno!" },
        { n: N(side) },
      );
      return f.mon.hp <= 0;
    }
    return false;
  }

  const finish = (outcome: Outcome): BattleResult => ({ outcome, evolve: [...evolve] });

  /** Resolves faints after any hit. Returns an outcome to end the battle, or null. */
  async function checkFaints(): Promise<Outcome | null> {
    if (E.mon.hp <= 0) {
      const r = await onEnemyFaint();
      if (r === "win") return "win";
    }
    if (P.mon.hp <= 0) {
      const r = await onPlayerFaint();
      if (r === "lose") return "lose";
    }
    return null;
  }

  // ---------- Main loop ----------
  for (;;) {
    P.flinch = false;
    E.flinch = false;
    const action = await ui.chooseAction(P.mon, wild);
    let playerMoveFirst: boolean | null = null;

    if (action.kind === "run") {
      if (!wild) {
        await say(tr({ en: "No! There's no running from a trainer battle!", pt: "Não! Não dá para fugir de uma batalha contra treinador!" }));
        continue;
      }
      runAttempts++;
      const ps = stat(P, "spe");
      const es = stat(E, "spe");
      const f = Math.floor((ps * 128) / Math.max(1, es)) + 30 * runAttempts;
      if (ps >= es || rand(256) < f) {
        sfx("flee");
        await say(tr({ en: "Got away safely!", pt: "Fugiu em segurança!" }));
        return finish("run");
      }
      await msg({ en: "Can't escape!", pt: "Não conseguiu fugir!" });
    } else if (action.kind === "switch") {
      await msg({ en: "{n}, come back!", pt: "{n}, volte!" }, { n: displayName(P.mon) });
      await ui.anim("recall", "player");
      pIdx = action.index;
      await sendOut(party[pIdx]);
    } else if (action.kind === "item") {
      if (ITEMS[action.item].ball) {
        if (await throwAmulet(action.item)) return finish("caught");
      } else {
        const ok = await useItem(action.item, action.target);
        if (!ok) {
          await say(tr({ en: "It won't have any effect.", pt: "Não vai ter efeito." }));
          continue;
        }
      }
    } else {
      const pm = MOVES[P.mon.moves[action.index]?.id ?? "tackle"];
      const ei = enemyChoice();
      const em = MOVES[E.mon.moves[ei]?.id ?? "tackle"];
      const pp = pm.priority ?? 0;
      const ep = em.priority ?? 0;
      const psp = stat(P, "spe");
      const esp = stat(E, "spe");
      playerMoveFirst = pp !== ep ? pp > ep : psp !== esp ? psp > esp : Math.random() < 0.5;
      const order: [Fighter, Side, Fighter, Side, number][] = playerMoveFirst
        ? [[P, "player", E, "enemy", action.index], [E, "enemy", P, "player", ei]]
        : [[E, "enemy", P, "player", ei], [P, "player", E, "enemy", action.index]];
      let ended: Outcome | null = null;
      let skipSecond = false;
      for (let i = 0; i < 2; i++) {
        if (i === 1 && skipSecond) break;
        const [a, as, d, ds, idx] = order[i];
        if (a.mon.hp <= 0) break;
        const fainted = await doMove(a, as, d, ds, idx);
        if (fainted) {
          ended = await checkFaints();
          skipSecond = true; // the foe that fainted (or was replaced) doesn't get to act
        }
        if (ended) return finish(ended);
      }
      ui.refresh();
    }

    // Enemy acts after a non-move action.
    if (playerMoveFirst === null) {
      const ei = enemyChoice();
      const fainted = await doMove(E, "enemy", P, "player", ei);
      if (fainted) {
        const r = await checkFaints();
        if (r) return finish(r);
      }
    }

    // Burn / poison
    if (await residual(P, "player")) {
      const r = await checkFaints();
      if (r) return finish(r);
    }
    if (await residual(E, "enemy")) {
      const r = await checkFaints();
      if (r) return finish(r);
    }
  }
}

export function typeName(t: TypeId) {
  return tr(TYPES[t].name);
}
