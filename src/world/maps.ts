// All map data. Tile (x, y): x grows east, y grows south. In 3D a tile sits at (x, 0, y),
// so north is -z and the camera looks north from the south, like the handhelds.
// Routes 2-4 and Serra do Cipó were added north of Cidade Ipê at negative y, so older coordinates (and saves) stay valid.
//
// Overworld tile chars:
//   .  short grass       ,  dirt path       "  tall grass (encounters)   f  flowers
//   s  plaza stone       =  bridge          ~  water                     T  tree
//   L  ledge (hop south) r  boulder         O  fountain                  F  fence
//   k  cliff face        w  waterfall
//   Building footprints use one letter per building (door = bottom row, middle column);
//   the Gruta da Lapinha's two cave mouths are too (V south, U north).

import type { Dir, MapId } from "../game/store";
import type { SpeciesId } from "../data/species";
import type { ItemId } from "../data/items";
import type { MoveId } from "../data/moves";
import type { L } from "../data/types";

export const OW_W = 32;
/** Northmost overworld row (inclusive); rows run from OW_Y0 to OW_H - 1. */
export const OW_Y0 = -125;
export const OW_H = 76;

function buildOverworld(): string[][] {
  const g: string[][] = Array.from({ length: OW_H - OW_Y0 }, () => Array(OW_W).fill("."));
  const fill = (x0: number, y0: number, x1: number, y1: number, ch: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y - OW_Y0][x] = ch;
  };
  const put = (pts: [number, number][], ch: string) => pts.forEach(([x, y]) => (g[y - OW_Y0][x] = ch));

  // Side borders
  fill(0, OW_Y0, 1, OW_H - 1, "T");
  fill(OW_W - 2, OW_Y0, OW_W - 1, OW_H - 1, "T");

  // ---------- SERRA DO CIPÓ (y -125..-93) ----------
  // A town on the river below the waterfall. North of it, the half-built Ponte do Cipó.
  fill(0, -125, OW_W - 1, -124, "T");
  fill(2, -123, 29, -122, "~");
  put([[15, -122]], "=");
  fill(2, -121, 14, -121, "T");
  fill(16, -121, 29, -121, "T");
  put([[15, -121]], ",");
  fill(2, -120, 13, -119, "T");
  fill(18, -120, 29, -119, "T");
  fill(15, -120, 16, -93, ",");
  put([[14, -120], [17, -119]], "f");
  // The waterfall pours off the cliff into a pool, and the river runs south along the west edge.
  fill(2, -118, 9, -113, "k");
  fill(5, -118, 6, -113, "w");
  fill(2, -112, 9, -107, "~");
  fill(2, -106, 4, -93, "~");
  put([[10, -118], [11, -117], [13, -118], [17, -118], [28, -118], [29, -117], [24, -118]], "T");
  fill(10, -115, 13, -113, "h");
  fill(18, -116, 24, -112, "A"); // Marina's arena
  fill(26, -116, 29, -114, "h");
  fill(10, -111, 29, -111, ",");
  put([[12, -112], [28, -113], [28, -112]], ",");
  put([[10, -108], [10, -105], [5, -104], [6, -102], [8, -106]], "f");
  fill(12, -108, 19, -103, "s");
  fill(15, -106, 16, -105, "O");
  fill(21, -107, 24, -104, "h");
  fill(23, -103, 23, -98, ",");
  fill(6, -101, 10, -98, "J"); // healing center
  fill(24, -101, 27, -98, "Y"); // shop
  fill(5, -97, 27, -97, ",");
  put([[12, -101], [19, -101], [28, -103], [29, -99], [13, -94], [18, -94], [6, -94], [26, -94], [29, -108], [25, -109]], "f");
  put([[5, -95], [9, -94], [11, -99], [20, -95], [24, -94], [28, -95], [29, -105], [18, -99]], "T");
  fill(0, -92, OW_W - 1, -92, "T");
  fill(15, -92, 16, -92, ",");

  // ---------- ROUTE 4 (y -91..-73) ----------
  // The Lapinha's north exit opens onto a hillside; the road loops east and north to the town.
  fill(15, -91, 16, -86, ",");
  fill(3, -91, 12, -87, '"');
  fill(19, -91, 28, -87, '"');
  fill(2, -86, 12, -86, "L");
  fill(18, -86, 29, -86, "L");
  fill(15, -85, 26, -84, ",");
  fill(25, -83, 26, -76, ",");
  fill(6, -76, 24, -75, ",");
  fill(3, -80, 8, -77, "U"); // the Lapinha's north mouth
  fill(2, -84, 9, -81, "T");
  fill(10, -83, 22, -78, '"');
  put([[13, -91], [14, -88], [17, -90], [17, -87], [2, -91], [29, -91], [28, -84]], "T");
  put([[2, -76], [2, -73], [9, -73], [12, -74], [20, -73], [23, -80], [28, -79], [29, -75], [27, -82], [10, -84]], "T");
  put([[14, -85], [27, -77], [11, -77], [18, -74], [4, -74]], "r");
  put([[3, -75], [8, -74], [16, -73], [24, -74], [28, -81], [13, -84], [3, -85]], "f");

  // ---------- ROUTE 3 (y -72..-37, north of Route 2) ----------
  // Cerrado hills climbing to the Gruta da Lapinha, with a Healing Center at the cave mouth.
  fill(0, -72, OW_W - 1, -72, "T");
  // Southern fields: the road runs straight up from Route 2.
  fill(15, -46, 16, -37, ",");
  fill(3, -44, 12, -39, '"');
  fill(19, -45, 28, -40, '"');
  put([[3, -38], [8, -38], [12, -37], [19, -38], [23, -37], [28, -38], [7, -45], [11, -45], [23, -46], [4, -46], [27, -46]], "T");
  put([[13, -44], [18, -41], [20, -46], [9, -46], [13, -39]], "r");
  put([[5, -38], [10, -37], [21, -38], [26, -38], [18, -44]], "f");
  fill(2, -47, 13, -47, "L");
  fill(18, -47, 29, -47, "L");
  fill(14, -47, 17, -47, ",");
  // Middle: the road swings west around a big patch of grass.
  fill(7, -49, 16, -48, ",");
  fill(7, -56, 8, -50, ",");
  fill(11, -56, 27, -50, '"');
  fill(2, -56, 4, -49, "T");
  put([[10, -50], [10, -54], [28, -52], [18, -48], [22, -49], [27, -48], [9, -57], [5, -52]], "r");
  put([[5, -50], [6, -55], [20, -48], [25, -49], [13, -48]], "f");
  put([[11, -57], [14, -57], [21, -57], [26, -57], [29, -55], [29, -50]], "T");
  // Upper fields: back to the middle of the valley.
  fill(7, -58, 16, -57, ",");
  fill(15, -64, 16, -59, ",");
  fill(3, -63, 12, -60, '"');
  fill(19, -63, 26, -59, '"');
  put([[3, -59], [6, -58], [12, -59], [27, -60], [28, -63], [18, -58], [13, -63]], "T");
  put([[2, -64], [4, -58], [17, -62], [27, -58], [21, -64]], "r");
  put([[8, -59], [18, -60], [24, -58], [5, -64]], "f");
  // The cave mouth in the hillside, and the Healing Center beside it.
  fill(4, -69, 8, -66, "Q");
  fill(12, -71, 19, -67, "V");
  fill(6, -65, 16, -65, ",");
  fill(15, -66, 16, -66, ",");
  fill(2, -71, 11, -70, "T");
  fill(20, -71, 29, -70, "T");
  put([[2, -69], [2, -66], [10, -68], [11, -66], [20, -68], [21, -66], [25, -67], [28, -65]], "r");
  put([[9, -66], [22, -69], [29, -68], [26, -64], [3, -65]], "T");
  put([[10, -69], [23, -66], [27, -69], [9, -64]], "f");

  // ---------- ROUTE 2 (y -36..-1, north of Cidade Ipê) ----------
  fill(0, -36, OW_W - 1, -35, "T");
  fill(15, -36, 15, -35, ",");
  // Leaving the city: the road runs north from the Arena side, then bends west.
  fill(27, -6, 27, -1, ",");
  fill(20, -6, 25, -2, '"');
  put([[23, -1], [29, -3], [18, -2], [18, -5], [28, -7], [29, -6]], "T");
  fill(15, -7, 27, -7, ",");
  fill(3, -6, 12, -3, "T");
  put([[5, -2], [9, -1], [13, -3], [3, -1], [11, -6]], "f");
  // Middle stretch with grass on both sides.
  fill(15, -14, 16, -8, ",");
  fill(3, -14, 12, -9, '"');
  fill(19, -14, 28, -10, '"');
  put([[13, -8], [8, -8], [4, -8], [18, -9], [22, -9], [27, -9], [13, -12], [7, -11]], "T");
  put([[19, -8], [24, -8], [12, -8]], "f");
  fill(2, -15, 13, -15, "L");
  fill(18, -15, 29, -15, "L");
  fill(14, -15, 17, -15, ",");
  // Pond and boulders.
  fill(15, -24, 16, -16, ",");
  fill(3, -22, 9, -18, "~");
  put([[11, -17], [12, -20], [10, -23], [19, -16], [24, -17], [28, -22]], "r");
  fill(19, -24, 28, -18, '"');
  put([[2, -17], [2, -23], [13, -24], [18, -24], [23, -21], [26, -24]], "T");
  put([[4, -16], [7, -16], [10, -16], [3, -24], [6, -24], [9, -24]], "f");
  // Northern fields.
  fill(15, -32, 16, -25, ",");
  fill(3, -31, 13, -26, '"');
  fill(18, -32, 28, -26, '"');
  put([[8, -25], [12, -25], [20, -25], [25, -25], [3, -32], [7, -33], [11, -32], [24, -33], [28, -33], [17, -28]], "T");
  fill(15, -34, 15, -33, ",");
  fill(16, -34, 16, -33, "T");
  put([[13, -33], [18, -33], [20, -34], [10, -34]], "f");

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

