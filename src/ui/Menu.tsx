// Start menu and its screens: Almanaque, Team (+ summary), Bag, trainer card, Save, Options.

import { useState } from "react";
import { G, flag, saveGame, savePrefs, touch, tr, useGame, type Screen } from "../game/store";
import { say, yesno } from "../game/dialog";
import { sfx, refreshMusic } from "../game/audio";
import { currentSpot, runScript } from "../world/runtime";
import { DEX_ORDER, SPECIES } from "../data/species";
import { ITEMS, mtFits, type Item, type ItemId } from "../data/items";
import { MOVES } from "../data/moves";
import { TYPES } from "../data/types";
import { calcStats, displayName, expForLevel, maxHp, type Mon } from "../game/mon";
import { learnMove } from "../game/progression";
import { HpBar, MonIcon, Portrait, StatusTag, TypeBadge } from "./common";
import { useKeys, moveCursor } from "./useKeys";
import { BADGES, BadgeIcon } from "./Badges";
import type { L } from "../data/types";

const close = () => G().set({ screen: null });
const open = (s: Screen) => G().set({ screen: s });

// ---------------------------------------------------------------- start menu
export function StartMenu() {
  const screen = useGame((s) => s.screen);
  const dialog = useGame((s) => s.dialog);
  const party = useGame((s) => s.party);
  const name = useGame((s) => s.playerName);
  useGame((s) => s.lang);
  const [cursor, setCursor] = useState(0);
  const items: { label: string; run: () => void }[] = [];
  if (flag("hasDex")) items.push({ label: "ALMANAQUE", run: () => open("almanaque") });
  if (party.length) items.push({ label: tr({ en: "TEAM", pt: "EQUIPE" }), run: () => open("team") });
  items.push({ label: tr({ en: "BAG", pt: "BOLSA" }), run: () => open("bag") });
  items.push({ label: name.toUpperCase(), run: () => open("card") });
  items.push({
    label: tr({ en: "SAVE", pt: "SALVAR" }),
    run: () =>
      void runScript(async () => {
        if (await yesno({ en: "Would you like to save your progress?", pt: "Deseja salvar seu progresso?" })) {
          const ok = saveGame(currentSpot());
          sfx("save");
          await say(ok ? { en: "{player} saved the game!", pt: "{player} salvou o jogo!" } : { en: "Saving failed (storage is blocked in this browser).", pt: "Não foi possível salvar (armazenamento bloqueado neste navegador)." });
        }
      }),
  });
  items.push({ label: tr({ en: "OPTIONS", pt: "OPÇÕES" }), run: () => open("options") });
  items.push({
    label: tr({ en: "EXIT", pt: "SAIR" }),
    run: () =>
      void runScript(async () => {
        if (await yesno({ en: "Return to the title screen? Unsaved progress will be lost.", pt: "Voltar à tela inicial? O progresso não salvo será perdido." })) {
          G().set({ screen: null, mode: "title" });
        }
      }),
  });
  const active = screen === "menu" && !dialog;
  const idx = Math.min(cursor, items.length - 1);

  useKeys(
    (b) => {
      if (b === "up" || b === "down") {
        sfx("cursor");
        setCursor(moveCursor(idx, b, items.length));
      } else if (b === "a") {
        sfx("select");
        items[idx].run();
      } else if (b === "b" || b === "start") {
        sfx("back");
        close();
      }
    },
    active,
  );
  if (screen !== "menu") return null;
  return (
    <div className="start-menu panel">
      {items.map((it, i) => (
        <div
          key={it.label}
          className={`opt ${i === idx ? "sel" : ""}`}
          onPointerDown={() => {
            sfx("select");
            setCursor(i);
            it.run();
          }}
        >
          <span className="cursor">{i === idx ? "▶" : ""}</span>
          {it.label}
        </div>
      ))}
    </div>
  );
}

