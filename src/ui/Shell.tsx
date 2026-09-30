// Title screen, HUD, fades/wipes and the on-screen touch pad.

import { useEffect, useState } from "react";
import { G, hasSave, loadGame, newSave, savePrefs, tr, useGame } from "../game/store";
import { input, type Button } from "../game/input";
import { music, sfx, unlockAudio } from "../game/audio";
import { loadMap, rt } from "../world/runtime";
import { runIntro } from "../world/scripts";
import { useKeys, moveCursor } from "./useKeys";
import type { Dir } from "../game/store";

export function Title() {
  const mode = useGame((s) => s.mode);
  const lang = useGame((s) => s.lang);
  const [started, setStarted] = useState(false);
  const [cursor, setCursor] = useState(0);
  const save = hasSave();
  const opts = [
    ...(save ? [{ id: "continue", label: tr({ en: "CONTINUE", pt: "CONTINUAR" }) }] : []),
    { id: "new", label: tr({ en: "NEW GAME", pt: "NOVO JOGO" }) },
    { id: "lang", label: lang === "en" ? "LANGUAGE: ENGLISH" : "IDIOMA: PORTUGUÊS" },
  ];

  useEffect(() => {
    if (mode === "title") {
      loadMap("overworld", 15, 62, "down");
      music("town");
    }
  }, [mode]);

  const choose = (id: string) => {
    if (G().fade) return;
    unlockAudio();
    if (id === "lang") {
      sfx("cursor");
      G().set({ lang: lang === "en" ? "pt" : "en" });
      savePrefs();
      return;
    }
    sfx("select");
    if (id === "continue") {
      const d = loadGame();
      if (!d) return;
      G().set({ ...d, mode: "world", fade: true });
      loadMap(d.pos.map, d.pos.x, d.pos.y, d.pos.facing);
      setTimeout(() => G().set({ fade: false }), 250);
    } else {
      const s = G();
      const fresh = newSave();
      s.set({ ...fresh, lang: s.lang, fade: true });
      setTimeout(() => {
        G().set({ fade: false });
        void runIntro();
      }, 350);
    }
  };

  useKeys(
    (b: Button) => {
      if (!started) {
        unlockAudio();
        sfx("select");
        setStarted(true);
        return;
      }
      if (b === "up" || b === "down") {
        sfx("cursor");
        setCursor((c) => moveCursor(c, b, opts.length));
      } else if (b === "a" || b === "start") choose(opts[cursor].id);
      else if ((b === "left" || b === "right") && opts[cursor].id === "lang") choose("lang");
    },
    mode === "title",
  );

  if (mode !== "title") return null;
  return (
    <div
      className="title"
      onPointerDown={() => {
        if (!started) {
          unlockAudio();
          setStarted(true);
        }
      }}
    >
      <div className="logo">
        <div className="logo-main">ENCANTADOS</div>
        <div className="logo-sub">{tr({ en: "Creatures of the Cerrado", pt: "Criaturas do Cerrado" })}</div>
      </div>
      {!started ? (
        <div className="press-start blink">{tr({ en: "PRESS START", pt: "APERTE START" })}</div>
      ) : (
        <div className="title-menu panel">
          {opts.map((o, i) => (
            <div key={o.id} className={`opt ${i === cursor ? "sel" : ""}`} onPointerDown={(e) => { e.stopPropagation(); setCursor(i); choose(o.id); }}>
              <span className="cursor">{i === cursor ? "▶" : ""}</span>
              {o.label}
            </div>
          ))}
        </div>
      )}
      <div className="title-foot">{tr({ en: "A fan-made creature adventure · procedural low-poly · WebAudio chiptune", pt: "Uma aventura de criaturas feita por fã · low-poly procedural · chiptune WebAudio" })}</div>
    </div>
  );
}