/** Overworld tile at map coordinates (trees outside the map). */
export function owTile(x: number, y: number): string {
  if (x < 0 || x >= OW_W || y < OW_Y0 || y >= OW_H) return "T";
  return OVERWORLD[y - OW_Y0][x];
}

// ---------- Buildings ----------
export type BuildingKind = "home" | "rivalhouse" | "lab" | "center" | "mart" | "church" | "arena" | "waterarena" | "house" | "cave";
export interface Building {
  letter: string;
  kind: BuildingKind;
  x: number;
  y: number;
  w: number;
  h: number;
  door: [number, number];
  interior?: MapId;
  /** Where you arrive inside, when it isn't the interior's door mat (the Lapinha's north mouth). */
  entry?: [number, number, Dir];
  color: string;
  roof: string;
}

const B_INFO: Record<string, { kind: BuildingKind; interior?: MapId; entry?: [number, number, Dir]; color: string; roof: string }> = {
  H: { kind: "home", interior: "home", color: "#f4e3c1", roof: "#c8553d" },
  R: { kind: "rivalhouse", interior: "rivalhouse", color: "#cfe3f0", roof: "#3f6fb0" },
  P: { kind: "lab", interior: "lab", color: "#eeeeea", roof: "#6e7f8e" },
  C: { kind: "center", interior: "center1", color: "#fbf6ef", roof: "#e0463c" },
  M: { kind: "mart", interior: "mart1", color: "#fbf6ef", roof: "#3a7bd5" },
  E: { kind: "center", interior: "center2", color: "#fbf6ef", roof: "#e0463c" },
  N: { kind: "mart", interior: "mart2", color: "#fbf6ef", roof: "#3a7bd5" },
  K: { kind: "church", color: "#fdfaf2", roof: "#b5542f" },
  G: { kind: "arena", interior: "arena1", color: "#8d8478", roof: "#f0a030" },
  Q: { kind: "center", interior: "center3", color: "#fbf6ef", roof: "#e0463c" },
  V: { kind: "cave", interior: "lapinha1", color: "#b3a58c", roof: "#8a7d68" },
  U: { kind: "cave", interior: "lapinha2", entry: [14, 1, "down"], color: "#b3a58c", roof: "#8a7d68" },
  J: { kind: "center", interior: "center4", color: "#fbf6ef", roof: "#e0463c" },
  Y: { kind: "mart", interior: "mart3", color: "#fbf6ef", roof: "#3a7bd5" },
  A: { kind: "waterarena", interior: "arena2", color: "#e6f3f7", roof: "#7cc4f0" },
  h: { kind: "house", color: "#f7c873", roof: "#b8472e" },
};
const HOUSE_COLORS = ["#f7c873", "#9fd3c7", "#f2a6a0", "#c3b1e1"];

