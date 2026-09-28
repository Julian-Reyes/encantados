// Story and interaction scripts. Each is an async function that runs with player control locked.

import { G, addItem, flag, markCaught, setFlag, touch, tr, type MapId } from "../game/store";
import { say, yesno, promptText, type Text } from "../game/dialog";
import { jingle, music, sfx } from "../game/audio";
import { createMon, healMon } from "../game/mon";
import { startBattle, runEvolutions } from "../game/flow";
import type { BattleResult } from "../game/battle";
import { SPECIES, STARTERS, type SpeciesId } from "../data/species";
import { ITEMS } from "../data/items";
import { TYPES, type L } from "../data/types";
import {
  NPCS, encounterTable, tileAt, type Building, type NpcDef,
} from "./maps";
import {
  rt, actor, blocked, dirVec, exclaim, exteriorExit, face, faceToward, fadeIn, fadeOut, interiorEntry, itemAt,
  loadMap, mapMusic, npcAt, npcDefsFor, refreshNpcVisibility, runScript, signAt, walk, warp, wait,
} from "./runtime";

const hasStarter = () => G().party.length > 0 || flag("hasStarter");

const COUNTER: Record<SpeciesId, SpeciesId> = {
  fagulho: "bolhuga", bolhuga: "brotapo", brotapo: "fagulho",
} as Record<SpeciesId, SpeciesId>;

function rivalStarter(): SpeciesId {
  return COUNTER[G().starter ?? "fagulho"] ?? "bolhuga";
}

async function speak(who: L | string, ...lines: Text[]) {
  const name = tr(who);
  await say(...lines.map((l) => `${name}: ${tr(l)}`));
}
const PROF: L = { en: "JATOBÁ", pt: "JATOBÁ" };
const RIVAL: L = { en: "{rival}", pt: "{rival}" };
const MOM: L = { en: "MOM", pt: "MÃE" };

// ---------------------------------------------------------------- intro
export async function runIntro() {
  G().set({ mode: "intro", introShow: "prof" });
  music("lab");
  await wait(400);
  await speak(PROF,
    { en: "Hello there! Welcome to the world of Encantados!", pt: "Olá! Bem-vindo ao mundo de Encantados!" },
    { en: "My name is Jatobá. Folks around here call me the Creature Professor.", pt: "Meu nome é Jatobá. Por aqui me chamam de Professor das Criaturas." },
    { en: "This land is full of creatures born from old legends. Some live in the cerrado, some in the rivers, some in the dark of night.", pt: "Esta terra é cheia de criaturas nascidas de lendas antigas. Umas vivem no cerrado, outras nos rios, outras no escuro da noite." },
    { en: "People raise them as friends, and trainers battle alongside them. I study them all!", pt: "As pessoas as criam como amigas, e treinadores batalham ao lado delas. Eu estudo todas!" },
  );
  G().set({ introShow: "player" });
  await speak(PROF, { en: "Now, tell me about yourself. What's your name?", pt: "Agora, me conte sobre você. Qual é o seu nome?" });
  const name = (await promptText({ en: "Your name?", pt: "Seu nome?" }, G().playerName, 10)).trim() || "Caju";
  G().set({ playerName: name });
  await speak(PROF, { en: "{player}! What a fine name.", pt: "{player}! Que belo nome." });
  G().set({ introShow: "rival" });
  await speak(PROF,
    { en: "This is my grandson. You two have been rivals since you could walk.", pt: "Este é meu neto. Vocês dois são rivais desde que aprenderam a andar." },
    { en: "...Erm, what was his name again?", pt: "...Hã, qual era o nome dele mesmo?" },
  );
  const rival = (await promptText({ en: "Rival's name?", pt: "Nome do rival?" }, G().rivalName, 10)).trim() || "Caio";
  G().set({ rivalName: rival });
  await speak(PROF, { en: "Right, right! {rival}! How could I forget.", pt: "Isso, isso! {rival}! Como pude esquecer." });
  G().set({ introShow: "player" });
  await speak(PROF,
    { en: "{player}, your journey starts today.", pt: "{player}, sua jornada começa hoje." },
    { en: "Creatures, friends, rivals and legends are waiting out there. Let's go!", pt: "Criaturas, amigos, rivais e lendas esperam por você. Vamos lá!" },
  );
  await fadeOut();
  G().set({ mode: "world" });
  loadMap("home", 6, 4, "down");
  await wait(200);
  await fadeIn();
}

