// Live overworld state (player + NPC positions) and grid movement.
// This lives outside React on purpose: it changes every frame, and the 3D components read it
// directly in useFrame instead of re-rendering through the store.

import { G, flag, type Dir, type MapId } from "../game/store";
import { input } from "../game/input";
import { sfx, music } from "../game/audio";
import {
  BUILDINGS, GROUND_ITEMS, INTERIORS, NPCS, SIGNS, buildingForInterior, interiorDoor, isWalkableTile, tileAt,
  type NpcDef,
} from "./maps";
import { onStepEnd, onInteract, onBuildingDoor, onExitAttempt } from "./scripts";

export interface Actor {
  x: number;
  y: number;
  facing: Dir;
  fromX: number;
  fromY: number;
  t: number; // 0..1 progress of the current step
  moving: boolean;
  jump: boolean;
  speed: number; // tiles per second
  visible: boolean;
  phase: number; // walk cycle
  exclaimUntil: number;
  bumpUntil: number;
  onArrive?: () => void;
}

const DIRS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const dirVec = (d: Dir) => DIRS[d];
export const opposite = (d: Dir): Dir => ({ up: "down", down: "up", left: "right", right: "left" } as const)[d];

function makeActor(x: number, y: number, facing: Dir, visible = true): Actor {
  return { x, y, facing, fromX: x, fromY: y, t: 1, moving: false, jump: false, speed: 4.2, visible, phase: 0, exclaimUntil: 0, bumpUntil: 0 };
}

export const rt = {
  map: "home" as MapId,
  player: makeActor(6, 4, "down"),
  npcs: new Map<string, Actor>(),
  busy: 0,
  turnTimer: 0,
  bumpCooldown: 0,
  steps: 0,
  now: 0,
  paused: false,
};

export function npcDefsFor(map: MapId): NpcDef[] {
  return NPCS.filter((n) => n.map === map);
}

/** Put the player on a map. NPCs reset to their home spots. */
export function loadMap(map: MapId, x: number, y: number, facing: Dir) {
  rt.map = map;
  rt.player = makeActor(x, y, facing);
  rt.npcs.clear();
  const flags = G().flags;
  for (const n of npcDefsFor(map)) {
    const vis = n.visible ? n.visible(flags) : true;
    rt.npcs.set(n.id, makeActor(n.x, n.y, n.facing, vis));
  }
  G().set({ pos: { map, x, y, facing } });
  music(mapMusic(map, y));
}

export function mapMusic(map: MapId, y: number): string {
  if (map !== "overworld") return INTERIORS[map].music;
  return y >= 18 && y <= 55 ? "route" : "town";
}

export function refreshNpcVisibility() {
  const flags = G().flags;
  for (const n of npcDefsFor(rt.map)) {
    const a = rt.npcs.get(n.id);
    if (a && n.visible) a.visible = n.visible(flags);
  }
}

export function currentSpot() {
  const p = rt.player;
  return { map: rt.map, x: p.x, y: p.y, facing: p.facing };
}

// ---------- Occupancy ----------
export function npcAt(x: number, y: number): string | null {
  for (const [id, a] of rt.npcs) {
    if (!a.visible) continue;
    if (a.x === x && a.y === y) return id;
    if (a.moving && a.fromX === x && a.fromY === y) return id;
  }
  return null;
}

export function signAt(x: number, y: number) {
  return SIGNS.find((s) => s.map === rt.map && s.x === x && s.y === y);
}

export function itemAt(x: number, y: number) {
  return GROUND_ITEMS.find((i) => i.map === rt.map && i.x === x && i.y === y && !flag("item_" + i.id));
}

export function blocked(x: number, y: number, ignoreNpc?: string): boolean {
  if (!isWalkableTile(rt.map, x, y)) return true;
  const n = npcAt(x, y);
  if (n && n !== ignoreNpc) return true;
  if (signAt(x, y) || itemAt(x, y)) return true;
  if (ignoreNpc && rt.player.x === x && rt.player.y === y) return true;
  return false;
}

// ---------- Movement ----------
function startStep(a: Actor, nx: number, ny: number, speed: number, jump = false) {
  a.fromX = a.x;
  a.fromY = a.y;
  a.x = nx;
  a.y = ny;
  a.t = 0;
  a.moving = true;
  a.jump = jump;
  a.speed = speed;
}

function buildingDoorAt(x: number, y: number) {
  if (rt.map !== "overworld") return undefined;
  return BUILDINGS.find((b) => b.door[0] === x && b.door[1] === y);
}

function tryPlayerMove(dir: Dir) {
  const p = rt.player;
  p.facing = dir;
  const [dx, dy] = DIRS[dir];
  const nx = p.x + dx;
  const ny = p.y + dy;
  const run = input.isRunning();
  const speed = run ? 8 : 4.2;

  // Leaving an interior: step down off the door mat.
  if (rt.map !== "overworld" && dir === "down" && tileAt(rt.map, p.x, p.y) === "d") {
    void onExitAttempt();
    return;
  }
  // Entering a building: walk up into its door.
  if (dir === "up") {
    const b = buildingDoorAt(nx, ny);
    if (b) {
      void onBuildingDoor(b);
      return;
    }
  }
  // Ledges: hop two tiles south.
  if (rt.map === "overworld" && dir === "down" && tileAt(rt.map, nx, ny) === "L") {
    if (!blocked(nx, ny + 1)) {
      sfx("jump");
      startStep(p, nx, ny + 1, 4, true);
      return;
    }
  }
  if (blocked(nx, ny)) {
    if (rt.bumpCooldown <= 0) {
      sfx("bump");
      rt.bumpCooldown = 0.4;
    }
    p.bumpUntil = rt.now + 0.25;
    return;
  }
  startStep(p, nx, ny, speed);
}

