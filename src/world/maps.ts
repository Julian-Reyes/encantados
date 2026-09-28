// All map data. Tile (x, y): x grows east, y grows south. In 3D a tile sits at (x, 0, y),
// so north is -z and the camera looks north from the south, like the handhelds.
//
// Overworld tile chars:
//   .  short grass       ,  dirt path       "  tall grass (encounters)   f  flowers
//   s  plaza stone       =  bridge          ~  water                     T  tree
//   L  ledge (hop south) r  boulder         O  fountain                  F  fence
//   Building footprints use one letter per building (door = bottom row, middle column).

import type { Dir, MapId } from "../game/store";
import type { SpeciesId } from "../data/species";
import type { ItemId } from "../data/items";
import type { L } from "../data/types";

export const OW_W = 32;
export const OW_H = 76;

function buildOverworld(): string[][] {
  const g: string[][] = Array.from({ length: OW_H }, () => Array(OW_W).fill("."));
  const fill = (x0: number, y0: number, x1: number, y1: number, ch: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch;
  };
  const put = (pts: [number, number][], ch: string) => pts.forEach(([x, y]) => (g[y][x] = ch));

  // Side borders
  fill(0, 0, 1, OW_H - 1, "T");
  fill(OW_W - 2, 0, OW_W - 1, OW_H - 1, "T");

  // ---------- CIDADE IPÊ (north village, y 0..17) ----------
  fill(0, 0, OW_W - 1, 1, "T");
  fill(27, 0, 27, 7, ",");
  fill(12, 2, 18, 6, "G"); // arena
  fill(3, 3, 7, 6, "E"); // healing center
  fill(22, 3, 25, 6, "N"); // shop
  fill(3, 8, 28, 8, ",");
  put([[5, 7], [15, 7], [24, 7]], ",");
  fill(10, 10, 21, 14, "s");
  fill(15, 11, 16, 12, "O");
  fill(3, 11, 6, 13, "h");
  fill(24, 11, 27, 13, "h");
  fill(15, 9, 16, 9, ",");
  put([[5, 14], [26, 14]], ",");
  fill(0, 16, 13, 17, "T");
  fill(18, 16, OW_W - 1, 17, "T");
  fill(14, 15, 17, 17, ",");
  put([[3, 9], [8, 10], [20, 9], [22, 9], [9, 14], [21, 15], [2, 15], [29, 9], [23, 15], [9, 2], [20, 2], [11, 7]], "f");
  put([[2, 2], [29, 2], [29, 14], [2, 10]], "T");

  // ---------- ROUTE 1 (y 18..55) ----------
  fill(14, 18, 17, 26, ",");
  fill(3, 20, 11, 26, '"');
  fill(20, 21, 27, 25, '"');
  put([[12, 19], [12, 22], [19, 19], [5, 18], [8, 18], [23, 18], [26, 19], [2, 19], [29, 20], [28, 26], [12, 26], [19, 26]], "T");
  fill(2, 27, 12, 27, "L");
  fill(19, 27, 29, 27, "L");
  fill(13, 27, 18, 27, ",");
  fill(14, 28, 17, 31, ",");
  fill(22, 28, 26, 31, "T");
  fill(3, 29, 8, 31, '"');
  put([[10, 29], [11, 31], [19, 29], [28, 29], [2, 31]], "T");
  fill(15, 32, 16, 33, ",");
  put([[6, 33], [24, 32], [27, 33], [10, 33]], "r");
  fill(2, 34, 29, 35, "~");
  fill(15, 34, 16, 35, "=");
  fill(15, 36, 16, 37, ",");
  put([[5, 36], [9, 37], [22, 36], [26, 37], [3, 37]], "r");
  fill(4, 38, 27, 44, '"');
  fill(15, 38, 16, 39, ",");
  fill(15, 43, 16, 44, ",");
  put([[3, 38], [3, 41], [28, 39], [28, 43], [10, 38], [21, 44], [9, 44], [12, 40], [19, 42]], "T");
  fill(2, 45, 13, 45, "L");
  fill(18, 45, 29, 45, "L");
  fill(14, 45, 17, 55, ",");
  fill(3, 47, 9, 52, '"');
  fill(22, 48, 28, 51, '"');
  put([[11, 47], [11, 50], [20, 47], [20, 52], [25, 53], [6, 54], [28, 53], [3, 54], [10, 53], [21, 54]], "T");
  put([[12, 48], [18, 51], [13, 55], [18, 54], [8, 46], [23, 46]], "f");

  // ---------- VILA PEQUI (start town, y 56..75) ----------
  fill(0, 56, 13, 57, "T");
  fill(18, 56, OW_W - 1, 57, "T");
  fill(14, 56, 17, 57, ",");
  fill(15, 58, 16, 62, ",");
  fill(4, 58, 7, 60, "H");
  fill(19, 58, 23, 62, "K");
  fill(25, 58, 28, 60, "R");
  fill(6, 61, 6, 62, ",");
  fill(27, 61, 27, 62, ",");
  fill(3, 63, 28, 63, ",");
  fill(10, 64, 21, 67, "s");
  fill(15, 65, 16, 66, "O");
  fill(3, 64, 7, 67, "C");
  fill(24, 64, 27, 66, "M");
  put([[5, 68], [26, 67]], ",");
  fill(18, 69, 24, 72, "P");
  fill(15, 68, 16, 73, ",");
  fill(4, 73, 27, 73, ",");
  fill(21, 73, 21, 73, ",");
  fill(5, 69, 11, 71, "~");
  fill(0, 74, OW_W - 1, 75, "T");
  fill(3, 61, 3, 61, "F");
  fill(8, 58, 8, 61, "F");
  fill(24, 58, 24, 61, "F");
  put([[2, 58], [3, 58], [2, 62], [12, 59], [13, 61], [18, 61], [29, 62], [9, 67], [22, 67], [12, 72], [28, 70], [28, 72], [2, 69], [13, 69], [26, 61], [11, 62]], "f");
  put([[2, 72], [29, 67], [13, 71]], "T");

  return g;
}

