// Leveling, move learning and evolution checks, shared by battles and evolution scenes.

import { SPECIES } from "../data/species";
import { MOVES, type MoveId } from "../data/moves";
import { MAX_LEVEL, calcStats, displayName, expForLevel, newMovesAt, type Mon } from "./mon";
import { ask, say, yesno } from "./dialog";
import { tr } from "./store";
import { jingle } from "./audio";

export async function learnMove(mon: Mon, move: MoveId): Promise<void> {
  if (mon.moves.some((m) => m.id === move)) return;
  const name = displayName(mon);
  const mv = tr(MOVES[move].name);
  if (mon.moves.length < 4) {
    mon.moves.push({ id: move, pp: MOVES[move].pp });
    await jingle("level");
    await say(tr({ en: "{n} learned {m}!", pt: "{n} aprendeu {m}!" }, { n: name, m: mv }));
    return;
  }
  await say(
    tr({ en: "{n} wants to learn {m}.", pt: "{n} quer aprender {m}." }, { n: name, m: mv }),
    tr({ en: "But {n} can't learn more than four moves.", pt: "Mas {n} não pode ter mais de quatro golpes." }, { n: name }),
  );
  for (;;) {
    const ok = await yesno(tr({ en: "Forget an old move to make room for {m}?", pt: "Esquecer um golpe para aprender {m}?" }, { m: mv }));
    if (ok) {
      const opts = mon.moves.map((m) => tr(MOVES[m.id].name));
      opts.push(tr({ en: "CANCEL", pt: "CANCELAR" }));
      const i = await ask(tr({ en: "Which move should be forgotten?", pt: "Qual golpe deve ser esquecido?" }), opts);
      if (i < 4) {
        const old = tr(MOVES[mon.moves[i].id].name);
        mon.moves[i] = { id: move, pp: MOVES[move].pp };
        await say(
          tr({ en: "1, 2 and... Poof!", pt: "1, 2 e... Puf!" }),
          tr({ en: "{n} forgot {o}.", pt: "{n} esqueceu {o}." }, { n: name, o: old }),
        );
        await jingle("level");
        await say(tr({ en: "And... {n} learned {m}!", pt: "E... {n} aprendeu {m}!" }, { n: name, m: mv }));
        return;
      }
    }
    const stop = await yesno(tr({ en: "Stop trying to learn {m}?", pt: "Desistir de aprender {m}?" }, { m: mv }));
    if (stop) {
      await say(tr({ en: "{n} did not learn {m}.", pt: "{n} não aprendeu {m}." }, { n: name, m: mv }));
      return;
    }
  }
}

/**
 * Adds exp, handling any number of level-ups. `onBar` lets the battle screen animate the
 * exp bar between the thresholds; `onLevel` lets it refresh the info box.
 */
export async function gainExp(
  mon: Mon,
  amount: number,
  hooks: { onBar?: (from: number, to: number) => Promise<void>; onLevel?: () => void } = {},
): Promise<boolean> {
  let leveled = false;
  let remaining = amount;
  while (remaining > 0 && mon.level < MAX_LEVEL) {
    const next = expForLevel(mon.level + 1);
    const room = next - mon.exp;
    const add = Math.min(room, remaining);
    const from = mon.exp;
    mon.exp += add;
    remaining -= add;
    await hooks.onBar?.(from, mon.exp);
    if (mon.exp >= next) {
      const before = calcStats(mon);
      mon.level++;
      const after = calcStats(mon);
      if (mon.hp > 0) mon.hp += after.hp - before.hp;
      leveled = true;
      hooks.onLevel?.();
      await jingle("level");
      await say(tr({ en: "{n} grew to Lv. {l}!", pt: "{n} subiu para o Nv. {l}!" }, { n: displayName(mon), l: mon.level }));
      for (const mv of newMovesAt(mon.species, mon.level)) await learnMove(mon, mv);
    }
  }
  return leveled;
}

export function canEvolve(mon: Mon): boolean {
  const evo = SPECIES[mon.species].evolves;
  return !!evo && mon.level >= evo.level && mon.hp > 0;
}