// ---------------------------------------------------------------- steps
export function onStepEnd(): boolean {
  const p = rt.player;
  const map = rt.map;
  if (map === "overworld") music(mapMusic(map, p.y));

  if (map === "overworld" && !hasStarter() && p.y === 57 && p.x >= 14 && p.x <= 17) {
    void runScript(profStop);
    return true;
  }
  if (map === "overworld" && hasStarter() && !flag("rivalBeaten") && p.y === 36 && (p.x === 15 || p.x === 16)) {
    void runScript(rivalRoute);
    return true;
  }
  for (const def of npcDefsFor(map)) {
    if (!def.trainer || flag("beat_" + def.id)) continue;
    const a = rt.npcs.get(def.id);
    if (a && a.visible && sees(a.x, a.y, a.facing, def.trainer.sight)) {
      void runScript(() => trainerBattle(def, true));
      return true;
    }
  }
  if (map === "overworld" && tileAt(map, p.x, p.y) === '"' && G().party.some((m) => m.hp > 0) && Math.random() < 0.1) {
    void runScript(wildEncounter);
    return true;
  }
  return false;
}

function sees(x: number, y: number, facing: "up" | "down" | "left" | "right", range: number): boolean {
  const [dx, dy] = dirVec(facing);
  const p = rt.player;
  for (let i = 1; i <= range; i++) {
    const tx = x + dx * i;
    const ty = y + dy * i;
    if (p.x === tx && p.y === ty) return true;
    if (blocked(tx, ty)) return false;
  }
  return false;
}

// ---------------------------------------------------------------- battles
async function afterBattle(r: BattleResult) {
  if (r.outcome === "lose") {
    await whiteout();
    return;
  }
  if (r.evolve.length) await runEvolutions(r.evolve);
  music(mapMusic(rt.map, rt.player.y));
}

async function wildEncounter() {
  const table = encounterTable(rt.player.y);
  const total = table.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  let slot = table[0];
  for (const e of table) {
    roll -= e.weight;
    if (roll < 0) {
      slot = e;
      break;
    }
  }
  const lvl = slot.min + Math.floor(Math.random() * (slot.max - slot.min + 1));
  const mon = createMon(slot.species, lvl);
  const r = await startBattle({ kind: "wild", enemy: [mon] });
  await afterBattle(r);
}

async function trainerBattle(def: NpcDef, spotted: boolean) {
  const t = def.trainer!;
  const a = actor(def.id);
  const p = rt.player;
  if (spotted) {
    await exclaim(def.id);
    const dist = Math.abs(p.x - a.x) + Math.abs(p.y - a.y);
    if (dist > 1) await walk(def.id, a.facing, dist - 1);
  }
  faceToward(def.id, p.x, p.y);
  faceToward("player", a.x, a.y);
  await speak(t.name, t.intro);
  const team = t.team.map(([s, l]) => createMon(s, l));
  const r = await startBattle({ kind: "trainer", enemy: team, trainer: { id: def.id, name: t.name, reward: t.reward, win: t.win }, music: t.music });
  if (r.outcome === "win") setFlag("beat_" + def.id);
  await afterBattle(r);
  if (r.outcome === "win" && t.badge) await awardBadge(def, t.badge);
}

const BADGES: Record<string, L> = {
  badgeTopaz: { en: "Topaz Badge", pt: "Insígnia Topázio" },
};

async function awardBadge(def: NpcDef, badge: string) {
  const t = def.trainer!;
  await speak(t.name, { en: "You've earned this. Take it!", pt: "Você mereceu. Pegue!" });
  setFlag(badge);
  refreshNpcVisibility();
  void jingle("caught");
  await say(tr({ en: "{player} received the {b}!", pt: "{player} recebeu a {b}!" }, { b: tr(BADGES[badge]) }));
  await speak(t.name, t.after);
}

