// Battle overlay: info boxes, HP/EXP bars and the FIGHT / BAG / TEAM / RUN menus.
// It implements BattleUI for the engine and drives the 3D stage through `bv`.

import { useEffect, useReducer, useRef, useState } from "react";
import { G, useGame, tr } from "../game/store";
import { runBattle, type Action, type BattleUI, type Side } from "../game/battle";
import { currentBattle, finishBattle } from "../game/flow";
import { bv, ANIM_MS, now, resetVis } from "../three/battleVis";
import { displayName, maxHp, expForLevel, type Mon } from "../game/mon";
import { MOVES } from "../data/moves";
import { ITEMS, type ItemId } from "../data/items";
import { TYPES } from "../data/types";
import { sfx } from "../game/audio";
import { HpBar, MonIcon, StatusTag } from "./common";
import { useKeys, moveCursor } from "./useKeys";

type Menu =
  | null
  | { kind: "action" }
  | { kind: "moves" }
  | { kind: "bag" }
  | { kind: "party"; forced: boolean; item?: ItemId };

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function tween(from: number, to: number, ms: number, onStep: (v: number) => void): Promise<void> {
  return new Promise((resolve) => {
    if (from === to || ms <= 0) {
      onStep(to);
      return resolve();
    }
    const t0 = performance.now();
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      onStep(from + (to - from) * p);
      if (p < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

export function Battle() {
  const mode = useGame((s) => s.mode);
  const [key, setKey] = useState(0);
  const prev = useRef(mode);
  useEffect(() => {
    if (mode === "battle" && prev.current !== "battle") setKey((k) => k + 1);
    prev.current = mode;
  }, [mode]);
  if (mode !== "battle") return null;
  return <BattleInner key={key} />;
}

function BattleInner() {
  const [enemy, setEnemy] = useState<Mon | null>(null);
  const [player, setPlayer] = useState<Mon | null>(null);
  const disp = useRef({ player: 0, enemy: 0, exp: 0 });
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [menu, setMenu] = useState<Menu>(null);
  const [cursor, setCursor] = useState(0);
  const [moveCursorI, setMoveCursor] = useState(0);
  const [warn, setWarn] = useState<string | null>(null);
  const resolveAction = useRef<((a: Action) => void) | null>(null);
  const resolveForced = useRef<((i: number) => void) | null>(null);
  const started = useRef(false);
  const dialog = useGame((s) => s.dialog);
  const party = useGame((s) => s.party);
  const bag = useGame((s) => s.bag);
  const wild = currentBattle()?.kind === "wild";
  useGame((s) => s.rev);
  useGame((s) => s.lang);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const setup = currentBattle();
    if (!setup) return;
    resetVis();
    const ui: BattleUI = {
      setActive(side, mon) {
        if (!mon) return;
        bv[side].species = mon.species;
        bv[side].hidden = false;
        if (side === "enemy") {
          enemyRef.current = mon;
          setEnemy(mon);
          disp.current.enemy = mon.hp;
        } else {
          playerRef.current = mon;
          setPlayer(mon);
          disp.current.player = mon.hp;
          disp.current.exp = mon.exp;
        }
        rerender();
      },
      async anim(kind, side, opts) {
        const s = bv[side];
        s.anim = kind;
        s.t0 = now();
        s.type = opts?.type ?? null;
        if (kind === "send") sfx("send");
        await wait(ANIM_MS[kind]);
        if (kind === "faint" || kind === "recall") s.hidden = true;
        if (kind === "absorb") s.hidden = true;
        if (kind === "break") s.hidden = false;
        if (kind !== "throw" && kind !== "absorb" && kind !== "shake" && kind !== "caught") s.anim = null;
        rerender();
      },
      hp(side: Side) {
        const mon = side === "enemy" ? enemyRef.current : playerRef.current;
        if (!mon) return Promise.resolve();
        const from = disp.current[side];
        const to = mon.hp;
        const ms = Math.min(1200, (Math.abs(from - to) / Math.max(1, maxHp(mon))) * 1500 + 150);
        return tween(from, to, ms, (v) => {
          disp.current[side] = v;
          rerender();
        });
      },
      xp(from, to) {
        return tween(from, to, 700, (v) => {
          disp.current.exp = v;
          rerender();
        });
      },
      refresh() {
        const p = playerRef.current;
        if (p) {
          disp.current.exp = p.exp;
          disp.current.player = p.hp;
        }
        rerender();
      },
      chooseAction() {
        setCursor(0);
        setMenu({ kind: "action" });
        return new Promise<Action>((res) => (resolveAction.current = res));
      },
      choosePartyForced() {
        setCursor(0);
        setMenu({ kind: "party", forced: true });
        return new Promise<number>((res) => (resolveForced.current = res));
      },
    };
    void runBattle(setup, ui).then(async (r) => {
      await wait(250);
      G().set({ fade: true });
      await wait(320);
      finishBattle(r);
      await wait(120);
      G().set({ fade: false });
    });
  }, []);

  const enemyRef = useRef<Mon | null>(null);
  const playerRef = useRef<Mon | null>(null);
  enemyRef.current = enemy;
  playerRef.current = player;

  const act = (a: Action) => {
    setMenu(null);
    setWarn(null);
    const r = resolveAction.current;
    resolveAction.current = null;
    r?.(a);
  };

  const bagItems = (Object.keys(bag) as ItemId[]).filter((id) => (bag[id] ?? 0) > 0);

  function choosePartyMember(i: number) {
    if (!menu || menu.kind !== "party") return;
    const m = party[i];
    if (!m) return;
    if (menu.item) {
      sfx("select");
      act({ kind: "item", item: menu.item, target: i });
      return;
    }
    if (m.hp <= 0) {
      sfx("bump");
      setWarn(tr({ en: "{n} has no energy left to battle!", pt: "{n} não tem energia para lutar!" }, { n: displayName(m) }));
      return;
    }
    if (m === player) {
      sfx("bump");
      setWarn(tr({ en: "{n} is already in battle!", pt: "{n} já está na batalha!" }, { n: displayName(m) }));
      return;
    }
    sfx("select");
    if (menu.forced) {
      setMenu(null);
      const r = resolveForced.current;
      resolveForced.current = null;
      r?.(i);
    } else act({ kind: "switch", index: i });
  }

  function chooseAction(i: number) {
    sfx("select");
    if (i === 0) {
      setMoveCursor(0);
      setMenu({ kind: "moves" });
    } else if (i === 1) {
      setCursor(0);
      setMenu({ kind: "bag" });
    } else if (i === 2) {
      setCursor(0);
      setMenu({ kind: "party", forced: false });
    } else act({ kind: "run" });
  }

  function chooseMove(i: number) {
    if (!player) return;
    const mv = player.moves[i];
    if (!mv) return;
    if (mv.pp <= 0 && player.moves.some((m) => m.pp > 0)) {
      sfx("bump");
      setWarn(tr({ en: "There's no PP left for this move!", pt: "Esse golpe não tem mais PP!" }));
      return;
    }
    sfx("select");
    act({ kind: "move", index: i });
  }

  function chooseItem(id: ItemId) {
    const it = ITEMS[id];
    sfx("select");
    if (it.ball) act({ kind: "item", item: id, target: 0 });
    else {
      setCursor(0);
      setMenu({ kind: "party", forced: false, item: id });
    }
  }

  useKeys(
    (b) => {
      if (!menu) return;
      setWarn(null);
      if (menu.kind === "action") {
        if (b === "a") chooseAction(cursor);
        else if (b !== "b" && b !== "start") {
          sfx("cursor");
          setCursor((c) => moveCursor(c, b, 4, 2));
        }
      } else if (menu.kind === "moves") {
        const n = player?.moves.length ?? 1;
        if (b === "a") chooseMove(moveCursorI);
        else if (b === "b") {
          sfx("back");
          setCursor(0);
          setMenu({ kind: "action" });
        } else if (b !== "start") {
          sfx("cursor");
          setMoveCursor((c) => moveCursor(c, b, n, 2));
        }
      } else if (menu.kind === "bag") {
        const n = bagItems.length + 1;
        if (b === "a") {
          if (cursor >= bagItems.length) {
            sfx("back");
            setCursor(1);
            setMenu({ kind: "action" });
          } else chooseItem(bagItems[cursor]);
        } else if (b === "b") {
          sfx("back");
          setCursor(1);
          setMenu({ kind: "action" });
        } else if (b === "up" || b === "down") {
          sfx("cursor");
          setCursor((c) => moveCursor(c, b, n));
        }
      } else if (menu.kind === "party") {
        const n = party.length + (menu.forced ? 0 : 1);
        if (b === "a") {
          if (cursor >= party.length) {
            sfx("back");
            setCursor(menu.item ? 0 : 2);
            setMenu(menu.item ? { kind: "bag" } : { kind: "action" });
          } else choosePartyMember(cursor);
        } else if (b === "b" && !menu.forced) {
          sfx("back");
          setCursor(menu.item ? 0 : 2);
          setMenu(menu.item ? { kind: "bag" } : { kind: "action" });
        } else if (b === "up" || b === "down") {
          sfx("cursor");
          setCursor((c) => moveCursor(c, b, n));
        }
      }
    },
    !!menu && !dialog,
  );

  const pMax = player ? maxHp(player) : 1;
  const eMax = enemy ? maxHp(enemy) : 1;
  const expLo = player ? expForLevel(player.level) : 0;
  const expHi = player ? expForLevel(player.level + 1) : 1;
  const expF = player ? Math.max(0, Math.min(1, (disp.current.exp - expLo) / (expHi - expLo))) : 0;
  const ACTIONS = [
    { en: "FIGHT", pt: "LUTAR" },
    { en: "BAG", pt: "BOLSA" },
    { en: "TEAM", pt: "EQUIPE" },
    { en: "RUN", pt: "FUGIR" },
  ];
  const showMenu = menu && !dialog;
  const curMove = player?.moves[moveCursorI];

  return (
    <div className="battle-ui">
      {enemy && !bv.enemy.hidden && (
        <div className="infobox enemy panel">
          <div className="info-top">
            <b>{displayName(enemy)}</b>
            <StatusTag mon={enemy} />
            <span className="lv">Lv{enemy.level}</span>
          </div>
          <HpBar hp={disp.current.enemy} max={eMax} />
          {wild && G().caught.includes(enemy.species) && <span className="caught-mark" title="caught">◓</span>}
        </div>
      )}
      {player && !bv.player.hidden && (
        <div className="infobox player panel">
          <div className="info-top">
            <b>{displayName(player)}</b>
            <StatusTag mon={player} />
            <span className="lv">Lv{player.level}</span>
          </div>
          <HpBar hp={disp.current.player} max={pMax} />
          <div className="hp-nums">
            {Math.max(0, Math.round(disp.current.player))} / {pMax}
          </div>
          <div className="exp-track">
            <div className="exp-fill" style={{ width: `${expF * 100}%` }} />
          </div>
        </div>
      )}

      {showMenu && menu.kind === "action" && player && (
        <div className="battle-bar">
          <div className="battle-prompt panel">{tr({ en: "What will {n} do?", pt: "O que {n} vai fazer?" }, { n: displayName(player) })}</div>
          <div className="action-grid panel">
            {ACTIONS.map((a, i) => (
              <div key={i} className={`opt ${cursor === i ? "sel" : ""}`} onPointerDown={() => chooseAction(i)} onPointerEnter={() => setCursor(i)}>
                <span className="cursor">{cursor === i ? "▶" : ""}</span>
                {tr(a)}
              </div>
            ))}
          </div>
        </div>
      )}

      {showMenu && menu.kind === "moves" && player && (
        <div className="battle-bar">
          <div className="move-grid panel">
            {[0, 1, 2, 3].map((i) => {
              const mv = player.moves[i];
              return (
                <div
                  key={i}
                  className={`opt ${moveCursorI === i ? "sel" : ""} ${mv ? "" : "empty"}`}
                  onPointerDown={() => mv && chooseMove(i)}
                  onPointerEnter={() => mv && setMoveCursor(i)}
                >
                  <span className="cursor">{moveCursorI === i ? "▶" : ""}</span>
                  {mv ? tr(MOVES[mv.id].name) : "—"}
                </div>
              );
            })}
          </div>
          <div className="move-info panel">
            {curMove && (
              <>
                <div>
                  PP {curMove.pp}/{MOVES[curMove.id].pp}
                </div>
                <div className="move-type" style={{ color: TYPES[MOVES[curMove.id].type].color }}>
                  {tr({ en: "TYPE", pt: "TIPO" })}/{tr(TYPES[MOVES[curMove.id].type].name).toUpperCase()}
                </div>
              </>
            )}
            <div className="back-btn" onPointerDown={() => { sfx("back"); setMenu({ kind: "action" }); }}>
              ✕
            </div>
          </div>
        </div>
      )}

      {showMenu && menu.kind === "bag" && (
        <div className="battle-list panel">
          <div className="list-title">{tr({ en: "BAG", pt: "BOLSA" })}</div>
          {bagItems.map((id, i) => (
            <div key={id} className={`row ${cursor === i ? "sel" : ""}`} onPointerDown={() => chooseItem(id)} onPointerEnter={() => setCursor(i)}>
              <span className="cursor">{cursor === i ? "▶" : ""}</span>
              <span className="grow">{tr(ITEMS[id].name)}</span>
              <span>×{bag[id]}</span>
            </div>
          ))}
          <div className={`row ${cursor === bagItems.length ? "sel" : ""}`} onPointerDown={() => { sfx("back"); setMenu({ kind: "action" }); }}>
            <span className="cursor">{cursor === bagItems.length ? "▶" : ""}</span>
            {tr({ en: "CANCEL", pt: "CANCELAR" })}
          </div>
          {bagItems[cursor] && <div className="list-desc">{tr(ITEMS[bagItems[cursor]].desc)}</div>}
        </div>
      )}

      {showMenu && menu.kind === "party" && (
        <div className="battle-list panel">
          <div className="list-title">
            {menu.item
              ? tr({ en: "Use on which creature?", pt: "Usar em qual criatura?" })
              : menu.forced
                ? tr({ en: "Choose the next creature.", pt: "Escolha a próxima criatura." })
                : tr({ en: "Choose a creature.", pt: "Escolha uma criatura." })}
          </div>
          {party.map((m, i) => (
            <div key={m.uid} className={`row party-row ${cursor === i ? "sel" : ""}`} onPointerDown={() => choosePartyMember(i)} onPointerEnter={() => setCursor(i)}>
              <span className="cursor">{cursor === i ? "▶" : ""}</span>
              <MonIcon species={m.species} size={26} fainted={m.hp <= 0} />
              <span className="grow">
                {displayName(m)} <small>Lv{m.level}</small> <StatusTag mon={m} />
              </span>
              <span className="mini-hp">
                <HpBar hp={m.hp} max={maxHp(m)} />
                <small>
                  {m.hp}/{maxHp(m)}
                </small>
              </span>
            </div>
          ))}
          {!menu.forced && (
            <div className={`row ${cursor === party.length ? "sel" : ""}`} onPointerDown={() => { sfx("back"); setMenu(menu.item ? { kind: "bag" } : { kind: "action" }); }}>
              <span className="cursor">{cursor === party.length ? "▶" : ""}</span>
              {tr({ en: "CANCEL", pt: "CANCELAR" })}
            </div>
          )}
          {warn && <div className="list-desc warn">{warn}</div>}
        </div>
      )}
      {warn && showMenu && menu.kind === "moves" && <div className="toast">{warn}</div>}
    </div>
  );
}