export const OVERWORLD = buildOverworld();

// ---------- Buildings ----------
export type BuildingKind = "home" | "rivalhouse" | "lab" | "center" | "mart" | "church" | "arena" | "house";
export interface Building {
  letter: string;
  kind: BuildingKind;
  x: number;
  y: number;
  w: number;
  h: number;
  door: [number, number];
  interior?: MapId;
  color: string;
  roof: string;
}

const B_INFO: Record<string, { kind: BuildingKind; interior?: MapId; color: string; roof: string }> = {
  H: { kind: "home", interior: "home", color: "#f4e3c1", roof: "#c8553d" },
  R: { kind: "rivalhouse", interior: "rivalhouse", color: "#cfe3f0", roof: "#3f6fb0" },
  P: { kind: "lab", interior: "lab", color: "#eeeeea", roof: "#6e7f8e" },
  C: { kind: "center", interior: "center1", color: "#fbf6ef", roof: "#e0463c" },
  M: { kind: "mart", interior: "mart1", color: "#fbf6ef", roof: "#3a7bd5" },
  E: { kind: "center", interior: "center2", color: "#fbf6ef", roof: "#e0463c" },
  N: { kind: "mart", interior: "mart2", color: "#fbf6ef", roof: "#3a7bd5" },
  K: { kind: "church", color: "#fdfaf2", roof: "#b5542f" },
  G: { kind: "arena", color: "#e8d6a8", roof: "#7a4fa0" },
  h: { kind: "house", color: "#f7c873", roof: "#b8472e" },
};
const HOUSE_COLORS = ["#f7c873", "#9fd3c7", "#f2a6a0", "#c3b1e1"];