export function controlsLocked(): boolean {
  const s = G();
  return rt.busy > 0 || input.uiActive() || s.mode !== "world" || s.screen !== null || s.dialog !== null || s.fade || s.wipe || rt.paused;
}

function advance(a: Actor, dt: number) {
  if (!a.moving) return;
  const dist = a.jump ? 2 : 1;
  a.t += (dt * a.speed) / dist;
  a.phase += dt * a.speed * Math.PI;
  if (a.t >= 1) {
    a.t = 1;
    a.moving = false;
    a.jump = false;
    const cb = a.onArrive;
    a.onArrive = undefined;
    cb?.();
  }
}

/** Called every frame from the world controller. */
export function tick(dt: number) {
  rt.now += dt;
  rt.bumpCooldown -= dt;
  const p = rt.player;
  const wasMoving = p.moving;
  advance(p, dt);
  for (const a of rt.npcs.values()) advance(a, dt);

  if (wasMoving && !p.moving) {
    rt.steps++;
    // Chain steps smoothly when the key is still held and nothing interrupts.
    if (!onStepEnd()) continueWalking();
    return;
  }
  if (!p.moving) continueWalking(dt);
  idleNpcs(dt);
}

let idleTimer = 0;
/** NPCs flagged lookAround glance in random directions now and then. */
function idleNpcs(dt: number) {
  idleTimer -= dt;
  if (idleTimer > 0 || rt.busy > 0) return;
  idleTimer = 1.2 + Math.random() * 1.5;
  const defs = npcDefsFor(rt.map).filter((d) => d.lookAround);
  if (!defs.length) return;
  const d = defs[Math.floor(Math.random() * defs.length)];
  const a = rt.npcs.get(d.id);
  if (a && !a.moving) a.facing = (["up", "down", "left", "right"] as Dir[])[Math.floor(Math.random() * 4)];
}

function continueWalking(dt = 0) {
  const p = rt.player;
  if (p.moving || controlsLocked()) {
    rt.turnTimer = 0;
    return;
  }
  const dir = input.heldDir();
  if (!dir) {
    rt.turnTimer = 0;
    return;
  }
  if (dir !== p.facing && rt.turnTimer <= 0) {
    // A quick tap only turns you around, like the handhelds.
    p.facing = dir;
    rt.turnTimer = 0.1;
    return;
  }
  if (rt.turnTimer > 0) {
    rt.turnTimer -= dt;
    if (rt.turnTimer > 0) return;
  }
  tryPlayerMove(dir);
}

// ---------- Script helpers ----------
export function actor(id: string): Actor {
  if (id === "player") return rt.player;
  const a = rt.npcs.get(id);
  if (!a) throw new Error("no actor " + id);
  return a;
}

export function walk(id: string, dir: Dir, n: number, speed = 4.2): Promise<void> {
  const a = actor(id);
  return new Promise((resolve) => {
    const stepOnce = (left: number) => {
      if (left <= 0) return resolve();
      a.facing = dir;
      const [dx, dy] = DIRS[dir];
      startStep(a, a.x + dx, a.y + dy, speed);
      a.onArrive = () => stepOnce(left - 1);
    };
    stepOnce(n);
  });
}

export function face(id: string, dir: Dir) {
  actor(id).facing = dir;
}

export function faceToward(id: string, x: number, y: number) {
  const a = actor(id);
  const dx = x - a.x;
  const dy = y - a.y;
  a.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
}

export function exclaim(id: string): Promise<void> {
  const a = actor(id);
  a.exclaimUntil = rt.now + 0.8;
  sfx("exclaim");
  return new Promise((r) => setTimeout(r, 800));
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function fadeOut() {
  G().set({ fade: true });
  await wait(300);
}
export async function fadeIn() {
  G().set({ fade: false });
  await wait(250);
}

export async function warp(map: MapId, x: number, y: number, facing: Dir, withSound = true) {
  if (withSound) sfx("door");
  await fadeOut();
  loadMap(map, x, y, facing);
  await wait(80);
  await fadeIn();
}

/** Exterior door ↔ interior mat helpers. */
export function interiorEntry(map: MapId): [number, number] {
  return interiorDoor(map);
}
export function exteriorExit(map: MapId): [number, number] | null {
  const b = buildingForInterior(map);
  if (!b) return null;
  return [b.door[0], b.door[1] + 1];
}

export async function runScript(fn: () => Promise<void>) {
  rt.busy++;
  try {
    await fn();
  } catch (e) {
    console.error(e);
  } finally {
    rt.busy--;
  }
}

export function interact() {
  if (controlsLocked() || rt.player.moving) return;
  const p = rt.player;
  const [dx, dy] = DIRS[p.facing];
  void onInteract(p.x + dx, p.y + dy);
}
