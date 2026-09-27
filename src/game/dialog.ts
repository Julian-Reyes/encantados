// Promise-based dialog helpers. Scripts and the battle engine `await` these;
// the <Dialog/> component renders store.dialog and calls resolve() when the player confirms.

import { G, tr } from "./store";
import type { L } from "../data/types";

let nextId = 1;

function open(d: { text: string; choices?: string[]; input?: { value: string; max: number }; auto?: number }) {
  return new Promise<number | string>((resolve) => {
    G().set({
      dialog: {
        id: nextId++,
        ...d,
        resolve: (v) => {
          G().set({ dialog: null });
          resolve(v);
        },
      },
    });
  });
}

export type Text = string | L;

export async function say(...texts: Text[]): Promise<void> {
  for (const t of texts) await open({ text: tr(t) });
}

/** Message that closes by itself (battle flow). Still skippable with A. */
export async function note(t: Text, ms = 900): Promise<void> {
  await open({ text: tr(t), auto: ms });
}

/** Shows `text`, then a choice list. B selects the last option. */
export async function ask(t: Text, choices: Text[]): Promise<number> {
  return (await open({ text: tr(t), choices: choices.map((c) => tr(c)) })) as number;
}

export async function yesno(t: Text): Promise<boolean> {
  return (await ask(t, [{ en: "YES", pt: "SIM" }, { en: "NO", pt: "NÃO" }])) === 0;
}

export async function promptText(t: Text, value: string, max = 10): Promise<string> {
  return (await open({ text: tr(t), input: { value, max } })) as string;
}