function findBuildings(): Building[] {
  const seen = new Set<string>();
  const out: Building[] = [];
  for (let y = 0; y < OW_H; y++)
    for (let x = 0; x < OW_W; x++) {
      const ch = OVERWORLD[y][x];
      const info = B_INFO[ch];
      if (!info || seen.has(`${x},${y}`)) continue;
      let x1 = x;
      while (x1 + 1 < OW_W && OVERWORLD[y][x1 + 1] === ch) x1++;
      let y1 = y;
      while (y1 + 1 < OW_H && OVERWORLD[y1 + 1][x] === ch) y1++;
      for (let yy = y; yy <= y1; yy++) for (let xx = x; xx <= x1; xx++) seen.add(`${xx},${yy}`);
      const w = x1 - x + 1;
      const h = y1 - y + 1;
      const color = info.kind === "house" ? HOUSE_COLORS[out.length % HOUSE_COLORS.length] : info.color;
      out.push({ letter: ch, ...info, color, x, y, w, h, door: [x + Math.floor(w / 2), y1] });
    }
  return out;
}

export const BUILDINGS = findBuildings();

// ---------- Interiors ----------
// Interior chars: # wall  . floor  d exit mat  b bookshelf  v TV  s stairs  t table  B bed
//   f plant  r rug  c counter  h healing machine  p PC  m lab machine  a starter table
//   x shop shelf  k bench
export interface Interior {
  rows: string[];
  floor: string;
  wall: string;
  music: string;
}

const HOME_ROWS = ["##########", "#bbv...ss#", "#........#", "#..tt..B.#", "#..tt..B.#", "#........#", "#f..rr..f#", "####d#####"];
const CENTER_ROWS = ["############", "#f.h......p#", "#.cccccccc.#", "#..........#", "#.kk....kk.#", "#..........#", "#f........f#", "#####d######"];
const MART_ROWS = ["##########", "#...b.xxx#", "#ccc.....#", "#.....xx.#", "#.xx..xx.#", "#.xx.....#", "#f.......#", "####d#####"];
const LAB_ROWS = ["############", "#mm.bbbb.mm#", "#..........#", "#....aaa...#", "#..........#", "#tt......tt#", "#tt......tt#", "#..........#", "#bb......bb#", "#####d######"];

export const INTERIORS: Record<Exclude<MapId, "overworld">, Interior> = {
  home: { rows: HOME_ROWS, floor: "#d9b98a", wall: "#f3e6cf", music: "town" },
  rivalhouse: { rows: HOME_ROWS, floor: "#c9d7b0", wall: "#e5eef5", music: "town" },
  lab: { rows: LAB_ROWS, floor: "#e2e0d8", wall: "#f5f5f0", music: "lab" },
  center1: { rows: CENTER_ROWS, floor: "#f5e9e0", wall: "#fdf7f2", music: "lab" },
  center2: { rows: CENTER_ROWS, floor: "#f5e9e0", wall: "#fdf7f2", music: "lab" },
  mart1: { rows: MART_ROWS, floor: "#dfe8f2", wall: "#f5f8fb", music: "lab" },
  mart2: { rows: MART_ROWS, floor: "#dfe8f2", wall: "#f5f8fb", music: "lab" },
};

export function interiorDoor(map: MapId): [number, number] {
  const rows = INTERIORS[map as Exclude<MapId, "overworld">].rows;
  const y = rows.length - 1;
  return [rows[y].indexOf("d"), y];
}

export function buildingForInterior(map: MapId): Building | undefined {
  return BUILDINGS.find((b) => b.interior === map);
}

// ---------- NPCs ----------
export type Look =
  | "player" | "rival" | "prof" | "mom" | "nurse" | "clerk" | "girl" | "boy" | "oldman"
  | "oldwoman" | "worker" | "youngster" | "lass" | "aide" | "sister" | "man";

export interface TrainerDef {
  name: L;
  team: [SpeciesId, number][];
  reward: number;
  intro: L;
  win: L; // shown in battle when you win
  after: L; // overworld chat after defeat
  sight: number;
  music?: string;
}

export interface NpcDef {
  id: string;
  map: MapId;
  x: number;
  y: number;
  facing: Dir;
  look: Look;
  text?: L[];
  script?: string; // named script in scripts.ts
  trainer?: TrainerDef;
  visible?: (flags: Record<string, boolean>) => boolean;
  lookAround?: boolean;
}