function findBuildings(): Building[] {
  const seen = new Set<string>();
  const out: Building[] = [];
  for (let y = OW_Y0; y < OW_H; y++)
    for (let x = 0; x < OW_W; x++) {
      const ch = owTile(x, y);
      const info = B_INFO[ch];
      if (!info || seen.has(`${x},${y}`)) continue;
      let x1 = x;
      while (x1 + 1 < OW_W && owTile(x1 + 1, y) === ch) x1++;
      let y1 = y;
      while (y1 + 1 < OW_H && owTile(x, y1 + 1) === ch) y1++;
      for (let yy = y; yy <= y1; yy++) for (let xx = x; xx <= x1; xx++) seen.add(`${xx},${yy}`);
      const w = x1 - x + 1;
      const h = y1 - y + 1;
      // Colour by position, so adding buildings elsewhere never repaints the old ones.
      const color = info.kind === "house" ? HOUSE_COLORS[(((x + 2 * y) % 4) + 4) % 4] : info.color;
      out.push({ letter: ch, ...info, color, x, y, w, h, door: [x + Math.floor(w / 2), y1] });
    }
  return out;
}

export const BUILDINGS = findBuildings();

// ---------- Interiors ----------
// Interior chars: # wall  . floor  d exit mat  b bookshelf  v TV  s stairs  t table  B bed
//   f plant  r rug  c counter  h healing machine  p PC  m lab machine  a starter table
//   x shop shelf  k bench  o arena boulder
// Cave chars (maps with cave: true): # rock  . floor (wild encounters)  d exit mat  o boulder
//   * crystals  H hole down  U ladder up  X rockfall  Z fossil  D way out to the north mouth
// Pool chars (maps with pool: true): # wall  . deck  d exit mat  w water  n stepping stone
//   ^ v < > currents that carry you along until you reach still ground
export interface Interior {
  rows: string[];
  floor: string;
  wall: string;
  music: string;
  cave?: boolean;
  pool?: boolean;
}

const HOME_ROWS = ["##########", "#bbv...ss#", "#........#", "#..tt..B.#", "#..tt..B.#", "#........#", "#f..rr..f#", "####d#####"];
const CENTER_ROWS = ["############", "#f.h......p#", "#.cccccccc.#", "#..........#", "#.kk....kk.#", "#..........#", "#f........f#", "#####d######"];
const MART_ROWS = ["##########", "#...b.xxx#", "#ccc.....#", "#.....xx.#", "#.xx..xx.#", "#.xx.....#", "#f.......#", "####d#####"];
const ARENA_ROWS = ["###########", "#o.......o#", "#.........#", "#oo.ooo.oo#", "#.........#", "#..o...o..#", "#.........#", "#o.......o#", "#.........#", "#####d#####"];
const LAB_ROWS = ["############", "#mm.bbbb.mm#", "#..........#", "#....aaa...#", "#..........#", "#tt......tt#", "#tt......tt#", "#..........#", "#bb......bb#", "#####d######"];

// Gruta da Lapinha (Mt. Moon): 1F from Route 3, B1F in two halves, B2F with the fossils.
// The exit chamber of B1F is only reachable from B2F.
const LAPINHA_1F = [
  "######################",
  "#..o.....##.....**...#",
  "#.......###......H...#",
  "#..###.......##......#",
  "#..###..o....##..o...#",
  "#........#.......###.#",
  "##..**...#...........#",
  "#........####..o.....#",
  "#..o..........####...#",
  "#....###.............#",
  "#....###....o....o...#",
  "#.............###....#",
  "#..**.....#..........#",
  "#.........#...o......#",
  "#....................#",
  "##########d###########",
];
const LAPINHA_B1F = [
  "##############D#####",
  "#........#.........#",
  "#..U.....#....o....#",
  "#........#.........#",
  "#...o....#..H......#",
  "#........#......**.#",
  "#####..###.........#",
  "#........###########",
  "#..**..............#",
  "#.............o....#",
  "#....o.............#",
  "#..........##...H..#",
  "#..........##......#",
  "####################",
];
// The north exit on B1F (D) opens onto Route 4 through the U cave mouth.
const LAPINHA_B2F = [
  "########################",
  "#.....#......#.........#",
  "#.Z.Z.#..o...#....U....#",
  "#.....#......#.........#",
  "#.....#..........o.....#",
  "#..........###.........#",
  "####.####..###..####.###",
  "#......................#",
  "#..o.....**.......o....#",
  "#......###.............#",
  "#......###....####.....#",
  "#.U...........####..o..#",
  "#......................#",
  "#...**.......o.........#",
  "#......................#",
  "########################",
];

// Arena da Serra do Cipó: three bands of pools between decks. Stepping stones cross them, and
// the currents either help you along or wash you back to the deck below.
const CIPO_ARENA = [
  "#############",
  "#ww.......ww#",
  "#w.........w#",
  "#wvwwww^<<<w#",
  "#wnv<<<wwwnw#",
  "#...........#",
  "#wwww^wv<<<w#",
  "#wn>>^wvwwnw#",
  "#wnwwwwvwwnw#",
  "#...........#",
  "#>>>vwwnwwvw#",
  "#nwwvnnnwwvw#",
  "#nwwvnwwwwnw#",
  "#...........#",
  "#...........#",
  "######d######",
];

export const INTERIORS: Record<Exclude<MapId, "overworld">, Interior> = {
  home: { rows: HOME_ROWS, floor: "#d9b98a", wall: "#f3e6cf", music: "town" },
  rivalhouse: { rows: HOME_ROWS, floor: "#c9d7b0", wall: "#e5eef5", music: "town" },
  lab: { rows: LAB_ROWS, floor: "#e2e0d8", wall: "#f5f5f0", music: "lab" },
  center1: { rows: CENTER_ROWS, floor: "#f5e9e0", wall: "#fdf7f2", music: "lab" },
  center2: { rows: CENTER_ROWS, floor: "#f5e9e0", wall: "#fdf7f2", music: "lab" },
  mart1: { rows: MART_ROWS, floor: "#dfe8f2", wall: "#f5f8fb", music: "lab" },
  mart2: { rows: MART_ROWS, floor: "#dfe8f2", wall: "#f5f8fb", music: "lab" },
  arena1: { rows: ARENA_ROWS, floor: "#8a7a66", wall: "#5e554b", music: "town" },
  center3: { rows: CENTER_ROWS, floor: "#f5e9e0", wall: "#fdf7f2", music: "lab" },
  lapinha1: { rows: LAPINHA_1F, floor: "#6e6253", wall: "#5a4f43", music: "cave", cave: true },
  lapinha2: { rows: LAPINHA_B1F, floor: "#5f5548", wall: "#4b4238", music: "cave", cave: true },
  lapinha3: { rows: LAPINHA_B2F, floor: "#554b40", wall: "#40382f", music: "cave", cave: true },
  center4: { rows: CENTER_ROWS, floor: "#f5e9e0", wall: "#fdf7f2", music: "lab" },
  mart3: { rows: MART_ROWS, floor: "#dfe8f2", wall: "#f5f8fb", music: "lab" },
  arena2: { rows: CIPO_ARENA, floor: "#d8e8ee", wall: "#b8dcea", music: "town", pool: true },
};