export async function whiteout() {
  const s = G();
  const lost = Math.min(Math.floor(s.money / 2), 150);
  await say(tr({ en: "{player} hurried back to safety, carrying the exhausted creatures...", pt: "{player} correu para um lugar seguro, carregando as criaturas exaustas..." }));
  if (lost > 0) await say(tr({ en: "{player} dropped R${m} in the rush!", pt: "{player} deixou cair R${m} na correria!" }, { m: lost }));
  await fadeOut();
  s.set({ money: s.money - lost });
  for (const m of s.party) healMon(m);
  touch();
  const h = G().heal;
  loadMap(h.map, h.x, h.y, h.facing);
  await wait(400);
  await fadeIn();
  if (h.map === "home") await speak(MOM, { en: "Oh dear, you look worn out! Rest up... there, all better. Be careful out there!", pt: "Nossa, você está exausto! Descanse... pronto, novinho em folha. Tome cuidado lá fora!" });
  else await say(tr({ en: "Your creatures have been healed. Please don't push them so hard!", pt: "Suas criaturas foram curadas. Não exagere com elas!" }));
}

// ---------------------------------------------------------------- story
async function profStop() {
  const p = rt.player;
  await say(tr({ en: "???: Hey! Wait! Don't go out there!", pt: "???: Ei! Espere! Não vá lá fora!" }));
  await exclaim("player");
  const sx = Math.min(16, Math.max(15, p.x));
  const prof = actor("profTown");
  prof.x = prof.fromX = sx;
  prof.y = prof.fromY = 62;
  prof.visible = true;
  prof.facing = "up";
  face("player", "down");
  await walk("profTown", "up", 62 - (p.y + 1));
  faceToward("profTown", p.x, p.y);
  faceToward("player", prof.x, prof.y);
  await speak(PROF,
    { en: "Phew! That was close. Wild creatures live in the tall grass up there!", pt: "Ufa! Essa foi por pouco. Criaturas selvagens vivem no mato alto lá em cima!" },
    { en: "Going out without a creature of your own is dangerous. Come with me to my lab!", pt: "Sair sem uma criatura sua é perigoso. Venha comigo ao meu laboratório!" },
  );
  await fadeOut();
  setFlag("profInLab");
  setFlag("rivalInLab");
  loadMap("lab", 6, 5, "up");
  await wait(300);
  await fadeIn();
  await speak(RIVAL, { en: "Grandpa! I've been waiting here forever!", pt: "Vô! Estou esperando aqui há séculos!" });
  await speak(PROF,
    { en: "{rival}? Ah, yes, I did ask you to come by. Just a moment.", pt: "{rival}? Ah, sim, pedi para você vir. Só um momento." },
    { en: "{player}, see the three amulets on the table? Each one holds a creature I raised myself.", pt: "{player}, está vendo os três amuletos na mesa? Cada um guarda uma criatura que eu mesmo criei." },
    { en: "I want one of them to travel with you. Go on, choose!", pt: "Quero que uma delas viaje com você. Vamos, escolha!" },
  );
  await speak(RIVAL, { en: "Hey! What about me, Grandpa?", pt: "Ei! E eu, vô?" });
  await speak(PROF, { en: "Patience, {rival}! You'll get one too.", pt: "Paciência, {rival}! Você também vai ganhar uma." });
}

const STARTER_LINES: Record<string, L> = {
  brotapo: { en: "Brotapo is easy to raise, and the bud on its back grows with sunlight.", pt: "Brotapo é fácil de criar, e o broto nas costas cresce com o sol." },
  fagulho: { en: "Fagulho is bursting with energy! Just keep it away from dry grass.", pt: "Fagulho é cheio de energia! Só mantenha longe do capim seco." },
  bolhuga: { en: "Bolhuga is calm but tough as a river stone. It loves a good swim.", pt: "Bolhuga é calmo, mas duro como pedra de rio. Adora nadar." },
};