export const NPCS: NpcDef[] = [
  // Vila Pequi
  { id: "townGirl", map: "overworld", x: 10, y: 60, facing: "down", look: "girl", lookAround: true, text: [{ en: "Did you know? The Healing Center PC can store creatures when your team is full!", pt: "Sabia? O PC do Centro de Cura guarda criaturas quando sua equipe está cheia!" }] },
  { id: "townMan", map: "overworld", x: 23, y: 68, facing: "left", look: "man", text: [{ en: "Professor Jatobá studies creatures from all over Minas Gerais. His lab is right here.", pt: "O Professor Jatobá estuda criaturas de toda Minas Gerais. O laboratório dele é aqui." }] },
  { id: "oldMan", map: "overworld", x: 12, y: 66, facing: "right", look: "oldman", lookAround: true, text: [{ en: "When I was young, I rode a Gavionte all the way to the coast! ...Well, most of the way.", pt: "Quando eu era jovem, voei num Gavionte até o litoral! ...Bom, quase até lá." }] },
  { id: "profTown", map: "overworld", x: 15, y: 62, facing: "up", look: "prof", visible: () => false },
  // Route 1
  { id: "martGuy", map: "overworld", x: 14, y: 51, facing: "right", look: "clerk", script: "martGuy" },
  {
    id: "ze", map: "overworld", x: 19, y: 49, facing: "left", look: "youngster",
    trainer: {
      name: { en: "Youngster Zé", pt: "Garoto Zé" },
      team: [["ratico", 4]],
      reward: 120,
      intro: { en: "Hey! You look new around here. My Ratiço is top of the line! Battle me!", pt: "Ei! Você é novo por aqui. Meu Ratiço é o melhor! Vamos batalhar!" },
      win: { en: "Aw man! My Ratiço needs more cheese...", pt: "Poxa! Meu Ratiço precisa de mais queijo..." },
      after: { en: "Ratiço are fast, but I guess speed isn't everything.", pt: "Ratiço é rápido, mas acho que velocidade não é tudo." },
      sight: 5,
    },
  },
  { id: "riverGirl", map: "overworld", x: 8, y: 32, facing: "down", look: "lass", lookAround: true, text: [{ en: "Pedrudo love to nap by the river. Some people step on them by accident. Ouch!", pt: "Pedrudos adoram cochilar na beira do rio. Tem gente que pisa neles sem querer. Ai!" }] },
  { id: "rival", map: "overworld", x: 15, y: 31, facing: "down", look: "rival", visible: (f) => !!f.rivalRouteShow },
  { id: "routeBoy", map: "overworld", x: 20, y: 30, facing: "left", look: "boy", text: [{ en: "Jump down the ledges to get back home faster! You can't climb them, though.", pt: "Pule os barrancos para voltar mais rápido! Mas não dá para subir neles." }] },
  // Cidade Ipê
  { id: "worker", map: "overworld", x: 27, y: 2, facing: "down", look: "worker", text: [{ en: "Sorry, the road north is closed for repairs. Come back in a future version!", pt: "Desculpe, a estrada ao norte está fechada para obras. Volte numa próxima versão!" }] },
  {
    id: "bia", map: "overworld", x: 12, y: 13, facing: "right", look: "lass",
    trainer: {
      name: { en: "Ace Trainer Bia", pt: "Treinadora Bia" },
      team: [["lagartix", 9], ["chispito", 9], ["borbolux", 11]],
      reward: 900,
      intro: { en: "Nobody passes through Ipê Plaza without facing me! Show me what you've got!", pt: "Ninguém passa pela Praça Ipê sem me enfrentar! Mostre o que sabe!" },
      win: { en: "Wow... You and your creatures are really in sync.", pt: "Uau... Você e suas criaturas estão mesmo em sintonia." },
      after: { en: "The Arena leader is away, but with a team like yours, you'd do great there someday.", pt: "O líder da Arena está viajando, mas com uma equipe dessas você vai longe." },
      sight: 4,
      music: "trainer",
    },
  },
  { id: "villageKid", map: "overworld", x: 20, y: 9, facing: "down", look: "boy", lookAround: true, text: [{ en: "At night, Borbolux light up Route 1 like floating lanterns. So pretty!", pt: "À noite, os Borbolux iluminam a Rota 1 como lanternas. Que lindo!" }] },
  { id: "villageGran", map: "overworld", x: 8, y: 9, facing: "down", look: "oldwoman", text: [{ en: "Rasgamorte? Oh, that owl scared me silly as a girl. But it's gentle as a lamb.", pt: "Rasgamorte? Ah, essa coruja me assustava quando eu era menina. Mas é mansinha." }] },
  { id: "arenaFan", map: "overworld", x: 18, y: 7, facing: "down", look: "man", text: [{ en: "The Arena leader went traveling. I'm waiting right here until they come back!", pt: "O líder da Arena foi viajar. Vou esperar aqui até voltar!" }] },

  // Interiors
  { id: "mom", map: "home", x: 2, y: 4, facing: "right", look: "mom", script: "mom" },
  { id: "sister", map: "rivalhouse", x: 2, y: 4, facing: "right", look: "sister", script: "sister" },
  { id: "prof", map: "lab", x: 6, y: 2, facing: "down", look: "prof", script: "prof", visible: (f) => !!f.profInLab },
  { id: "labRival", map: "lab", x: 9, y: 4, facing: "left", look: "rival", script: "labRival", visible: (f) => !!f.rivalInLab },
  { id: "aide1", map: "lab", x: 2, y: 7, facing: "right", look: "aide", text: [{ en: "I study how creatures evolve. Starter creatures change form at level 12!", pt: "Eu estudo a evolução das criaturas. As iniciais mudam de forma no nível 12!" }] },
  { id: "aide2", map: "lab", x: 9, y: 7, facing: "left", look: "aide", text: [{ en: "Lower a wild creature's HP before throwing an Amulet. Sleep or paralysis helps too!", pt: "Diminua os PV de uma criatura selvagem antes de jogar um Amuleto. Sono ou paralisia também ajudam!" }] },
  { id: "nurse1", map: "center1", x: 5, y: 1, facing: "down", look: "nurse", script: "nurse" },
  { id: "visitor1", map: "center1", x: 8, y: 5, facing: "left", look: "boy", text: [{ en: "Healing is free here! Come back whenever your team is tired.", pt: "Aqui a cura é de graça! Volte sempre que sua equipe estiver cansada." }] },
  { id: "clerk1", map: "mart1", x: 2, y: 1, facing: "down", look: "clerk", script: "clerkTown" },
  { id: "shopper1", map: "mart1", x: 7, y: 5, facing: "up", look: "girl", text: [{ en: "Amulets are cheap. I always buy a bunch before heading out!", pt: "Amuletos são baratos. Sempre compro vários antes de sair!" }] },
  { id: "nurse2", map: "center2", x: 5, y: 1, facing: "down", look: "nurse", script: "nurse" },
  { id: "visitor2", map: "center2", x: 5, y: 4, facing: "right", look: "oldman", text: [{ en: "Evolution is a wonder of nature. Some trainers cancel it by pressing B... why?", pt: "A evolução é uma maravilha. Alguns treinadores cancelam apertando B... por quê?" }] },
  { id: "clerk2", map: "mart2", x: 2, y: 1, facing: "down", look: "clerk", script: "clerkCity" },
  { id: "shopper2", map: "mart2", x: 8, y: 5, facing: "left", look: "man", text: [{ en: "Great Amulets catch creatures more easily than regular ones. Worth it!", pt: "Super Amuletos capturam mais fácil que os normais. Valem a pena!" }] },
];