export const isCave = (map: MapId) => map !== "overworld" && !!INTERIORS[map].cave;
export const isPool = (map: MapId) => map !== "overworld" && !!INTERIORS[map].pool;

const CURRENTS: Record<string, Dir> = { "^": "up", v: "down", "<": "left", ">": "right" };
/** The way a current tile carries you, or null on still ground. */
export function currentAt(map: MapId, x: number, y: number): Dir | null {
  return isPool(map) ? CURRENTS[tileAt(map, x, y)] ?? null : null;
}

/** Ladders and holes, linked in pairs. You arrive standing on the other end. */
const CAVE_LINKS: [MapId, number, number, MapId, number, number][] = [
  ["lapinha1", 17, 2, "lapinha2", 3, 2],
  ["lapinha2", 16, 11, "lapinha3", 2, 11],
  ["lapinha3", 18, 2, "lapinha2", 12, 4],
];

export function caveLink(map: MapId, x: number, y: number): { map: MapId; x: number; y: number } | null {
  for (const [m1, x1, y1, m2, x2, y2] of CAVE_LINKS) {
    if (m1 === map && x1 === x && y1 === y) return { map: m2, x: x2, y: y2 };
    if (m2 === map && x2 === x && y2 === y) return { map: m1, x: x1, y: y1 };
  }
  return null;
}

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
  | "oldwoman" | "worker" | "youngster" | "lass" | "aide" | "sister" | "man" | "miner" | "leader"
  | "bugcatcher" | "grunt" | "scientist" | "swimmer" | "fisherman" | "marina" | "picnicker";

/** A trainer's creature: species and level, optionally with a hand-picked moveset or strong IVs. */
export type TeamSlot = [SpeciesId, number] | [SpeciesId, number, { moves?: MoveId[]; perfect?: boolean }];

export interface TrainerDef {
  name: L;
  team: TeamSlot[];
  reward: number;
  intro: L;
  win: L; // shown in battle when you win
  after: L; // overworld chat after defeat
  sight: number;
  music?: string;
  /** Arena leaders hand over a badge (stored as this flag) when beaten. */
  badge?: string;
  /** ...and an MT. */
  mt?: ItemId;
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
  { id: "worker", map: "overworld", x: 27, y: 2, facing: "down", look: "worker", visible: (f) => !f.badgeTopaz, text: [{ en: "Route 2 is rough going. The Arena Leader asked me to let only badge holders through.", pt: "A Rota 2 é puxada. O Líder da Arena pediu para eu só deixar passar quem tem insígnia." }] },
  {
    id: "bia", map: "overworld", x: 12, y: 13, facing: "right", look: "lass",
    trainer: {
      name: { en: "Ace Trainer Bia", pt: "Treinadora Bia" },
      team: [["lagartix", 9], ["chispito", 9], ["borbolux", 11]],
      reward: 900,
      intro: { en: "Nobody passes through Ipê Plaza without facing me! Show me what you've got!", pt: "Ninguém passa pela Praça Ipê sem me enfrentar! Mostre o que sabe!" },
      win: { en: "Wow... You and your creatures are really in sync.", pt: "Uau... Você e suas criaturas estão mesmo em sintonia." },
      after: { en: "Leader Topázio is back at the Arena. With a team like yours, you'll do great!", pt: "O Líder Topázio voltou para a Arena. Com uma equipe dessas, você vai longe!" },
      sight: 4,
      music: "trainer",
    },
  },
  { id: "villageKid", map: "overworld", x: 20, y: 9, facing: "down", look: "boy", lookAround: true, text: [{ en: "At night, Borbolux light up Route 1 like floating lanterns. So pretty!", pt: "À noite, os Borbolux iluminam a Rota 1 como lanternas. Que lindo!" }] },
  { id: "villageGran", map: "overworld", x: 8, y: 9, facing: "down", look: "oldwoman", text: [{ en: "Rasgamorte? Oh, that owl scared me silly as a girl. But it's gentle as a lamb.", pt: "Rasgamorte? Ah, essa coruja me assustava quando eu era menina. Mas é mansinha." }] },
  { id: "arenaFan", map: "overworld", x: 18, y: 7, facing: "down", look: "man", text: [{ en: "Leader Topázio uses Rock creatures, hard as the gems in these hills. Water and Grass crack them!", pt: "O Líder Topázio usa criaturas de Pedra, duras como as gemas destes morros. Água e Planta racham elas!" }] },

  // Route 2
  {
    id: "clara", map: "overworld", x: 18, y: -11, facing: "left", look: "lass",
    trainer: {
      name: { en: "Lass Clara", pt: "Moça Clara" },
      team: [["borbolux", 12], ["chispito", 12]],
      reward: 360,
      intro: { en: "You got past the worker? Then you must have a badge. Show me!", pt: "Passou pelo operário? Então tem insígnia. Mostre!" },
      win: { en: "So that's what a badge holder can do...", pt: "Então é disso que quem tem insígnia é capaz..." },
      after: { en: "Borbolux glow brighter the further north you go. Nobody knows why.", pt: "Os Borbolux brilham mais quanto mais ao norte. Ninguém sabe por quê." },
      sight: 3,
    },
  },
  {
    id: "dito", map: "overworld", x: 14, y: -21, facing: "right", look: "miner",
    trainer: {
      name: { en: "Prospector Dito", pt: "Garimpeiro Dito" },
      team: [["pedrudo", 12], ["rochedao", 14]],
      reward: 480,
      intro: { en: "I dig for topaz in these hills. Found this pair under a rock!", pt: "Garimpo topázio nestes morros. Achei essa dupla debaixo de uma pedra!" },
      win: { en: "Not a single gem in you, just grit!", pt: "Nenhuma gema, só garra!" },
      after: { en: "Pedrudo nap under boulders. Check near the pond!", pt: "Os Pedrudos cochilam debaixo das pedras. Procure perto do lago!" },
      sight: 2,
    },
  },
  {
    id: "tuca", map: "overworld", x: 17, y: -29, facing: "left", look: "youngster",
    trainer: {
      name: { en: "Youngster Tuca", pt: "Garoto Tuca" },
      team: [["ratico", 13], ["pardalito", 13], ["corujita", 14]],
      reward: 420,
      intro: { en: "I've been training up here for weeks. Your turn!", pt: "Treino aqui em cima há semanas. Sua vez!" },
      win: { en: "Weeks of training... gone in minutes!", pt: "Semanas de treino... foram em minutos!" },
      after: { en: "Zé from Route 1 is my cousin. Did you beat him too?", pt: "O Zé da Rota 1 é meu primo. Você ganhou dele também?" },
      sight: 3,
    },
  },
  { id: "pondMan", map: "overworld", x: 10, y: -18, facing: "left", look: "oldman", text: [{ en: "This pond never dries, even in August. The old folks say Iara keeps it full.", pt: "Este lago nunca seca, nem em agosto. Os antigos dizem que é a Iara que enche." }] },