async function starterTable(x: number) {
  const species = STARTERS[x - 5];
  if (!species) return;
  if (!flag("profInLab")) {
    await say(tr({ en: "Three amulets rest on the table.", pt: "Três amuletos descansam sobre a mesa." }));
    return;
  }
  if (hasStarter()) {
    const rs = rivalStarter();
    if (species === G().starter || species === rs) await say(tr({ en: "This amulet is empty now.", pt: "Este amuleto está vazio agora." }));
    else await speak(PROF, { en: "That's the last one. I'll keep it here at the lab.", pt: "Esse é o último. Vou mantê-lo aqui no laboratório." });
    return;
  }
  const sp = SPECIES[species];
  G().set({ preview: species });
  const ok = await yesno(tr({ en: "So, you want {n}, the {t} creature?", pt: "Então você quer {n}, a criatura do tipo {t}?" }, { n: sp.name, t: tr(TYPES[sp.types[0]].name) }));
  if (!ok) {
    G().set({ preview: null });
    return;
  }
  await speak(PROF, STARTER_LINES[species]);
  G().set({ preview: null });
  const mon = createMon(species, 5, { perfect: true });
  G().party.push(mon);
  markCaught(species);
  G().set({ starter: species });
  setFlag("hasStarter");
  touch();
  void jingle("item");
  await say(tr({ en: "{player} received {n}!", pt: "{player} recebeu {n}!" }, { n: sp.name }));
  await wait(400);
  if (await yesno(tr({ en: "Give a nickname to {n}?", pt: "Dar um apelido para {n}?" }, { n: sp.name }))) {
    const nick = (await promptText(tr({ en: "{n}'s nickname?", pt: "Apelido de {n}?" }, { n: sp.name }), sp.name, 10)).trim();
    if (nick && nick !== sp.name) mon.nickname = nick;
    touch();
  }
  // Rival grabs the one with the type advantage.
  const rs = rivalStarter();
  await walk("labRival", "left", 1);
  face("labRival", "up");
  await speak(RIVAL, { en: "Then I'll take this one!", pt: "Então eu fico com este!" });
  setFlag("rivalHasStarter");
  void jingle("item");
  await say(tr({ en: "{rival} received {n}!", pt: "{rival} recebeu {n}!" }, { n: SPECIES[rs].name }));
  faceToward("labRival", rt.player.x, rt.player.y);
  await speak(RIVAL, { en: "Heh. Mine's got the edge on yours, {player}. Just saying.", pt: "Heh. O meu leva vantagem sobre o seu, {player}. Só avisando." });
  faceToward("player", 6, 2);
  await speak(PROF,
    { en: "{player}, take this too. It's an Almanaque!", pt: "{player}, leve isto também. É um Almanaque!" },
    { en: "It records every creature you see or catch, with notes in English and Portuguese.", pt: "Ele registra toda criatura que você vê ou captura, com notas em português e inglês." },
  );
  setFlag("hasDex");
  void jingle("item");
  await say(tr({ en: "{player} received the Almanaque!", pt: "{player} recebeu o Almanaque!" }));
  addItem("amuleto", 5);
  await speak(PROF, { en: "And here are 5 Amulets. Throw one at a weakened wild creature to catch it!", pt: "E aqui estão 5 Amuletos. Jogue um numa criatura selvagem enfraquecida para capturá-la!" });
  void jingle("item");
  await say(tr({ en: "{player} received 5 Amulets!", pt: "{player} recebeu 5 Amuletos!" }));
  await speak(RIVAL, tr({ en: "I'm off to Route 1 to toughen up my {n}. Try to keep up, {player}!", pt: "Vou para a Rota 1 treinar meu {n}. Tente me acompanhar, {player}!" }, { n: SPECIES[rs].name }));
  // Walk out around the tables.
  await walk("labRival", "down", 3);
  await walk("labRival", "left", 3);
  await walk("labRival", "down", 2);
  sfx("door");
  setFlag("rivalInLab", false);
  refreshNpcVisibility();
}