// ---------- Signs & ground items ----------
export interface Sign {
  map: MapId;
  x: number;
  y: number;
  text: L;
}

export const SIGNS: Sign[] = [
  { map: "overworld", x: 14, y: 59, text: { en: "VILA PEQUI\nA small town with a big heart.", pt: "VILA PEQUI\nUma cidadezinha de coração grande." } },
  { map: "overworld", x: 17, y: 72, text: { en: "PROFESSOR JATOBÁ'S CREATURE LAB", pt: "LABORATÓRIO DE CRIATURAS DO PROFESSOR JATOBÁ" } },
  { map: "overworld", x: 13, y: 53, text: { en: "ROUTE 1\nVila Pequi ↑ Cidade Ipê", pt: "ROTA 1\nVila Pequi ↑ Cidade Ipê" } },
  { map: "overworld", x: 18, y: 30, text: { en: "TRAINER TIPS\nWild creatures hide in tall grass. Weaken them before throwing an Amulet!", pt: "DICAS DE TREINADOR\nCriaturas selvagens se escondem no mato alto. Enfraqueça antes de jogar um Amuleto!" } },
  { map: "overworld", x: 13, y: 15, text: { en: "CIDADE IPÊ\nWhere the ipê trees bloom purple.", pt: "CIDADE IPÊ\nOnde os ipês florescem roxos." } },
  { map: "overworld", x: 13, y: 7, text: { en: "CIDADE IPÊ ARENA\nLeader: away on a journey.", pt: "ARENA DE CIDADE IPÊ\nLíder: em viagem." } },
  { map: "overworld", x: 8, y: 62, text: { en: "{player}'s house", pt: "Casa de {player}" } },
  { map: "overworld", x: 29, y: 61, text: { en: "{rival}'s house", pt: "Casa de {rival}" } },
];

