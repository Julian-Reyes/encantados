import { useEffect, useRef } from "react";
import { input, type Button } from "../game/input";

/** Registers a UI key handler while `active`. The latest handler function is always used. */
export function useKeys(handler: (b: Button) => void, active = true, priority = 0) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    return input.push((b) => ref.current(b), priority);
  }, [active, priority]);
}

/** Cursor movement helper for vertical lists / grids. */
export function moveCursor(i: number, b: Button, count: number, cols = 1): number {
  if (count <= 0) return 0;
  if (b === "up") return (i - cols + count) % count;
  if (b === "down") return (i + cols) % count;
  if (cols > 1 && b === "left") return i % cols === 0 ? Math.min(count - 1, i + cols - 1) : i - 1;
  if (cols > 1 && b === "right") return i % cols === cols - 1 || i + 1 >= count ? i - (i % cols) : i + 1;
  return i;
}