  // Route 3
  {
    id: "nando", map: "overworld", x: 13, y: -42, facing: "right", look: "youngster",
    trainer: {
      name: { en: "Youngster Nando", pt: "Garoto Nando" },
      team: [["pardalito", 12], ["ratico", 13]],
      reward: 390,
      intro: { en: "Hey! Did you just come up from Route 2? Then you owe me a battle!", pt: "Ei! Você acabou de subir da Rota 2? Então me deve uma batalha!" },
      win: { en: "I should've stayed on Route 2...", pt: "Eu devia ter ficado na Rota 2..." },
      after: { en: "Bats fly out of the Gruta da Lapinha at dusk. There's a whole cloud of them!", pt: "Os morcegos saem da Gruta da Lapinha no fim da tarde. É uma nuvem inteira!" },
      sight: 4,
    },
  },
  {
    id: "juca", map: "overworld", x: 20, y: -53, facing: "left", look: "bugcatcher",
    trainer: {
      name: { en: "Bug Catcher Juca", pt: "Caçador de Insetos Juca" },
      team: [["lagartix", 12], ["lagartix", 12], ["borbolux", 13]],
      reward: 260,
      intro: { en: "Shh! I'm hunting Borbolux! ...Oh, you scared them all off. Battle!", pt: "Psiu! Estou caçando Borbolux! ...Ah, você espantou todos. Batalha!" },
      win: { en: "My net's too small for a trainer like you.", pt: "Minha rede é pequena demais para você." },
      after: { en: "Lagartix evolve fast. Level 10 and they're already flying!", pt: "Os Lagartix evoluem rápido. No nível 10 já estão voando!" },
      sight: 3,
    },
  },
  {
    id: "lia", map: "overworld", x: 17, y: -60, facing: "left", look: "lass",
    trainer: {
      name: { en: "Lass Lia", pt: "Moça Lia" },
      team: [["chispito", 13], ["corujita", 14]],
      reward: 420,
      intro: { en: "You're going into the cave? Let me warm you up first!", pt: "Vai entrar na gruta? Deixa eu te aquecer primeiro!" },
      win: { en: "OK, you're warmed up. Very warmed up.", pt: "Tá, você está aquecido. Bem aquecido." },
      after: { en: "Heal up at the Healing Center before you go in. The cave is long!", pt: "Cure sua equipe no Centro de Cura antes de entrar. A gruta é longa!" },
      sight: 3,
    },
  },
  { id: "caveGuide", map: "overworld", x: 18, y: -65, facing: "down", look: "oldman", lookAround: true, text: [
    { en: "Almost two hundred years ago, a Danish naturalist called Lund dug giant sloth bones out of these caves.", pt: "Quase duzentos anos atrás, um naturalista dinamarquês chamado Lund tirou ossos de preguiça-gigante destas grutas." },
    { en: "Lately, men in dark bandanas go in and come out with sacks. They're no scientists, I tell you.", pt: "Ultimamente, uns homens de bandana escura entram e saem com sacos. Cientistas é que não são, isso eu garanto." },
  ] },

  // Route 4
  {
    id: "nina", map: "overworld", x: 20, y: -81, facing: "left", look: "picnicker",
    trainer: {
      name: { en: "Picnicker Nina", pt: "Campista Nina" },
      team: [["canelinha", 14], ["jararaca", 15]],
      reward: 450,
      intro: { en: "Careful where you step! Canelinha grow all over this hillside.", pt: "Cuidado onde pisa! Tem Canelinha nascendo por todo este morro." },
      win: { en: "You trampled my whole picnic!", pt: "Você pisoteou meu piquenique inteiro!" },
      after: { en: "Canela-de-ema only grows up here in the serras. Some of them are hundreds of years old!", pt: "Canela-de-ema só nasce aqui nas serras. Tem umas com centenas de anos!" },
      sight: 3,
    },
  },
  {
    id: "grunt4", map: "overworld", x: 24, y: -88, facing: "left", look: "grunt",
    trainer: {
      name: { en: "Garimpo Grunt", pt: "Capanga do Garimpo" },
      team: [["jararaca", 15], ["morceguinho", 16]],
      reward: 480,
      intro: { en: "You again? The kid from the cave? The boss said to slow down anybody who followed us!", pt: "Você de novo? O pirralho da gruta? O chefe mandou atrasar quem seguisse a gente!" },
      win: { en: "Slowed down... me.", pt: "Quem atrasou fui eu..." },
      after: { en: "The rest of the crew went north, over the river. Something about an old man with a fancy collection.", pt: "O resto da turma foi para o norte, depois do rio. Algo sobre um velho com uma coleção chique." },
      sight: 4,
    },
  },
  { id: "r4Hiker", map: "overworld", x: 12, y: -76, facing: "down", look: "miner", lookAround: true, text: [
    { en: "Phew, daylight! That tunnel used to be blocked, but the crew cleared it.", pt: "Ufa, luz do dia! Esse túnel estava bloqueado, mas a equipe liberou." },
    { en: "Serra do Cipó is just up the road. You can hear the waterfall from here!", pt: "A Serra do Cipó fica logo ali. Dá para ouvir a cachoeira daqui!" },
  ] },

