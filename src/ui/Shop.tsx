// Shop (buy / sell) and the Healing Center PC (team ↔ storage).

import { useEffect, useState } from "react";
import { G, addItem, touch, tr, useGame } from "../game/store";
import { say, ask, yesno } from "../game/dialog";
import { sfx } from "../game/audio";
import { runScript } from "../world/runtime";
import { ITEMS, SHOP_CIPO, SHOP_CITY, SHOP_TOWN, type ItemId } from "../data/items";
import { displayName, maxHp } from "../game/mon";
import { MonIcon, StatusTag } from "./common";
import { useKeys, moveCursor } from "./useKeys";

export function ShopScreen() {
  const screen = useGame((s) => s.screen);
  const kind = useGame((s) => s.shopKind);
  const money = useGame((s) => s.money);
  const bag = useGame((s) => s.bag);
  const dialog = useGame((s) => s.dialog);
  useGame((s) => s.lang);
  const [mode, setMode] = useState<"root" | "buy" | "sell">("root");
  const [cursor, setCursor] = useState(0);
  const [qty, setQty] = useState<{ id: ItemId; n: number } | null>(null);
  const stock = kind === "city" ? SHOP_CITY : kind === "cipo" ? SHOP_CIPO : SHOP_TOWN;
  const sellList = (Object.keys(bag) as ItemId[]).filter((id) => (bag[id] ?? 0) > 0 && ITEMS[id].pocket !== "key" && ITEMS[id].pocket !== "mts");
  const list = mode === "buy" ? stock : sellList;
  const active = screen === "shop" && !dialog;

  const leave = () =>
    void runScript(async () => {
      G().set({ screen: null });
      setMode("root");
      await say({ en: "Please come again!", pt: "Volte sempre!" });
    });

  const root = () =>
    void runScript(async () => {
      const i = await ask({ en: "What would you like to do?", pt: "O que deseja fazer?" }, [{ en: "BUY", pt: "COMPRAR" }, { en: "SELL", pt: "VENDER" }, { en: "QUIT", pt: "SAIR" }]);
      if (i === 0) setMode("buy");
      else if (i === 1) setMode("sell");
      else leave();
      setCursor(0);
    });

  // Show the BUY / SELL / QUIT prompt as soon as the shop opens.
  useEffect(() => {
    if (screen === "shop") {
      setMode("root");
      setQty(null);
      root();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const price = (id: ItemId) => (mode === "buy" ? ITEMS[id].price : Math.floor(ITEMS[id].price / 2));
  const maxQty = (id: ItemId) => (mode === "buy" ? Math.max(1, Math.min(99, Math.floor(money / ITEMS[id].price))) : bag[id] ?? 0);

  const confirm = (id: ItemId, n: number) =>
    void runScript(async () => {
      setQty(null);
      const total = price(id) * n;
      const name = tr(ITEMS[id].name);
      if (mode === "buy") {
        if (G().money < total) {
          await say({ en: "You don't have enough money.", pt: "Você não tem dinheiro suficiente." });
          return;
        }
        if (await yesno(tr({ en: "{i} ×{n}? That will be R${t}. OK?", pt: "{i} ×{n}? Fica R${t}. Pode ser?" }, { i: name, n, t: total }))) {
          G().set({ money: G().money - total });
          addItem(id, n);
          sfx("buy");
          await say({ en: "Here you are! Thank you!", pt: "Aqui está! Obrigado!" });
          if (id === "amuleto" && n >= 10) {
            addItem("superamuleto", 1);
            await say({ en: "You bought a lot! Have a Great Amulet on the house.", pt: "Comprou bastante! Leve um Super Amuleto de brinde." });
          }
        }
      } else if (await yesno(tr({ en: "I can pay R${t} for {n} {i}. OK?", pt: "Posso pagar R${t} por {n} {i}. Pode ser?" }, { i: name, n, t: total }))) {
        G().set({ money: G().money + total });
        addItem(id, -n);
        sfx("buy");
        await say({ en: "Thank you!", pt: "Obrigado!" });
      }
    });

  useKeys(
    (b) => {
      if (mode === "root") return;
      if (qty) {
        const mx = maxQty(qty.id);
        if (b === "up" || b === "right") setQty({ ...qty, n: qty.n >= mx ? 1 : qty.n + (b === "right" ? Math.min(10, mx - qty.n) : 1) });
        else if (b === "down" || b === "left") setQty({ ...qty, n: qty.n <= 1 ? mx : Math.max(1, qty.n - (b === "left" ? 10 : 1)) });
        else if (b === "a") confirm(qty.id, qty.n);
        else if (b === "b") setQty(null);
        sfx("cursor");
        return;
      }
      if (b === "up" || b === "down") {
        sfx("cursor");
        setCursor((c) => moveCursor(c, b, list.length + 1));
      } else if (b === "a") {
        if (cursor >= list.length) {
          sfx("back");
          setMode("root");
          setTimeout(root, 0);
          return;
        }
        sfx("select");
        setQty({ id: list[cursor], n: 1 });
      } else if (b === "b") {
        sfx("back");
        setMode("root");
        setTimeout(root, 0);
      }
    },
    active,
  );

  if (screen !== "shop" || (mode === "root" && !qty)) return null;
  return (
    <div className="shop panel">
      <div className="shop-money">{tr({ en: "{player}'s money", pt: "Dinheiro de {player}" })}: R${money}</div>
      <div className="item-list">
        {list.map((id, i) => (
          <div key={id} className={`row ${i === cursor ? "sel" : ""}`} onPointerDown={() => { setCursor(i); setQty({ id, n: 1 }); }}>
            <span className="cursor">{i === cursor ? "▶" : ""}</span>
            <span className="grow">{tr(ITEMS[id].name)}</span>
            {mode === "sell" && <span className="dim">×{bag[id]} </span>}
            <span>R${price(id)}</span>
          </div>
        ))}
        {!list.length && <div className="empty-note">{tr({ en: "Nothing to sell.", pt: "Nada para vender." })}</div>}
        <div className={`row ${cursor >= list.length ? "sel" : ""}`} onPointerDown={() => { setMode("root"); setTimeout(root, 0); }}>
          <span className="cursor">{cursor >= list.length ? "▶" : ""}</span>
          {tr({ en: "CANCEL", pt: "CANCELAR" })}
        </div>
      </div>
      <div className="list-desc">{list[cursor] ? tr(ITEMS[list[cursor]].desc) : ""}</div>
      {qty && !dialog && (
        <div className="qty panel">
          <button className="btn small" onClick={() => setQty({ ...qty, n: Math.max(1, qty.n - 1) })}>−</button>
          <span>×{String(qty.n).padStart(2, "0")}</span>
          <button className="btn small" onClick={() => setQty({ ...qty, n: Math.min(maxQty(qty.id), qty.n + 1) })}>+</button>
          <b>R${price(qty.id) * qty.n}</b>
          <button className="btn small" onClick={() => confirm(qty.id, qty.n)}>OK</button>
        </div>
      )}
    </div>
  );
}

export function PCScreen() {
  const screen = useGame((s) => s.screen);
  const party = useGame((s) => s.party);
  const box = useGame((s) => s.box);
  const dialog = useGame((s) => s.dialog);
  useGame((s) => s.rev);
  useGame((s) => s.lang);
  const [col, setCol] = useState<0 | 1>(0);
  const [cursor, setCursor] = useState(0);
  const active = screen === "pc" && !dialog;
  const list = col === 0 ? party : box;

  const act = (c: 0 | 1, i: number) =>
    void runScript(async () => {
      const s = G();
      if (!active) return;
      if (c === 0) {
        if (s.party.length <= 1) {
          await say({ en: "You can't deposit your last creature!", pt: "Você não pode guardar sua última criatura!" });
          return;
        }
        if (s.party[i]?.hp > 0 && !s.party.some((m, index) => index !== i && m.hp > 0)) {
          await say({ en: "Keep at least one healthy creature on your team!", pt: "Mantenha ao menos uma criatura saudável na equipe!" });
          return;
        }
        if (!s.party[i]) return;
        const [m] = s.party.splice(i, 1);
        s.box.push(m);
        touch();
        sfx("select");
        await say(tr({ en: "{n} was stored in the PC.", pt: "{n} foi guardado no PC." }, { n: displayName(m) }));
      } else {
        if (!s.box[i]) return;
        if (s.party.length >= 6) {
          await say({ en: "Your team is full!", pt: "Sua equipe está cheia!" });
          return;
        }
        const [m] = s.box.splice(i, 1);
        s.party.push(m);
        touch();
        sfx("select");
        await say(tr({ en: "{n} joined your team.", pt: "{n} entrou na sua equipe." }, { n: displayName(m) }));
      }
      setCursor(0);
    });

  useKeys(
    (b) => {
      if (b === "left" || b === "right") {
        sfx("cursor");
        setCol((c) => (c === 0 ? 1 : 0));
        setCursor(0);
      } else if (b === "up" || b === "down") {
        sfx("cursor");
        setCursor((c) => moveCursor(c, b, Math.max(1, list.length)));
      } else if (b === "a" && list[cursor]) act(col, cursor);
      else if (b === "b" || b === "start") {
        sfx("back");
        G().set({ screen: null });
      }
    },
    active,
  );
  if (screen !== "pc") return null;
  return (
    <div className="screen-backdrop">
      <div className="screen panel wide">
        <div className="screen-head">
          <span>{tr({ en: "CREATURE STORAGE", pt: "ARMAZENAMENTO" })}</span>
          <button className="btn small" onClick={() => G().set({ screen: null })}>✕</button>
        </div>
        <div className="pc-cols">
          {[party, box].map((l, c) => (
            <div key={c} className={`pc-col ${col === c ? "on" : ""}`}>
              <div className="list-title">
                {c === 0 ? tr({ en: "TEAM (A: store)", pt: "EQUIPE (A: guardar)" }) : tr({ en: "PC (A: take)", pt: "PC (A: pegar)" })}
              </div>
              {l.map((m, i) => (
                <div key={m.uid} className={`row party-row ${col === c && i === cursor ? "sel" : ""}`} onPointerDown={() => { setCol(c as 0 | 1); setCursor(i); act(c as 0 | 1, i); }}>
                  <MonIcon species={m.species} size={24} fainted={m.hp <= 0} />
                  <span className="grow">
                    {displayName(m)} <small>Lv{m.level}</small> <StatusTag mon={m} />
                  </span>
                  <small>
                    {m.hp}/{maxHp(m)}
                  </small>
                </div>
              ))}
              {!l.length && <div className="empty-note">{tr({ en: "Empty", pt: "Vazio" })}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