async function rivalRoute() {
  const p = rt.player;
  await speak(RIVAL, { en: "Hey! {player}! Wait up!", pt: "Ei! {player}! Espera aí!" });
  const r = actor("rival");
  r.x = r.fromX = p.x;
  r.y = r.fromY = 32;
  r.facing = "down";
  r.visible = true;
  setFlag("rivalRouteShow");
  face("player", "up");
  await walk("rival", "down", 35 - 32, 5);
  await speak(RIVAL,
    tr({ en: "Took you long enough! My {n} and I have been training nonstop.", pt: "Demorou, hein! Eu e meu {n} treinamos sem parar." }, { n: SPECIES[rivalStarter()].name }),
    { en: "Let's see what your creature can do!", pt: "Vamos ver do que sua criatura é capaz!" },
  );
  const team = [createMon("pardalito", 4), createMon(rivalStarter(), 6)];
  team[1].moves = team[1].moves.slice(0, 3);
  const res = await startBattle({
    kind: "trainer",
    enemy: team,
    trainer: { id: "rival", name: { en: "Rival {rival}", pt: "Rival {rival}" }, reward: 280, win: { en: "What?! No way! I picked the wrong one!", pt: "O quê?! Não pode ser! Escolhi o errado!" } },
    music: "trainer",
  });
  if (res.outcome === "win") {
    setFlag("rivalBeaten");
    await afterBattle(res);
    await speak(RIVAL,
      { en: "Hmph. Beginner's luck! I'm heading to Cidade Ipê. Don't fall behind, {player}!", pt: "Hmph. Sorte de principiante! Vou para Cidade Ipê. Não fique para trás, {player}!" },
    );
    await walk("rival", "up", 4, 6);
  } else {
    await speak(RIVAL, { en: "Ha! Told you mine had the edge!", pt: "Rá! Eu disse que o meu levava vantagem!" });
    await afterBattle(res);
  }
  setFlag("rivalRouteShow", false);
  refreshNpcVisibility();
}

// ---------------------------------------------------------------- NPC scripts
const NPC_SCRIPTS: Record<string, (def: NpcDef) => Promise<void>> = {
  async mom() {
    if (!hasStarter()) {
      await speak(MOM,
        { en: "Morning, {player}! Professor Jatobá stopped by looking for you.", pt: "Bom dia, {player}! O Professor Jatobá passou aqui procurando você." },
        { en: "His lab is at the south end of town. Hurry along!", pt: "O laboratório dele fica no sul da vila. Vá logo!" },
      );
      return;
    }
    await speak(MOM, { en: "{player}! You should take a quick rest.", pt: "{player}! Descanse um pouquinho." });
    await healParty();
    G().set({ heal: { map: "home", x: 4, y: 5, facing: "up" } });
    await speak(MOM, { en: "There! You and your creatures look great. Take care, sweetie!", pt: "Pronto! Você e suas criaturas estão ótimos. Se cuida, querido!" });
  },
  async sister() {
    if (hasStarter() && !flag("sisterGift")) {
      await speak({ en: "LUÍSA", pt: "LUÍSA" },
        { en: "Hi {player}! {rival} already rushed off with his new creature.", pt: "Oi {player}! {rival} já saiu correndo com a criatura nova." },
        { en: "Here, take these for your journey!", pt: "Tome, leve isto para a sua jornada!" },
      );
      addItem("pocao", 2);
      setFlag("sisterGift");
      void jingle("item");
      await say(tr({ en: "{player} received 2 Potions!", pt: "{player} recebeu 2 Poções!" }));
      return;
    }
    await speak({ en: "LUÍSA", pt: "LUÍSA" }, { en: "My little brother {rival} wants to be the best trainer in Minas. Go easy on him!", pt: "Meu irmão {rival} quer ser o melhor treinador de Minas. Pegue leve com ele!" });
  },
  async prof() {
    if (!hasStarter()) {
      await speak(PROF, { en: "Go on, pick one of the three amulets on the table!", pt: "Vamos, escolha um dos três amuletos na mesa!" });
      return;
    }
    const n = G().caught.length;
    const seen = G().seen.length;
    await speak(PROF, { en: "Ah, {player}! How is your Almanaque coming along?", pt: "Ah, {player}! Como vai o seu Almanaque?" });
    await say(tr({ en: "Seen: {s}   Caught: {c}", pt: "Vistos: {s}   Capturados: {c}" }, { s: seen, c: n }));
    await speak(PROF, n >= 10
      ? { en: "Wonderful! You're a natural researcher!", pt: "Maravilha! Você é um pesquisador nato!" }
      : { en: "Keep exploring the tall grass on Route 1. There's more out there!", pt: "Continue explorando o mato alto da Rota 1. Há muito mais por lá!" });
    if (!G().bag.amuleto && !G().bag.superamuleto) {
      await speak(PROF, { en: "Out of Amulets? Here, take a few more.", pt: "Sem Amuletos? Tome mais alguns." });
      addItem("amuleto", 5);
      void jingle("item");
      await say(tr({ en: "{player} received 5 Amulets!", pt: "{player} recebeu 5 Amuletos!" }));
    }
  },
  async labRival() {
    await speak(RIVAL, hasStarter()
      ? { en: "My creature's gonna crush yours!", pt: "Minha criatura vai esmagar a sua!" }
      : { en: "Go ahead and pick first. I'm generous like that. Heh.", pt: "Pode escolher primeiro. Sou generoso assim. Heh." });
  },
  async nurse() {
    await say(
      tr({ en: "Welcome to the Healing Center!", pt: "Bem-vindo ao Centro de Cura!" }),
      tr({ en: "We restore tired creatures to full health.", pt: "Aqui restauramos a saúde de criaturas cansadas." }),
    );
    if (!G().party.length) {
      await say(tr({ en: "Oh, you don't have any creatures yet. Come back anytime!", pt: "Ah, você ainda não tem criaturas. Volte quando quiser!" }));
      return;
    }
    if (await yesno(tr({ en: "Shall I heal your creatures?", pt: "Posso curar suas criaturas?" }))) {
      await say(tr({ en: "OK, I'll take your creatures for a moment.", pt: "Certo, vou pegar suas criaturas por um momento." }));
      await healParty(true);
      G().set({ heal: { map: rt.map, x: 5, y: 3, facing: "up" } });
      await say(tr({ en: "Thank you for waiting! Your creatures are fully healed.", pt: "Obrigada por esperar! Suas criaturas estão totalmente curadas." }));
    }
    await say(tr({ en: "We hope to see you again!", pt: "Esperamos ver você de novo!" }));
  },
  async clerkTown() {
    await say(tr({ en: "Hi there! Welcome to the Vila Pequi Shop!", pt: "Olá! Bem-vindo à Loja de Vila Pequi!" }));
    G().set({ screen: "shop", shopKind: "town" });
  },
  async clerkCity() {
    await say(tr({ en: "Welcome to the Cidade Ipê Shop! We carry the good stuff.", pt: "Bem-vindo à Loja de Cidade Ipê! Aqui tem do bom e do melhor." }));
    G().set({ screen: "shop", shopKind: "city" });
  },
  async martGuy() {
    if (!flag("martGuyGift")) {
      await say(
        tr({ en: "Hi! I work at the shop in Vila Pequi.", pt: "Oi! Eu trabalho na loja de Vila Pequi." }),
        tr({ en: "Here's a free sample for you!", pt: "Tome uma amostra grátis!" }),
      );
      addItem("pocao", 1);
      setFlag("martGuyGift");
      void jingle("item");
      await say(tr({ en: "{player} got a Potion!", pt: "{player} ganhou uma Poção!" }));
    }
    await say(tr({ en: "We sell Amulets and Potions. Stop by anytime!", pt: "Vendemos Amuletos e Poções. Passe lá quando quiser!" }));
  },
};