  // Serra do Cipó
  { id: "fisher", map: "overworld", x: 10, y: -109, facing: "left", look: "fisherman", script: "fisherman" },
  { id: "cipoGirl", map: "overworld", x: 20, y: -109, facing: "down", look: "girl", lookAround: true, text: [{ en: "Marina's Arena is a big indoor pool. The currents in there will sweep you right off your feet!", pt: "A Arena da Marina é uma piscina coberta enorme. As correntezas lá dentro levam você embora!" }] },
  { id: "cipoOld", map: "overworld", x: 12, y: -102, facing: "right", look: "oldwoman", text: [{ en: "That's the Cachoeira da Farofa. Seventy meters of water falling off the serra, and it never stops.", pt: "Aquela é a Cachoeira da Farofa. Setenta metros de água caindo da serra, e nunca para." }] },
  { id: "cipoMan", map: "overworld", x: 19, y: -96, facing: "left", look: "man", text: [
    { en: "Some fishermen swear there's an eel in the river that shocks the hooks right off their lines. A Poraquê, they call it.", pt: "Tem pescador que jura que tem uma enguia no rio que dá choque e solta o anzol da linha. Poraquê, eles chamam." },
    { en: "Me, I've never seen one. Up north, maybe.", pt: "Eu mesmo nunca vi. Lá para o norte, quem sabe." },
  ] },
  { id: "cipoBoy", map: "overworld", x: 27, y: -109, facing: "down", look: "boy", text: [{ en: "Some men in dark bandanas ran across the bridge before it was even finished! They were carrying sacks.", pt: "Uns homens de bandana escura atravessaram a ponte antes mesmo de ela ficar pronta! Estavam carregando sacos." }] },
  { id: "rival2", map: "overworld", x: 15, y: -120, facing: "down", look: "rival", visible: (f) => !!f.rivalCipoShow },
  { id: "worker4", map: "overworld", x: 15, y: -121, facing: "down", look: "worker", text: [
    { en: "Hold it! The Ponte do Cipó isn't finished. We still have half the planks to lay.", pt: "Espere! A Ponte do Cipó não está pronta. Ainda falta metade das tábuas." },
    { en: "And some joker walked off with our tools! Come back later.", pt: "E algum engraçadinho sumiu com as nossas ferramentas! Volte mais tarde." },
  ] },

  // Cidade Ipê Arena
  {
    id: "arenaT1", map: "arena1", x: 9, y: 4, facing: "left", look: "miner",
    trainer: {
      name: { en: "Prospector Tião", pt: "Garimpeiro Tião" },
      team: [["pedrudo", 10], ["pedrudo", 11]],
      reward: 330,
      intro: { en: "You want Topázio? Dig through me first!", pt: "Quer o Topázio? Primeiro cave por mim!" },
      win: { en: "Crumbled like soft sandstone...", pt: "Esfarelei como arenito..." },
      after: { en: "Rock creatures shrug off Normal and Flying moves. Hit them with Water or Grass!", pt: "Criaturas de Pedra aguentam golpes Normais e Voadores. Use Água ou Planta!" },
      sight: 5,
    },
  },
  {
    id: "arenaT2", map: "arena1", x: 1, y: 6, facing: "right", look: "miner",
    trainer: {
      name: { en: "Prospector Rosa", pt: "Garimpeira Rosa" },
      team: [["corujita", 11], ["pedrudo", 11]],
      reward: 330,
      intro: { en: "The Leader taught me everything. Let me show you!", pt: "O Líder me ensinou tudo. Deixa eu mostrar!" },
      win: { en: "You're the real gem here.", pt: "A joia aqui é você." },
      after: { en: "Topázio's Rochedão hits like a landslide. Be ready!", pt: "O Rochedão do Topázio bate como um desmoronamento. Esteja pronto!" },
      sight: 4,
    },
  },
  {
    id: "leader1", map: "arena1", x: 5, y: 1, facing: "down", look: "leader",
    trainer: {
      name: { en: "Leader Topázio", pt: "Líder Topázio" },
      team: [["pedrudo", 12], ["rochedao", 14]],
      reward: 1400,
      intro: { en: "Welcome to the Cidade Ipê Arena! I'm Topázio. My creatures are as hard as the stones of Minas. Let's see if you can crack them!", pt: "Bem-vindo à Arena de Cidade Ipê! Sou o Topázio. Minhas criaturas são duras como as pedras de Minas. Vamos ver se você consegue rachá-las!" },
      win: { en: "Incredible! You cut right through my defenses!", pt: "Incrível! Você atravessou minha defesa!" },
      after: { en: "Route 2 is open for you now. Keep polishing that team!", pt: "A Rota 2 está aberta para você. Continue lapidando essa equipe!" },
      sight: 0,
      music: "leader",
      badge: "badgeTopaz",
      mt: "mt01",
    },
  },