function areaName(): string {
  if (rt.map === "overworld") {
    const y = rt.player.y;
    if (y < -91) return "SERRA DO CIPÓ";
    if (y < -72) return tr({ en: "ROUTE 4", pt: "ROTA 4" });
    if (y < -36) return tr({ en: "ROUTE 3", pt: "ROTA 3" });
    if (y < 0) return tr({ en: "ROUTE 2", pt: "ROTA 2" });
    if (y < 18) return "CIDADE IPÊ";
    if (y <= 55) return tr({ en: "ROUTE 1", pt: "ROTA 1" });
    return "VILA PEQUI";
  }
  const names: Record<string, { en: string; pt: string }> = {
    home: { en: "{player}'s HOUSE", pt: "CASA DE {player}" },
    rivalhouse: { en: "{rival}'s HOUSE", pt: "CASA DE {rival}" },
    lab: { en: "JATOBÁ LAB", pt: "LAB. JATOBÁ" },
    center1: { en: "HEALING CENTER", pt: "CENTRO DE CURA" },
    center2: { en: "HEALING CENTER", pt: "CENTRO DE CURA" },
    mart1: { en: "SHOP", pt: "LOJA" },
    mart2: { en: "SHOP", pt: "LOJA" },
    arena1: { en: "CIDADE IPÊ ARENA", pt: "ARENA DE CIDADE IPÊ" },
    center3: { en: "HEALING CENTER", pt: "CENTRO DE CURA" },
    lapinha1: { en: "GRUTA DA LAPINHA 1F", pt: "GRUTA DA LAPINHA 1º" },
    lapinha2: { en: "GRUTA DA LAPINHA B1F", pt: "GRUTA DA LAPINHA S1" },
    lapinha3: { en: "GRUTA DA LAPINHA B2F", pt: "GRUTA DA LAPINHA S2" },
    center4: { en: "HEALING CENTER", pt: "CENTRO DE CURA" },
    mart3: { en: "SHOP", pt: "LOJA" },
    arena2: { en: "SERRA DO CIPÓ ARENA", pt: "ARENA DA SERRA DO CIPÓ" },
  };
  return tr(names[rt.map]).toUpperCase();
}

export function Hud() {
  const mode = useGame((s) => s.mode);
  const screen = useGame((s) => s.screen);
  const [area, setArea] = useState("");
  const [bannerAt, setBannerAt] = useState(0);
  useEffect(() => {
    if (mode !== "world") return;
    let last = "";
    const id = setInterval(() => {
      const a = areaName();
      if (a !== last) {
        last = a;
        setArea(a);
        setBannerAt(Date.now());
      }
    }, 250);
    return () => clearInterval(id);
  }, [mode]);
  useEffect(() => {
    const id = setInterval(() => {
      if (G().mode === "world") G().set({ playTime: G().playTime + 1 });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  if (mode !== "world") return null;
  const showBanner = Date.now() - bannerAt < 2600;
  return (
    <>
      {showBanner && area && <div key={bannerAt} className="area-banner panel">{area}</div>}
      {!screen && (
        <button className="menu-btn btn" onClick={() => input.press("start")} aria-label="Menu">
          ☰
        </button>
      )}
    </>
  );
}

export function Fade() {
  const fade = useGame((s) => s.fade);
  const wipe = useGame((s) => s.wipe);
  return (
    <>
      <div className={`fade ${fade ? "on" : ""}`} />
      {wipe && (
        <div className="wipe">
          <div className="wipe-bar top" />
          <div className="wipe-bar bottom" />
        </div>
      )}
    </>
  );
}

function PadButton({ b, className, label }: { b: Button; className: string; label: string }) {
  const isDir = b === "up" || b === "down" || b === "left" || b === "right";
  return (
    <button
      className={`pad-btn ${className}`}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        unlockAudio();
        if (isDir) input.down(b as Dir);
        if (b === "b") input.setB(true);
        input.press(b);
      }}
      onPointerUp={() => {
        if (isDir) input.up(b as Dir);
        if (b === "b") input.setB(false);
      }}
      onPointerCancel={() => {
        if (isDir) input.up(b as Dir);
        if (b === "b") input.setB(false);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

export function TouchPad() {
  const touchOn = useGame((s) => s.touch);
  const mode = useGame((s) => s.mode);
  if (!touchOn || mode === "title") return null;
  return (
    <div className="touchpad">
      <div className="dpad">
        <PadButton b="up" className="up" label="▲" />
        <PadButton b="left" className="left" label="◀" />
        <PadButton b="right" className="right" label="▶" />
        <PadButton b="down" className="down" label="▼" />
      </div>
      <div className="ab">
        <PadButton b="b" className="b" label="B" />
        <PadButton b="a" className="a" label="A" />
      </div>
      <div className="startsel">
        <PadButton b="start" className="start" label="START" />
      </div>
    </div>
  );
}
