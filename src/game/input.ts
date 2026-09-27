// Unified keyboard + touch input.
// Held directions drive overworld walking; discrete presses go to the topmost UI handler
// (dialog, menus, battle), so only one layer reacts to each button press.

import type { Dir } from "./store";

export type Button = Dir | "a" | "b" | "start";
type Handler = (b: Button) => void;

const held = new Set<Dir>();
const heldOrder: Dir[] = [];
let bHeld = false;
const handlers: { h: Handler; pri: number }[] = [];
let worldHandler: Handler | null = null;

export const input = {
  heldDir(): Dir | null {
    return heldOrder.length ? heldOrder[heldOrder.length - 1] : null;
  },
  isRunning: () => bHeld,
  /** Push a UI layer; returns a function that removes it. Higher priority wins (dialog = 10). */
  push(h: Handler, pri = 0): () => void {
    const entry = { h, pri };
    handlers.push(entry);
    return () => {
      const i = handlers.indexOf(entry);
      if (i >= 0) handlers.splice(i, 1);
    };
  },
  uiActive: () => handlers.length > 0,
  setWorldHandler(h: Handler | null) {
    worldHandler = h;
  },
  press(b: Button) {
    if (!handlers.length) return worldHandler?.(b);
    let top = handlers[0];
    for (const e of handlers) if (e.pri >= top.pri) top = e;
    top.h(b);
  },
  down(d: Dir) {
    if (!held.has(d)) {
      held.add(d);
      heldOrder.push(d);
    }
  },
  up(d: Dir) {
    held.delete(d);
    const i = heldOrder.indexOf(d);
    if (i >= 0) heldOrder.splice(i, 1);
  },
  setB(v: boolean) {
    bHeld = v;
  },
  clear() {
    held.clear();
    heldOrder.length = 0;
    bHeld = false;
  },
};

const KEYMAP: Record<string, Button> = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
  KeyZ: "a", Space: "a", Enter: "a", KeyJ: "a",
  KeyX: "b", Backspace: "b", KeyK: "b", ShiftLeft: "b", ShiftRight: "b",
  Escape: "start", KeyM: "start", Tab: "start",
};

export function installKeyboard() {
  window.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    const b = KEYMAP[e.code];
    if (!b) return;
    e.preventDefault();
    if (b === "up" || b === "down" || b === "left" || b === "right") input.down(b);
    if (b === "b") input.setB(true);
    if (!e.repeat || b === "up" || b === "down" || b === "left" || b === "right") {
      // Arrow repeat is handy for scrolling menus; A/B/Start must not auto-repeat.
      if (!e.repeat || input.uiActive()) input.press(b);
    }
  });
  window.addEventListener("keyup", (e) => {
    const b = KEYMAP[e.code];
    if (b === "up" || b === "down" || b === "left" || b === "right") input.up(b);
    if (b === "b") input.setB(false);
  });
  window.addEventListener("blur", () => input.clear());
}