  // Arena da Serra do Cipó
  {
    id: "swimDuda", map: "arena2", x: 11, y: 9, facing: "left", look: "swimmer",
    trainer: {
      name: { en: "Swimmer Duda", pt: "Nadadora Duda" },
      team: [["piabinha", 16], ["lontrinha", 17]],
      reward: 480,
      intro: { en: "Made it across the first pool? The currents only get trickier!", pt: "Passou da primeira piscina? As correntezas só ficam mais difíceis!" },
      win: { en: "I got swept away...", pt: "Fui levada pela correnteza..." },
      after: { en: "Stick to the stones. The currents know where they're taking you, but you don't!", pt: "Fique nas pedras. A correnteza sabe para onde leva você, mas você não!" },
      sight: 4,
    },
  },
  {
    id: "swimTeo", map: "arena2", x: 11, y: 5, facing: "left", look: "swimmer",
    trainer: {
      name: { en: "Swimmer Téo", pt: "Nadador Téo" },
      team: [["lontrinha", 17], ["piabinha", 18]],
      reward: 540,
      intro: { en: "Marina's just one pool away. You'll have to get through me first!", pt: "A Marina está a uma piscina daqui. Primeiro você tem que passar por mim!" },
      win: { en: "Glub glub...", pt: "Glub glub..." },
      after: { en: "Look for a current that flows the way you want to go. Let the water do the work.", pt: "Procure uma correnteza que vá para onde você quer. Deixe a água trabalhar." },
      sight: 6,
    },
  },
  {
    id: "leader2", map: "arena2", x: 6, y: 1, facing: "down", look: "marina",
    trainer: {
      name: { en: "Leader Marina", pt: "Líder Marina" },
      team: [
        ["piabinha", 18],
        ["lontrinha", 19, { moves: ["aquajet", "bubblebeam", "bite", "tailwhip"] }],
        ["pirarucao", 21, { moves: ["waterfall", "bite", "bubblebeam", "screech"], perfect: true }],
      ],
      reward: 2100,
      intro: { en: "Welcome to the Arena da Serra do Cipó! I'm Marina. My creatures were raised under the waterfalls, and they hit just as hard. Ready to get soaked?", pt: "Bem-vindo à Arena da Serra do Cipó! Sou a Marina. Minhas criaturas cresceram debaixo das cachoeiras, e batem com a mesma força. Pronto para se molhar?" },
      win: { en: "Wow! You swam right through my currents!", pt: "Uau! Você nadou direto pelas minhas correntezas!" },
      after: { en: "The bridge north should be done soon. Until then, go fishing! You never know what's in the river.", pt: "A ponte ao norte deve ficar pronta logo. Até lá, vá pescar! Nunca se sabe o que tem no rio." },
      sight: 0,
      music: "leader",
      badge: "badgeAquamarine",
      mt: "mt02",
    },
  },
  { id: "nurse4", map: "center4", x: 5, y: 1, facing: "down", look: "nurse", script: "nurse" },
  { id: "visitor4", map: "center4", x: 8, y: 5, facing: "left", look: "swimmer", text: [{ en: "Marina uses Water creatures. Grass and Electric moves work wonders against them!", pt: "A Marina usa criaturas de Água. Golpes de Planta e Elétricos fazem maravilhas contra elas!" }] },
  { id: "clerk3", map: "mart3", x: 2, y: 1, facing: "down", look: "clerk", script: "clerkCipo" },
  { id: "shopper3", map: "mart3", x: 7, y: 5, facing: "up", look: "oldman", text: [{ en: "An MT can teach a move to any creature that can learn it, again and again. It never wears out!", pt: "Um MT ensina um golpe a qualquer criatura que possa aprender, quantas vezes quiser. Nunca gasta!" }] },

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
  { id: "nurse3", map: "center3", x: 5, y: 1, facing: "down", look: "nurse", script: "nurse" },
  { id: "visitor3", map: "center3", x: 9, y: 5, facing: "left", look: "miner", text: [{ en: "I explore caves for fun. The Lapinha goes three floors down, and the way out north is on the middle floor!", pt: "Exploro grutas por diversão. A Lapinha desce três andares, e a saída norte fica no andar do meio!" }] },
  // Gruta da Lapinha
  {
    id: "beto", map: "lapinha1", x: 4, y: 8, facing: "right", look: "miner",
    trainer: {
      name: { en: "Caver Beto", pt: "Espeleólogo Beto" },
      team: [["pedrudo", 12], ["morceguinho", 13]],
      reward: 390,
      intro: { en: "Watch your step! Caves are full of surprises, like me!", pt: "Cuidado onde pisa! Grutas são cheias de surpresas, como eu!" },
      win: { en: "Surprise! I lost.", pt: "Surpresa! Perdi." },
      after: { en: "Morceguinho have no eyes. They find you by sound, so they always find you.", pt: "Morceguinhos não têm olhos. Eles acham você pelo som, então sempre acham." },
      sight: 4,
    },
  },
  {
    id: "grunt1", map: "lapinha1", x: 15, y: 5, facing: "left", look: "grunt",
    trainer: {
      name: { en: "Garimpo Grunt", pt: "Capanga do Garimpo" },
      team: [["ratico", 13], ["morceguinho", 13]],
      reward: 390,
      intro: { en: "This cave belongs to Garimpo Sombrio now! Scram, kid!", pt: "Esta gruta agora é do Garimpo Sombrio! Some daqui, pirralho!" },
      win: { en: "Tch. The boss won't like this.", pt: "Tsc. O chefe não vai gostar disso." },
      after: { en: "We dig up what we like, where we like. Gems, gold, fossils... It all sells.", pt: "A gente cava o que quer, onde quer. Gemas, ouro, fósseis... Tudo vende." },
      sight: 4,
    },
  },
  {
    id: "grunt2", map: "lapinha2", x: 8, y: 10, facing: "left", look: "grunt",
    trainer: {
      name: { en: "Garimpo Grunt", pt: "Capanga do Garimpo" },
      team: [["pedrudo", 14], ["ratico", 14]],
      reward: 420,
      intro: { en: "You're lost, kid. Let me show you the way out!", pt: "Tá perdido, pirralho? Deixa eu te mostrar a saída!" },
      win: { en: "I'm the one who's lost...", pt: "Quem se perdeu fui eu..." },
      after: { en: "Somebody down below found fossils. Fossils sell for a fortune!", pt: "Alguém lá embaixo achou fósseis. Fóssil vale uma fortuna!" },
      sight: 4,
    },
  },
  {
    id: "grunt3", map: "lapinha3", x: 20, y: 7, facing: "left", look: "grunt",
    trainer: {
      name: { en: "Garimpo Grunt", pt: "Capanga do Garimpo" },
      team: [["morceguinho", 14], ["ratico", 14], ["pedrudo", 16]],
      reward: 480,
      intro: { en: "Garimpo Sombrio digs where it wants! And we want what's in this cave!", pt: "O Garimpo Sombrio cava onde quiser! E a gente quer o que tem nesta gruta!" },
      win: { en: "Blast it! Not literally. We already did that.", pt: "Droga! Pelo menos a dinamite a gente já usou." },
      after: { en: "Go ahead, take the stupid ladder. We'll be back with more crew.", pt: "Vai, pega essa escada. A gente volta com mais gente." },
      sight: 4,
    },
  },
  {
    id: "lapNerd", map: "lapinha3", x: 4, y: 4, facing: "down", look: "scientist",
    trainer: {
      name: { en: "Scientist Otávio", pt: "Cientista Otávio" },
      team: [["chispito", 14], ["pedrudo", 14], ["chispito", 15]],
      reward: 600,
      intro: { en: "Stop right there! I found these fossils first! They're not going to any smugglers, and they're not going to you!", pt: "Pare aí! Eu achei estes fósseis primeiro! Não vão para contrabandista nenhum, nem para você!" },
      win: { en: "All right, all right! You're clearly no smuggler.", pt: "Tá bom, tá bom! Você claramente não é contrabandista." },
      after: { en: "We'll share them. Pick one of the two fossils, and I'll take the other one to a lab.", pt: "Vamos dividir. Escolha um dos dois fósseis e eu levo o outro para um laboratório." },
      sight: 2,
    },
  },
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
  { map: "overworld", x: 13, y: 7, text: { en: "CIDADE IPÊ ARENA\nLeader: Topázio\nThe rock-hard gem of Minas!", pt: "ARENA DE CIDADE IPÊ\nLíder: Topázio\nA joia dura como pedra de Minas!" } },
  { map: "overworld", x: 26, y: -2, text: { en: "ROUTE 2\nCidade Ipê ↓   Serra do Cipó ↑", pt: "ROTA 2\nCidade Ipê ↓   Serra do Cipó ↑" } },
  { map: "overworld", x: 14, y: -38, text: { en: "ROUTE 3\nRoute 2 ↓   Gruta da Lapinha ↑", pt: "ROTA 3\nRota 2 ↓   Gruta da Lapinha ↑" } },
  { map: "overworld", x: 14, y: -77, text: { en: "ROUTE 4\nGruta da Lapinha ↓   Serra do Cipó ↑", pt: "ROTA 4\nGruta da Lapinha ↓   Serra do Cipó ↑" } },
  { map: "overworld", x: 14, y: -93, text: { en: "SERRA DO CIPÓ\nWhere the waterfalls sing.", pt: "SERRA DO CIPÓ\nOnde as cachoeiras cantam." } },
  { map: "overworld", x: 23, y: -110, text: { en: "SERRA DO CIPÓ ARENA\nLeader: Marina\nThe waterfall's fury!", pt: "ARENA DA SERRA DO CIPÓ\nLíder: Marina\nA fúria da cachoeira!" } },
  { map: "overworld", x: 17, y: -120, text: { en: "PONTE DO CIPÓ\nUnder construction. No crossing!", pt: "PONTE DO CIPÓ\nEm obras. Passagem proibida!" } },
  { map: "overworld", x: 11, y: -110, text: { en: "CACHOEIRA DA FAROFA\nNo swimming below the falls!", pt: "CACHOEIRA DA FAROFA\nProibido nadar abaixo da queda!" } },
  { map: "overworld", x: 14, y: -66, text: { en: "GRUTA DA LAPINHA\nLimestone caves of Lagoa Santa. Mind the bats!", pt: "GRUTA DA LAPINHA\nGrutas de calcário de Lagoa Santa. Cuidado com os morcegos!" } },
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
  { id: "gi6", map: "overworld", x: 4, y: -13, item: "superpocao", qty: 1 },
  { id: "gi7", map: "overworld", x: 28, y: -19, item: "amuleto", qty: 3 },
  { id: "gi8", map: "overworld", x: 3, y: -26, item: "reviver", qty: 1 },
  { id: "gi9", map: "overworld", x: 28, y: -32, item: "superamuleto", qty: 1 },
  { id: "gi10", map: "overworld", x: 5, y: -54, item: "superpocao", qty: 1 },
  { id: "gi11", map: "overworld", x: 28, y: -66, item: "reviver", qty: 1 },
  { id: "gi12", map: "overworld", x: 24, y: -43, item: "antidoto", qty: 2 },
  { id: "gi13", map: "lapinha1", x: 20, y: 1, item: "superamuleto", qty: 1 },
  { id: "gi14", map: "lapinha1", x: 1, y: 14, item: "pocao", qty: 2 },
  { id: "gi15", map: "lapinha2", x: 1, y: 12, item: "despertador", qty: 1 },
  { id: "gi16", map: "lapinha3", x: 22, y: 14, item: "curatotal", qty: 1 },
  { id: "gi17", map: "lapinha3", x: 12, y: 1, item: "superpocao", qty: 1 },
  { id: "gi18", map: "overworld", x: 28, y: -74, item: "superpocao", qty: 1 },
  { id: "gi19", map: "overworld", x: 3, y: -90, item: "superamuleto", qty: 2 },
  { id: "gi20", map: "overworld", x: 11, y: -82, item: "desparalisante", qty: 1 },
  { id: "gi21", map: "overworld", x: 27, y: -118, item: "reviver", qty: 1 },
];

