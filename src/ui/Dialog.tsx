// The text box: typewriter text, ▼ to advance, optional choice list or name entry.

import { useEffect, useRef, useState } from "react";
import { useGame } from "../game/store";
import { sfx } from "../game/audio";
import { useKeys, moveCursor } from "./useKeys";

const CPS = 55; // characters per second

export function Dialog() {
  const d = useGame((s) => s.dialog);
  const mode = useGame((s) => s.mode);
  const [shown, setShown] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const done = !!d && shown >= d.text.length;

  useEffect(() => {
    if (!d) return;
    setShown(0);
    setCursor(0);
    setText(d.input?.value ?? "");
    const start = performance.now();
    let raf = 0;
    const step = () => {
      const n = Math.floor(((performance.now() - start) / 1000) * CPS);
      setShown(Math.min(n, d.text.length));
      if (n < d.text.length) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [d]);

  // Auto-closing battle messages
  useEffect(() => {
    if (!d || !d.auto || !done || d.choices || d.input) return;
    const t = setTimeout(() => d.resolve(0), d.auto);
    return () => clearTimeout(t);
  }, [d, done]);

  useEffect(() => {
    if (d?.input && done) setTimeout(() => inputRef.current?.focus(), 30);
  }, [d, done]);

  const submitInput = () => {
    if (!d?.input) return;
    sfx("select");
    d.resolve(text.trim().slice(0, d.input.max));
  };

  useKeys(
    (b) => {
      if (!d) return;
      if (!done) {
        if (b === "a" || b === "b") setShown(d.text.length);
        return;
      }
      if (d.input) return;
      if (d.choices) {
        if (b === "up" || b === "down") {
          sfx("cursor");
          setCursor((c) => moveCursor(c, b, d.choices!.length));
        } else if (b === "a") {
          sfx("select");
          d.resolve(cursor);
        } else if (b === "b") {
          sfx("back");
          d.resolve(d.choices.length - 1);
        }
        return;
      }
      if (b === "a" || b === "b") {
        if (!d.auto) sfx("cursor");
        d.resolve(0);
      }
    },
    !!d,
    10,
  );

  if (!d) return null;
  const battle = mode === "battle";
  const lines = d.text.slice(0, shown);
  return (
    <div className={`dialog-wrap ${battle ? "in-battle" : ""}`}>
      {d.choices && done && (
        <div className="choices panel">
          {d.choices.map((c, i) => (
            <div
              key={i}
              className={`choice ${i === cursor ? "sel" : ""}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                sfx("select");
                d.resolve(i);
              }}
            >
              <span className="cursor">{i === cursor ? "▶" : ""}</span>
              {c}
            </div>
          ))}
        </div>
      )}
      <div
        className="dialog panel"
        onPointerDown={() => {
          if (!done) setShown(d.text.length);
          else if (!d.choices && !d.input) d.resolve(0);
        }}
      >
        <div className="dialog-text">{lines}</div>
        {d.input && done && (
          <form
            className="name-entry"
            onSubmit={(e) => {
              e.preventDefault();
              submitInput();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input ref={inputRef} value={text} maxLength={d.input.max} onChange={(e) => setText(e.target.value)} autoComplete="off" spellCheck={false} />
            <button type="submit" className="btn">OK</button>
          </form>
        )}
        {done && !d.choices && !d.input && !d.auto && <span className="more">▼</span>}
      </div>
    </div>
  );
}