async function healParty(machine = false) {
  for (const m of G().party) healMon(m);
  touch();
  music(null);
  if (machine) {
    // Place one amulet per creature on the machine, then light them up for the jingle.
    for (let i = 1; i <= Math.min(G().party.length, 6); i++) {
      G().set({ healSlots: i });
      sfx("click");
      await wait(350);
    }
    G().set({ healGlow: true });
  }
  await jingle("heal");
  if (machine) G().set({ healSlots: 0, healGlow: false });
  music(mapMusic(rt.map, rt.player.y));
}

async function talk(id: string) {
  const def = NPCS.find((n) => n.id === id && n.map === rt.map);
  if (!def) return;
  faceToward(id, rt.player.x, rt.player.y);
  if (def.trainer) {
    if (flag("beat_" + id)) await speak(def.trainer.name, def.trainer.after);
    else await trainerBattle(def, false);
    return;
  }
  if (def.script && NPC_SCRIPTS[def.script]) await NPC_SCRIPTS[def.script](def);
  else if (def.text) await say(...def.text);
}

// ---------------------------------------------------------------- interaction dispatch
const FURNITURE: Record<string, L> = {
  b: { en: "It's crammed full of books about creatures.", pt: "Está lotada de livros sobre criaturas." },
  v: { en: "A movie is on: a kid walks down a dirt road with a creature at their side... Time to go too!", pt: "Está passando um filme: uma criança anda por uma estrada de terra com uma criatura ao lado... Hora de ir também!" },
  s: { en: "The stairs lead up to the bedrooms.", pt: "A escada leva aos quartos." },
  B: { en: "A comfy bed with a patchwork quilt.", pt: "Uma cama confortável com colcha de retalhos." },
  m: { en: "A complicated machine is beeping away.", pt: "Uma máquina complicada está apitando." },
  x: { en: "Shelves stacked with Potions and Amulets.", pt: "Prateleiras cheias de Poções e Amuletos." },
  h: { en: "A machine that restores creatures' health.", pt: "Uma máquina que restaura a saúde das criaturas." },
  f: { en: "A potted plant. It's well looked after.", pt: "Um vaso de planta. Está bem cuidado." },
  t: { en: "A sturdy wooden table.", pt: "Uma mesa de madeira firme." },
  O: { en: "A stone fountain. The water sparkles in the sun.", pt: "Uma fonte de pedra. A água brilha ao sol." },
  r: { en: "A big boulder. Something might be napping under it...", pt: "Uma pedra grande. Algo pode estar cochilando embaixo..." },
  "~": { en: "The water is calm and clear.", pt: "A água está calma e cristalina." },
  o: { en: "A chunk of raw stone. Flecks of topaz glitter in it.", pt: "Um bloco de pedra bruta. Pontinhos de topázio brilham nele." },
};