// ---------- Wild encounters ----------
export interface EncounterSlot {
  species: SpeciesId;
  min: number;
  max: number;
  weight: number;
}

const CAVE_UPPER: EncounterSlot[] = [
  { species: "morceguinho", min: 10, max: 12, weight: 50 },
  { species: "pedrudo", min: 10, max: 13, weight: 40 },
  { species: "luazinha", min: 11, max: 12, weight: 10 },
];
const CAVE_DEEP: EncounterSlot[] = [
  { species: "morceguinho", min: 11, max: 13, weight: 45 },
  { species: "pedrudo", min: 11, max: 14, weight: 38 },
  { species: "luazinha", min: 12, max: 14, weight: 17 },
];

export function encounterTable(map: MapId, y: number): EncounterSlot[] {
  if (map === "lapinha1" || map === "lapinha2") return CAVE_UPPER;
  if (map === "lapinha3") return CAVE_DEEP;
  if (y < -72)
    return [
      { species: "jararaca", min: 13, max: 16, weight: 28 },
      { species: "canelinha", min: 13, max: 15, weight: 24 },
      { species: "pardalito", min: 13, max: 15, weight: 22 },
      { species: "ratico", min: 13, max: 15, weight: 16 },
      { species: "lagartix", min: 13, max: 14, weight: 10 },
    ];
  if (y < -36)
    return [
      { species: "pardalito", min: 11, max: 13, weight: 30 },
      { species: "lagartix", min: 11, max: 13, weight: 25 },
      { species: "chispito", min: 12, max: 14, weight: 20 },
      { species: "morceguinho", min: 11, max: 12, weight: 15 },
      { species: "borbolux", min: 12, max: 14, weight: 10 },
    ];
  if (y < 0)
    return [
      { species: "pardalito", min: 10, max: 12, weight: 20 },
      { species: "ratico", min: 10, max: 12, weight: 18 },
      { species: "corujita", min: 10, max: 13, weight: 18 },
      { species: "pedrudo", min: 11, max: 13, weight: 18 },
      { species: "chispito", min: 10, max: 13, weight: 16 },
      { species: "borbolux", min: 11, max: 13, weight: 10 },
    ];
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

/** What bites when you fish with the Vara de Pescar. */
export function fishTable(y: number): EncounterSlot[] {
  if (y < -72)
    return [
      { species: "piabinha", min: 10, max: 15, weight: 85 },
      { species: "lontrinha", min: 13, max: 15, weight: 15 },
    ];
  return [{ species: "piabinha", min: 5, max: 10, weight: 100 }];
}

// ---------- Tile queries ----------
export function tileAt(map: MapId, x: number, y: number): string {
  if (map === "overworld") {
    return owTile(x, y);
  }
  const rows = INTERIORS[map].rows;
  if (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length) return "#";
  return rows[y][x];
}

const OW_WALK = new Set([".", ",", '"', "f", "s", "="]);
const IN_WALK = new Set([".", "d", "r"]);
const CAVE_WALK = new Set([".", "d", "H", "U", "D"]);
const POOL_WALK = new Set([".", "d", "n", "^", "v", "<", ">"]);

export function isWalkableTile(map: MapId, x: number, y: number): boolean {
  const t = tileAt(map, x, y);
  if (map === "overworld") return OW_WALK.has(t);
  const def = INTERIORS[map];
  return (def.cave ? CAVE_WALK : def.pool ? POOL_WALK : IN_WALK).has(t);
}