export interface GroundItem {
  id: string;
  map: MapId;
  x: number;
  y: number;
  item: ItemId;
  qty: number;
}

export const GROUND_ITEMS: GroundItem[] = [
  { id: "gi1", map: "overworld", x: 4, y: 29, item: "pocao", qty: 1 },
  { id: "gi2", map: "overworld", x: 26, y: 40, item: "amuleto", qty: 2 },
  { id: "gi3", map: "overworld", x: 28, y: 14, item: "superamuleto", qty: 1 },
  { id: "gi4", map: "overworld", x: 24, y: 23, item: "antidoto", qty: 1 },
  { id: "gi5", map: "overworld", x: 2, y: 73, item: "pocao", qty: 1 },
];

// ---------- Wild encounters ----------
export interface EncounterSlot {
  species: SpeciesId;
  min: number;
  max: number;
  weight: number;
}

export function encounterTable(y: number): EncounterSlot[] {
  if (y < 34)
    return [
      { species: "pardalito", min: 4, max: 6, weight: 25 },
      { species: "ratico", min: 4, max: 6, weight: 22 },
      { species: "lagartix", min: 4, max: 6, weight: 15 },
      { species: "pedrudo", min: 5, max: 7, weight: 15 },
      { species: "corujita", min: 5, max: 7, weight: 15 },
      { species: "chispito", min: 5, max: 7, weight: 8 },
    ];
  return [
    { species: "pardalito", min: 2, max: 4, weight: 38 },
    { species: "ratico", min: 2, max: 4, weight: 38 },
    { species: "lagartix", min: 3, max: 4, weight: 17 },
    { species: "chispito", min: 3, max: 5, weight: 7 },
  ];
}

// ---------- Tile queries ----------
export function tileAt(map: MapId, x: number, y: number): string {
  if (map === "overworld") {
    if (x < 0 || y < 0 || x >= OW_W || y >= OW_H) return "T";
    return OVERWORLD[y][x];
  }
  const rows = INTERIORS[map].rows;
  if (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length) return "#";
  return rows[y][x];
}

const OW_WALK = new Set([".", ",", '"', "f", "s", "="]);
const IN_WALK = new Set([".", "d", "r"]);

export function isWalkableTile(map: MapId, x: number, y: number): boolean {
  const t = tileAt(map, x, y);
  return map === "overworld" ? OW_WALK.has(t) : IN_WALK.has(t);
}