export function onInteract(x: number, y: number) {
  const npc = npcAt(x, y);
  if (npc) return void runScript(() => talk(npc));
  const sign = signAt(x, y);
  if (sign) return void runScript(() => say(sign.text));
  const item = itemAt(x, y);
  if (item) {
    return void runScript(async () => {
      setFlag("item_" + item.id);
      addItem(item.item, item.qty);
      void jingle("item");
      const n = tr(ITEMS[item.item].name);
      await say(tr(item.qty > 1 ? { en: "{player} found {q}× {i}!", pt: "{player} encontrou {q}× {i}!" } : { en: "{player} found a {i}!", pt: "{player} encontrou: {i}!" }, { i: n, q: item.qty }));
    });
  }
  const t = tileAt(rt.map, x, y);
  if (rt.map === "lab" && t === "a") return void runScript(() => starterTable(x));
  if (t === "c") {
    // Talk across the counter.
    const [dx, dy] = dirVec(rt.player.facing);
    const beyond = npcAt(x + dx, y + dy);
    if (beyond) return void runScript(() => talk(beyond));
    return;
  }
  if (t === "p") {
    return void runScript(async () => {
      await say(tr({ en: "{player} booted up the PC.", pt: "{player} ligou o PC." }));
      G().set({ screen: "pc" });
    });
  }
  if (t === "s" && rt.map === "rivalhouse") return void runScript(() => say({ en: "{rival}'s room is upstairs. Better not snoop.", pt: "O quarto de {rival} fica lá em cima. Melhor não bisbilhotar." }));
  if (t === "b" && rt.map === "lab") return void runScript(() => say({ en: "Research notes: \"Starter creatures evolve at level 12. Wild ones take longer...\"", pt: "Anotações: \"Criaturas iniciais evoluem no nível 12. As selvagens demoram mais...\"" }));
  const f = FURNITURE[t];
  if (f) return void runScript(() => say(f));
}

export function onBuildingDoor(b: Building) {
  void runScript(async () => {
    if (b.interior) {
      const [ix, iy] = interiorEntry(b.interior);
      await warp(b.interior, ix, iy, "up");
      return;
    }
    sfx("bump");
    if (b.kind === "church") await say({ en: "The church doors are closed. The bells ring every Sunday morning.", pt: "As portas da igreja estão fechadas. Os sinos tocam todo domingo de manhã." });
    else await say({ en: "It's locked.", pt: "Está trancada." });
  });
}

export function onExitAttempt() {
  void runScript(async () => {
    if (rt.map === "lab" && !hasStarter() && flag("profInLab")) {
      await speak(PROF, { en: "Hey, don't go yet! Pick a creature first!", pt: "Ei, não vá ainda! Escolha uma criatura primeiro!" });
      await walk("player", "up", 1);
      return;
    }
    const ext = exteriorExit(rt.map as MapId);
    if (!ext) return;
    await warp("overworld", ext[0], ext[1], "down");
  });
}