function ScreenFrame({ title, children, onBack, wide }: { title: string; children: React.ReactNode; onBack: () => void; wide?: boolean }) {
  return (
    <div className="screen-backdrop">
      <div className={`screen panel ${wide ? "wide" : ""}`}>
        <div className="screen-head">
          <span>{title}</span>
          <button className="btn small" onClick={() => { sfx("back"); onBack(); }}>
            ✕
          </button>
        </div>
        <div className="screen-body">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- team
export function TeamScreen() {
  const screen = useGame((s) => s.screen);
  const party = useGame((s) => s.party);
  const dialog = useGame((s) => s.dialog);
  useGame((s) => s.rev);
  useGame((s) => s.lang);
  const [cursor, setCursor] = useState(0);
  const [sub, setSub] = useState<null | "opts" | "switch" | "summary">(null);
  const [subCursor, setSubCursor] = useState(0);
  const [swapFrom, setSwapFrom] = useState(0);
  const active = screen === "team" && !dialog;
  const back = () => open("menu");

  const doSwap = (a: number, b: number) => {
    const p = G().party;
    [p[a], p[b]] = [p[b], p[a]];
    touch();
  };

  useKeys(
    (b) => {
      if (sub === "summary") return;
      if (sub === "opts") {
        if (b === "up" || b === "down") {
          sfx("cursor");
          setSubCursor((c) => moveCursor(c, b, 3));
        } else if (b === "a") {
          sfx("select");
          if (subCursor === 0) setSub("summary");
          else if (subCursor === 1) {
            setSwapFrom(cursor);
            setSub("switch");
          } else setSub(null);
        } else if (b === "b") {
          sfx("back");
          setSub(null);
        }
        return;
      }
      if (b === "up" || b === "down") {
        sfx("cursor");
        setCursor((c) => moveCursor(c, b, party.length));
      } else if (b === "a") {
        sfx("select");
        if (sub === "switch") {
          doSwap(swapFrom, cursor);
          setSub(null);
        } else {
          setSubCursor(0);
          setSub("opts");
        }
      } else if (b === "b") {
        sfx("back");
        if (sub === "switch") setSub(null);
        else back();
      }
    },
    active,
  );

  if (screen !== "team") return null;
  return (
    <ScreenFrame title={tr({ en: "TEAM", pt: "EQUIPE" })} onBack={back}>
      <div className="team-list">
        {party.map((m, i) => (
          <div
            key={m.uid}
            className={`team-card ${i === cursor ? "sel" : ""} ${sub === "switch" && i === swapFrom ? "swap" : ""}`}
            onPointerDown={() => {
              if (sub === "switch") {
                doSwap(swapFrom, i);
                setSub(null);
                return;
              }
              setCursor(i);
              setSubCursor(0);
              setSub("opts");
            }}
          >
            <MonIcon species={m.species} fainted={m.hp <= 0} />
            <div className="grow">
              <div>
                <b>{displayName(m)}</b> <StatusTag mon={m} />
              </div>
              <small>Lv{m.level}</small>
            </div>
            <div className="team-hp">
              <HpBar hp={m.hp} max={maxHp(m)} />
              <small>
                {m.hp}/{maxHp(m)}
              </small>
            </div>
          </div>
        ))}
      </div>
      <div className="hint">
        {sub === "switch" ? tr({ en: "Move to which spot?", pt: "Mover para qual posição?" }) : tr({ en: "Choose a creature.", pt: "Escolha uma criatura." })}
      </div>
      {sub === "opts" && (
        <div className="sub-menu panel">
          {[{ en: "SUMMARY", pt: "RESUMO" }, { en: "SWITCH", pt: "TROCAR" }, { en: "CANCEL", pt: "CANCELAR" }].map((o, i) => (
            <div
              key={i}
              className={`opt ${i === subCursor ? "sel" : ""}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                sfx("select");
                if (i === 0) setSub("summary");
                else if (i === 1) {
                  setSwapFrom(cursor);
                  setSub("switch");
                } else setSub(null);
              }}
            >
              <span className="cursor">{i === subCursor ? "▶" : ""}</span>
              {tr(o)}
            </div>
          ))}
        </div>
      )}
      {sub === "summary" && party[cursor] && (
        <Summary
          mons={party}
          index={cursor}
          onIndex={setCursor}
          onClose={() => setSub(null)}
        />
      )}
    </ScreenFrame>
  );
}

function Summary({ mons, index, onIndex, onClose }: { mons: Mon[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const m = mons[index];
  useKeys(
    (b) => {
      if (b === "b" || b === "a") {
        sfx("back");
        onClose();
      } else if (b === "up" || b === "left") {
        sfx("cursor");
        onIndex((index - 1 + mons.length) % mons.length);
      } else if (b === "down" || b === "right") {
        sfx("cursor");
        onIndex((index + 1) % mons.length);
      }
    },
    true,
    1,
  );
  const sp = SPECIES[m.species];
  const st = calcStats(m);
  const lo = expForLevel(m.level);
  const hi = expForLevel(m.level + 1);
  const STAT_L: [keyof typeof st, L][] = [
    ["hp", { en: "HP", pt: "PV" }],
    ["atk", { en: "ATTACK", pt: "ATAQUE" }],
    ["def", { en: "DEFENSE", pt: "DEFESA" }],
    ["spa", { en: "SP. ATK", pt: "AT. ESP." }],
    ["spd", { en: "SP. DEF", pt: "DEF. ESP." }],
    ["spe", { en: "SPEED", pt: "VELOC." }],
  ];
  return (
    <div className="summary panel" onPointerDown={(e) => e.stopPropagation()}>
      <div className="summary-left">
        <Portrait key={m.species} species={m.species} size={170} />
        <div className="summary-name">
          <b>{displayName(m)}</b> <span>Lv{m.level}</span>
        </div>
        <div>
          No.{String(sp.dex).padStart(3, "0")} {sp.name}
        </div>
        <div className="types">
          {sp.types.map((t) => (
            <TypeBadge key={t} t={t} />
          ))}
        </div>
        <div className="exp-line">
          EXP {m.exp} · {tr({ en: "next", pt: "próx." })} {Math.max(0, hi - m.exp)}
          <div className="exp-track">
            <div className="exp-fill" style={{ width: `${((m.exp - lo) / (hi - lo)) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="summary-right">
        <table className="stats">
          <tbody>
            {STAT_L.map(([k, l]) => (
              <tr key={k}>
                <td>{tr(l)}</td>
                <td>{k === "hp" ? `${m.hp}/${st.hp}` : st[k]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="moves">
          {m.moves.map((mv) => (
            <div key={mv.id} className="move-row">
              <span className="type-dot" style={{ background: TYPES[MOVES[mv.id].type].color }} />
              <span className="grow">{tr(MOVES[mv.id].name)}</span>
              <small>
                PP {mv.pp}/{MOVES[mv.id].pp}
              </small>
            </div>
          ))}
        </div>
        <div className="summary-nav">
          <button className="btn small" onClick={() => onIndex((index - 1 + mons.length) % mons.length)}>◀</button>
          <button className="btn small" onClick={onClose}>OK</button>
          <button className="btn small" onClick={() => onIndex((index + 1) % mons.length)}>▶</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- bag
type Pocket = Item["pocket"];
const POCKETS: Pocket[] = ["items", "amulets", "mts", "key"];
const POCKET_NAMES: Record<Pocket, L> = {
  items: { en: "ITEMS", pt: "ITENS" },
  amulets: { en: "AMULETS", pt: "AMULETOS" },
  mts: { en: "MTs", pt: "MTs" },
  key: { en: "KEY ITEMS", pt: "ITENS-CHAVE" },
};

export function BagScreen() {
  const screen = useGame((s) => s.screen);
  const bag = useGame((s) => s.bag);
  const party = useGame((s) => s.party);
  const dialog = useGame((s) => s.dialog);
  useGame((s) => s.rev);
  useGame((s) => s.lang);
  const [pocket, setPocket] = useState<Pocket>("items");
  const [cursor, setCursor] = useState(0);
  const [target, setTarget] = useState<ItemId | null>(null);
  const [tCursor, setTCursor] = useState(0);
  const list = (Object.keys(bag) as ItemId[]).filter((id) => ITEMS[id].pocket === pocket && (bag[id] ?? 0) > 0);
  const active = screen === "bag" && !dialog;
  const back = () => open("menu");
  const idx = Math.min(cursor, Math.max(0, list.length));

  const useOn = (id: ItemId, i: number) =>
    void runScript(async () => {
      const m = G().party[i];
      const it = ITEMS[id];
      if (it.mt) {
        // MTs are never used up.
        const mv = tr(MOVES[it.mt.move].name);
        if (!mtFits(id, SPECIES[m.species])) await say(tr({ en: "{n} can't learn {m}.", pt: "{n} não pode aprender {m}." }, { n: displayName(m), m: mv }));
        else if (m.moves.some((k) => k.id === it.mt!.move)) await say(tr({ en: "{n} already knows {m}.", pt: "{n} já sabe {m}." }, { n: displayName(m), m: mv }));
        else {
          await say(tr({ en: "{player} booted up the MT. It contains {m}!", pt: "{player} ligou o MT. Ele contém {m}!" }, { m: mv }));
          await learnMove(m, it.mt.move);
          touch();
          setTarget(null);
        }
        return;
      }
      const max = maxHp(m);
      let msg: L | null = null;
      if (it.revive) {
        if (m.hp > 0) msg = null;
        else {
          m.hp = Math.floor(max / 2);
          m.status = null;
          msg = { en: "{n} was revived!", pt: "{n} foi revivido!" };
        }
      } else if (m.hp > 0) {
        if (it.heal && m.hp < max) {
          m.hp = Math.min(max, m.hp + it.heal);
          msg = { en: "{n}'s HP was restored.", pt: "Os PV de {n} foram restaurados." };
        }
        if (it.cures && m.status && (it.cures === "all" || it.cures.includes(m.status))) {
          m.status = null;
          m.sleepTurns = 0;
          msg = msg ?? { en: "{n} is healthy again!", pt: "{n} está saudável de novo!" };
        }
      }
      if (!msg) {
        await say({ en: "It won't have any effect.", pt: "Não vai ter efeito." });
        return;
      }
      const bagNow = { ...G().bag };
      bagNow[id] = (bagNow[id] ?? 1) - 1;
      if (!bagNow[id]) delete bagNow[id];
      G().set({ bag: bagNow });
      touch();
      sfx("statUp");
      await say(tr(msg, { n: displayName(m) }));
      setTarget(null);
    });

  useKeys(
    (b) => {
      if (target) {
        if (b === "up" || b === "down") {
          sfx("cursor");
          setTCursor((c) => moveCursor(c, b, party.length));
        } else if (b === "a") useOn(target, tCursor);
        else if (b === "b") {
          sfx("back");
          setTarget(null);
        }
        return;
      }
      if (b === "left" || b === "right") {
        sfx("cursor");
        setPocket((p) => POCKETS[(POCKETS.indexOf(p) + (b === "right" ? 1 : POCKETS.length - 1)) % POCKETS.length]);
        setCursor(0);
      } else if (b === "up" || b === "down") {
        sfx("cursor");
        setCursor(moveCursor(idx, b, list.length + 1));
      } else if (b === "a") {
        if (idx >= list.length) {
          sfx("back");
          back();
          return;
        }
        pick(list[idx]);
      } else if (b === "b") {
        sfx("back");
        back();
      }
    },
    active,
  );

  function pick(id: ItemId) {
    sfx("select");
    if (ITEMS[id].pocket === "amulets") {
      void runScript(() => say({ en: "Amulets are thrown at wild creatures during battle.", pt: "Amuletos são jogados em criaturas selvagens durante a batalha." }));
      return;
    }
    if (ITEMS[id].pocket === "key") {
      void runScript(() => say(ITEMS[id].desc));
      return;
    }
    if (!party.length) {
      void runScript(() => say({ en: "You don't have any creatures yet.", pt: "Você ainda não tem criaturas." }));
      return;
    }
    setTCursor(0);
    setTarget(id);
  }

  if (screen !== "bag") return null;
  return (
    <ScreenFrame title={tr({ en: "BAG", pt: "BOLSA" })} onBack={back}>
      <div className="tabs">
        {POCKETS.map((p) => (
          <button key={p} className={`tab ${pocket === p ? "on" : ""}`} onClick={() => { setPocket(p); setCursor(0); }}>
            {tr(POCKET_NAMES[p])}
          </button>
        ))}
      </div>
      <div className="item-list">
        {list.map((id, i) => (
          <div key={id} className={`row ${i === idx ? "sel" : ""}`} onPointerDown={() => { setCursor(i); pick(id); }}>
            <span className="cursor">{i === idx ? "▶" : ""}</span>
            <span className="grow">{tr(ITEMS[id].name)}</span>
            <span>×{bag[id]}</span>
          </div>
        ))}
        {!list.length && <div className="empty-note">{tr({ en: "Nothing here.", pt: "Nada aqui." })}</div>}
        <div className={`row ${idx >= list.length ? "sel" : ""}`} onPointerDown={back}>
          <span className="cursor">{idx >= list.length ? "▶" : ""}</span>
          {tr({ en: "CLOSE BAG", pt: "FECHAR" })}
        </div>
      </div>
      <div className="list-desc">{list[idx] ? tr(ITEMS[list[idx]].desc) : ""}</div>
      {target && (
        <div className="sub-menu panel target-menu">
          <div className="list-title">{tr({ en: "Use on which creature?", pt: "Usar em qual criatura?" })}</div>
          {party.map((m, i) => (
            <div key={m.uid} className={`row party-row ${i === tCursor ? "sel" : ""}`} onPointerDown={() => useOn(target, i)}>
              <span className="cursor">{i === tCursor ? "▶" : ""}</span>
              <MonIcon species={m.species} size={24} fainted={m.hp <= 0} />
              <span className="grow">
                {displayName(m)} <StatusTag mon={m} />
              </span>
              <small>
                {ITEMS[target].mt ? tr(mtFits(target, SPECIES[m.species]) ? { en: "ABLE", pt: "PODE" } : { en: "NOT ABLE", pt: "NÃO PODE" }) : `${m.hp}/${maxHp(m)}`}
              </small>
            </div>
          ))}
        </div>
      )}
    </ScreenFrame>
  );
}

// ---------------------------------------------------------------- almanaque
export function AlmanaqueScreen() {
  const screen = useGame((s) => s.screen);
  const seen = useGame((s) => s.seen);
  const caught = useGame((s) => s.caught);
  const lang = useGame((s) => s.lang);
  const dialog = useGame((s) => s.dialog);
  const [cursor, setCursor] = useState(0);
  const [detail, setDetail] = useState(false);
  const [loreLang, setLoreLang] = useState<"en" | "pt" | null>(null);
  const active = screen === "almanaque" && !dialog;
  const back = () => open("menu");
  const id = DEX_ORDER[cursor];

  useKeys(
    (b) => {
      if (detail) {
        if (b === "b" || b === "a") {
          sfx("back");
          setDetail(false);
        } else if (b === "left" || b === "right") {
          sfx("cursor");
          setLoreLang((l) => ((l ?? lang) === "en" ? "pt" : "en"));
        } else if (b === "up" || b === "down") {
          sfx("cursor");
          setCursor((c) => moveCursor(c, b, DEX_ORDER.length));
        }
        return;
      }
      if (b === "up" || b === "down") {
        sfx("cursor");
        setCursor((c) => moveCursor(c, b, DEX_ORDER.length));
      } else if (b === "a") {
        if (seen.includes(id)) {
          sfx("select");
          setLoreLang(null);
          setDetail(true);
        } else sfx("bump");
      } else if (b === "b") {
        sfx("back");
        back();
      }
    },
    active,
  );

  if (screen !== "almanaque") return null;
  const sp = SPECIES[id];
  const isCaught = caught.includes(id);
  const ll = loreLang ?? lang;
  return (
    <ScreenFrame title="ALMANAQUE" onBack={back} wide>
      <div className="dex">
        <div className="dex-list">
          <div className="dex-count">
            {tr({ en: "SEEN", pt: "VISTOS" })} {seen.length} · {tr({ en: "CAUGHT", pt: "CAPTURADOS" })} {caught.length}
          </div>
          {DEX_ORDER.map((d, i) => {
            const s = seen.includes(d);
            return (
              <div
                key={d}
                className={`row ${i === cursor ? "sel" : ""}`}
                onPointerDown={() => {
                  setCursor(i);
                  if (s) {
                    setLoreLang(null);
                    setDetail(true);
                  }
                }}
                ref={(el) => {
                  if (el && i === cursor) el.scrollIntoView({ block: "nearest" });
                }}
              >
                <span className="cursor">{i === cursor ? "▶" : ""}</span>
                <span className="dex-no">{String(SPECIES[d].dex).padStart(3, "0")}</span>
                <span className="grow">{s ? SPECIES[d].name : "----------"}</span>
                {caught.includes(d) && <span className="caught-mark">◓</span>}
              </div>
            );
          })}
        </div>
        <div className="dex-detail">
          {seen.includes(id) ? (
            <>
              {(detail || window.innerWidth > 700) && <Portrait key={id} species={id} silhouette={!isCaught} size={190} />}
              <div className="dex-name">
                No.{String(sp.dex).padStart(3, "0")} <b>{sp.name}</b>
              </div>
              <div className="dex-kind">{tr({ en: "{k} Creature", pt: "Criatura {k}" }, { k: sp.kind[lang] })}</div>
              <div className="types">
                {sp.types.map((t) => (
                  <TypeBadge key={t} t={t} />
                ))}
              </div>
              {isCaught ? (
                <>
                  <div className="dex-hw">
                    {tr({ en: "HT", pt: "ALT" })} {sp.height.toFixed(1)} m · {tr({ en: "WT", pt: "PESO" })} {sp.weight.toFixed(1)} kg
                  </div>
                  <p className="dex-lore">{sp.lore[ll]}</p>
                  <button className="btn small" onClick={() => setLoreLang(ll === "en" ? "pt" : "en")}>
                    {ll === "en" ? "Ler em português ▶" : "Read in English ▶"}
                  </button>
                </>
              ) : (
                <p className="dex-lore dim">{tr({ en: "Catch one to learn more.", pt: "Capture um para saber mais." })}</p>
              )}
            </>
          ) : (
            <p className="dex-lore dim">{tr({ en: "Not yet seen.", pt: "Ainda não visto." })}</p>
          )}
        </div>
      </div>
      {detail && <div className="dex-mobile-close" onPointerDown={() => setDetail(false)} />}
    </ScreenFrame>
  );
}

// ---------------------------------------------------------------- trainer card
export function CardScreen() {
  const s = useGame();
  useKeys((b) => {
    if (b === "a" || b === "b" || b === "start") {
      sfx("back");
      open("menu");
    }
  }, s.screen === "card" && !s.dialog);
  if (s.screen !== "card") return null;
  const mins = Math.floor(s.playTime / 60);
  return (
    <ScreenFrame title={tr({ en: "TRAINER CARD", pt: "CARTÃO DE TREINADOR" })} onBack={() => open("menu")}>
      <div className="card">
        <div className="card-row">
          <span>{tr({ en: "NAME", pt: "NOME" })}</span>
          <b>{s.playerName}</b>
        </div>
        <div className="card-row">
          <span>{tr({ en: "MONEY", pt: "DINHEIRO" })}</span>
          <b>R${s.money}</b>
        </div>
        <div className="card-row">
          <span>ALMANAQUE</span>
          <b>
            {s.caught.length} / {DEX_ORDER.length}
          </b>
        </div>
        <div className="card-row">
          <span>{tr({ en: "TIME", pt: "TEMPO" })}</span>
          <b>
            {Math.floor(mins / 60)}:{String(mins % 60).padStart(2, "0")}
          </b>
        </div>
        <div className="card-row">
          <span>{tr({ en: "RIVAL", pt: "RIVAL" })}</span>
          <b>{s.rivalName}</b>
        </div>
        <div className="badge-case">
          {BADGES.map((b) => {
            const earned = !!s.flags[b.flag];
            return (
              <div key={b.flag} className="badge-slot" title={earned ? tr(b.name) : undefined}>
                <BadgeIcon badge={b} earned={earned} />
                <span className="badge-name">{earned ? tr(b.name).replace(/^Insígnia | Badge$/g, "") : "???"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </ScreenFrame>
  );
}

// ---------------------------------------------------------------- options
export function OptionsScreen() {
  const s = useGame();
  const [cursor, setCursor] = useState(0);
  const rows: { label: L; value: string; toggle: () => void }[] = [
    { label: { en: "LANGUAGE", pt: "IDIOMA" }, value: s.lang === "en" ? "ENGLISH" : "PORTUGUÊS", toggle: () => s.set({ lang: s.lang === "en" ? "pt" : "en" }) },
    { label: { en: "SOUND FX", pt: "EFEITOS" }, value: s.sound ? "ON" : "OFF", toggle: () => s.set({ sound: !s.sound }) },
    {
      label: { en: "MUSIC", pt: "MÚSICA" },
      value: s.music ? "ON" : "OFF",
      toggle: () => {
        s.set({ music: !s.music });
        refreshMusic();
      },
    },
    { label: { en: "TOUCH PAD", pt: "CONTROLE NA TELA" }, value: s.touch ? "ON" : "OFF", toggle: () => s.set({ touch: !s.touch }) },
    { label: { en: "GRAPHICS", pt: "GRÁFICOS" }, value: s.lowGfx ? (s.lang === "en" ? "LOW" : "BAIXO") : (s.lang === "en" ? "HIGH" : "ALTO"), toggle: () => s.set({ lowGfx: !s.lowGfx }) },
  ];
  const act = (i: number) => {
    rows[i].toggle();
    sfx("select");
    setTimeout(savePrefs, 0);
  };
  useKeys(
    (b) => {
      if (b === "up" || b === "down") {
        sfx("cursor");
        setCursor((c) => moveCursor(c, b, rows.length));
      } else if (b === "a" || b === "left" || b === "right") act(cursor);
      else if (b === "b" || b === "start") {
        sfx("back");
        open("menu");
      }
    },
    s.screen === "options" && !s.dialog,
  );
  if (s.screen !== "options") return null;
  return (
    <ScreenFrame title={tr({ en: "OPTIONS", pt: "OPÇÕES" })} onBack={() => open("menu")}>
      {rows.map((r, i) => (
        <div key={i} className={`row option-row ${i === cursor ? "sel" : ""}`} onPointerDown={() => { setCursor(i); act(i); }}>
          <span className="cursor">{i === cursor ? "▶" : ""}</span>
          <span className="grow">{tr(r.label)}</span>
          <b>◀ {r.value} ▶</b>
        </div>
      ))}
      <div className="hint">
        {tr({
          en: "Keys: Arrows/WASD move · Z/Enter = A · X/Shift = B (hold to run) · Esc/M = menu",
          pt: "Teclas: Setas/WASD andam · Z/Enter = A · X/Shift = B (segure para correr) · Esc/M = menu",
        })}
      </div>
    </ScreenFrame>
  );
}
