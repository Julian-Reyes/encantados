import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { createServer } from 'vite';
import { createServer as createHttpServer } from 'node:http';

// Load the actual TypeScript game modules without starting an HTTP server.
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: { server: createHttpServer() }, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
});
after(() => server.close());
const storage = new Map();
if (!globalThis.navigator) Object.defineProperty(globalThis, 'navigator', { value: { language: 'en' } });
globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };
const store = await server.ssrLoadModule('/src/game/store.ts');
const { createMon, maxHp, expForLevel } = await server.ssrLoadModule('/src/game/mon.ts');
const { runBattle } = await server.ssrLoadModule('/src/game/battle.ts');
const { say } = await server.ssrLoadModule('/src/game/dialog.ts');
const { gainExp } = await server.ssrLoadModule('/src/game/progression.ts');
const { G, newSave, useGame } = store;
beforeEach(() => G().set({ ...newSave(), lang: 'en', sound: false, music: false, dialog: null, screen: null }));

async function dialogues(fn, choose = () => 1) {
  const messages = [];
  const stop = useGame.subscribe(s => {
    if (!s.dialog) return;
    const d = s.dialog;
    messages.push(d.text);
    queueMicrotask(() => d.resolve(d.input ? 'Pebble' : d.choices ? choose(d) : 0));
  });
  try { return { result: await fn(), messages }; } finally { stop(); }
}
function ui(actions = [{ kind: 'run' }]) {
  let turns = 0;
  return {
    setActive() {}, async anim() {}, async hp() {}, async xp() {}, refresh() {},
    async chooseAction() {
      assert.equal(G().dialog, null, 'action menu must wait until send-out dialogue completes');
      assert.ok(turns < 100, 'battle must terminate');
      return actions[Math.min(turns++, actions.length - 1)];
    },
    async choosePartyForced() { return G().party.findIndex(m => m.hp > 0); },
  };
}

test('stale dialogue callbacks cannot dismiss the next line', async () => {
  const first = say('First');
  const stale = G().dialog;
  stale.resolve(0);
  await first;
  const second = say('Second');
  stale.resolve(0);
  assert.equal(G().dialog.text, 'Second');
  G().dialog.resolve(0);
  await second;
});

test('battle send-out completes before actions and running exits cleanly', async () => {
  G().party.push(createMon('fagulho', 20));
  const { result, messages } = await dialogues(() => runBattle({ kind: 'wild', enemy: [createMon('ratico', 2)] }, ui()));
  assert.equal(result.outcome, 'run');
  assert.equal(messages.filter(m => m.startsWith('Go!')).length, 1);
});

test('an exhausted party loses safely instead of crashing', async () => {
  const mon = createMon('fagulho', 5); mon.hp = 0;
  G().party.push(mon);
  const result = await runBattle({ kind: 'trainer', enemy: [createMon('ratico', 5)] }, ui());
  assert.equal(result.outcome, 'lose');
});

test('trainer battles replace fainted opponents and award the reward once', async () => {
  const mon = createMon('fagulho', 40);
  mon.moves = [{ id: 'tackle', pp: 35 }];
  G().party.push(mon);
  const before = G().money;
  const { result } = await dialogues(() => runBattle({
    kind: 'trainer', enemy: [createMon('ratico', 2), createMon('pardalito', 2)],
    trainer: { id: 'test', name: { en: 'Tester', pt: 'Teste' }, reward: 120, win: { en: 'Good battle!', pt: 'Boa batalha!' } },
  }, ui([{ kind: 'move', index: 0 }])));
  assert.equal(result.outcome, 'win');
  assert.equal(G().money, before + 120);
  assert.ok(mon.moves[0].pp < 35);
});

test('catching into a full team sends the nicknamed creature to storage', async () => {
  for (let i = 0; i < 6; i++) G().party.push(createMon('fagulho', 10));
  G().set({ bag: { superamuleto: 1 } });
  const enemy = createMon('ratico', 2); enemy.hp = 1; enemy.status = 'slp';
  const { result } = await dialogues(() => runBattle({ kind: 'wild', enemy: [enemy] }, ui([{ kind: 'item', item: 'superamuleto', target: 0 }])), () => 0);
  assert.equal(result.outcome, 'caught');
  assert.equal(G().party.length, 6);
  assert.equal(G().box[0].nickname, 'Pebble');
  assert.equal(G().bag.superamuleto, undefined);
  assert.ok(G().caught.includes('ratico'));
});

test('level-up preserves damage and offers newly learned moves', async () => {
  const mon = createMon('fagulho', 6); mon.hp -= 3;
  await dialogues(() => gainExp(mon, expForLevel(7) - mon.exp));
  assert.equal(mon.level, 7);
  assert.equal(maxHp(mon) - mon.hp, 3);
  assert.ok(mon.moves.length <= 4);
});

test('save/load round-trips party, bag, flags and position', () => {
  const mon = createMon('bolhuga', 5); mon.nickname = 'Rio';
  G().set({ party: [mon], flags: { hasStarter: true }, bag: { amuleto: 5 } });
  const spot = { map: 'overworld', x: 15, y: 58, facing: 'up' };
  assert.equal(store.saveGame(spot), true);
  const restored = store.loadGame();
  assert.deepEqual(restored.pos, spot);
  assert.deepEqual(restored.party, [mon]);
  assert.equal(restored.bag.amuleto, 5);
  assert.equal(restored.flags.hasStarter, true);
});

test('a fainted lead is replaced and the reserve can finish the battle', async () => {
  const lead = createMon('fagulho', 2); lead.hp = 1;
  lead.moves = [{ id: 'growl', pp: 40 }];
  const reserve = createMon('bolhuga', 40);
  reserve.moves = [{ id: 'tackle', pp: 35 }];
  const enemy = createMon('ratico', 5);
  enemy.moves = [{ id: 'tackle', pp: 35 }];
  G().party.push(lead, reserve);
  const active = [];
  const screen = ui([{ kind: 'move', index: 0 }]);
  screen.setActive = (side, mon) => { if (side === 'player') active.push(mon.uid); };
  const { result } = await dialogues(() => runBattle({ kind: 'wild', enemy: [enemy] }, screen));
  assert.equal(result.outcome, 'win');
  assert.deepEqual(active, [lead.uid, reserve.uid]);
  assert.equal(lead.hp, 0);
  assert.ok(reserve.hp > 0);
});

const maps = await server.ssrLoadModule('/src/world/maps.ts');
const { SPECIES } = await server.ssrLoadModule('/src/data/species.ts');
const { MOVES } = await server.ssrLoadModule('/src/data/moves.ts');
const { effectiveness } = await server.ssrLoadModule('/src/data/types.ts');

test('people and items stand on walkable tiles', () => {
  for (const e of [...maps.NPCS, ...maps.GROUND_ITEMS]) {
    assert.ok(maps.isWalkableTile(e.map, e.x, e.y), `${e.id} on ${e.map} (${e.x},${e.y}) is on "${maps.tileAt(e.map, e.x, e.y)}"`);
  }
});

test('every cave ladder is linked and the whole Gruta da Lapinha is reachable from its entrance', () => {
  const caves = Object.keys(maps.INTERIORS).filter(m => maps.INTERIORS[m].cave);
  const key = (m, x, y) => `${m},${x},${y}`;
  // Walk from the 1F entrance through floors and ladders; people and items block.
  const occupied = new Set([...maps.NPCS, ...maps.GROUND_ITEMS].map(e => key(e.map, e.x, e.y)));
  const [ex, ey] = maps.interiorDoor('lapinha1');
  const seen = new Set();
  const queue = [['lapinha1', ex, ey]];
  while (queue.length) {
    const [m, x, y] = queue.pop();
    if (seen.has(key(m, x, y))) continue;
    seen.add(key(m, x, y));
    const link = maps.caveLink(m, x, y);
    if (link) queue.push([link.map, link.x, link.y]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (maps.isWalkableTile(m, x + dx, y + dy) && !occupied.has(key(m, x + dx, y + dy))) queue.push([m, x + dx, y + dy]);
    }
  }
  const nextToReached = (m, x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(key(m, x + dx, y + dy)));
  for (const m of caves) {
    maps.INTERIORS[m].rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === 'H' || ch === 'U') assert.ok(maps.caveLink(m, x, y), `${m} (${x},${y}) ${ch} has no partner`);
      if ('.HUZD'.includes(ch)) assert.ok(seen.has(key(m, x, y)) || nextToReached(m, x, y), `${m} (${x},${y}) "${ch}" can't be reached`);
    }));
    for (const e of [...maps.NPCS, ...maps.GROUND_ITEMS].filter(e => e.map === m)) {
      assert.ok(nextToReached(m, e.x, e.y), `${e.id} in ${m} can't be reached`);
    }
  }
});

test('species data is consistent and wild tables only use known species', () => {
  for (const sp of Object.values(SPECIES)) {
    for (const [, mv] of sp.learnset) assert.ok(MOVES[mv], `${sp.id} learns unknown move ${mv}`);
    if (sp.evolves) assert.ok(SPECIES[sp.evolves.to], `${sp.id} evolves into unknown ${sp.evolves.to}`);
  }
  for (const [map, y] of [['overworld', -80], ['overworld', -50], ['overworld', -10], ['overworld', 30], ['overworld', 50], ['lapinha1', 0], ['lapinha3', 0]]) {
    for (const slot of maps.encounterTable(map, y)) assert.ok(SPECIES[slot.species], `${map}/${y}: ${slot.species}`);
  }
  for (const y of [-110, -80, 30]) for (const slot of maps.fishTable(y)) assert.ok(SPECIES[slot.species], `fish ${y}: ${slot.species}`);
  assert.ok(maps.encounterTable('overworld', -80).some(s => s.species === 'jararaca'));
  assert.ok(maps.fishTable(-110).some(s => s.species === 'piabinha'));
  assert.ok(maps.encounterTable('lapinha1', 0).some(s => s.species === 'morceguinho'));
});

test('Poison and Ground follow the handheld chart, including immunities', () => {
  assert.equal(effectiveness('electric', ['poison', 'ground']), 0);
  assert.equal(effectiveness('ground', ['poison', 'flying']), 0);
  assert.equal(effectiveness('ground', ['rock']), 2);
  assert.equal(effectiveness('grass', ['poison', 'flying']), 0.25);
  assert.equal(effectiveness('rock', ['poison', 'flying']), 2);
});

test('a move with no effect deals no damage', async () => {
  // Mud Slap is Ground, and Morceguinho flies.
  G().set({ party: [Object.assign(createMon('pedrudo', 15), { moves: [{ id: 'mudslap', pp: 10 }] })] });
  const bat = createMon('morceguinho', 15);
  const { messages } = await dialogues(() => runBattle({ kind: 'wild', enemy: [bat] }, ui([{ kind: 'move', index: 0 }, { kind: 'run' }])));
  assert.ok(messages.some(m => /doesn't affect/.test(m)), messages.join(' | '));
  assert.equal(bat.hp, maxHp(bat));
});

const { ITEMS, mtFits } = await server.ssrLoadModule('/src/data/items.ts');

test('Dark still resists nothing new: Water/Dark takes 2x from Grass, Electric and Bug', () => {
  assert.equal(effectiveness('grass', ['water', 'dark']), 2);
  assert.equal(effectiveness('electric', ['water', 'dark']), 2);
  assert.equal(effectiveness('bug', ['water', 'dark']), 2);
  assert.equal(MOVES.bite.type, 'dark');
});

test('MTs only fit the creatures that can learn them', () => {
  assert.equal(mtFits('mt02', SPECIES.bolhuga), true);
  assert.equal(mtFits('mt02', SPECIES.pirarucao), true);
  assert.equal(mtFits('mt02', SPECIES.pedrudo), false);
  assert.equal(mtFits('mt01', SPECIES.pedrudo), true);
  assert.equal(mtFits('mt01', SPECIES.labaredo), true);
  assert.equal(mtFits('mt01', SPECIES.bolhuga), false);
  for (const id of ['mt01', 'mt02']) assert.ok(MOVES[ITEMS[id].mt.move], id);
  const leaders = maps.NPCS.filter(n => n.trainer?.badge);
  for (const l of leaders) assert.ok(l.trainer.mt && ITEMS[l.trainer.mt].mt, `${l.id} hands out an MT`);
});

test('every building with an interior has a walkable way in and out', () => {
  for (const b of maps.BUILDINGS.filter(b => b.interior)) {
    assert.ok(maps.isWalkableTile('overworld', b.door[0], b.door[1] + 1), `${b.letter} door step`);
    const [ix, iy] = b.entry ?? maps.interiorDoor(b.interior);
    assert.ok(ix >= 0 && maps.isWalkableTile(b.interior, ix, iy), `${b.letter} arrives inside ${b.interior} at (${ix},${iy})`);
  }
  // The Lapinha's north exit comes out of the Route 4 mouth.
  const d = maps.INTERIORS.lapinha2.rows[0].indexOf('D');
  assert.ok(d > 0, 'B1F has a north exit');
  const mouth = maps.buildingForInterior('lapinha2');
  assert.equal(mouth.letter, 'U');
  assert.deepEqual(mouth.entry.slice(0, 2), [d, 1]);
  assert.ok(maps.isWalkableTile('overworld', mouth.door[0], mouth.door[1] + 1));
  assert.ok(!maps.NPCS.some(n => n.map === 'lapinha2' && n.y <= 1), 'nothing blocks the way out');
});

test('Route 4 and Serra do Cipó are reachable from the Lapinha north mouth', () => {
  const mouth = maps.buildingForInterior('lapinha2');
  const key = (x, y) => `${x},${y}`;
  const onMap = e => e.map === 'overworld' && e.y < -72;
  // People who only appear during a scene (the rival) don't stand in the way.
  const present = e => !e.visible || e.visible({});
  const occupied = new Set([...maps.NPCS.filter(present), ...maps.GROUND_ITEMS, ...maps.SIGNS].filter(onMap).map(e => key(e.x, e.y)));
  const seen = new Set();
  const queue = [[mouth.door[0], mouth.door[1] + 1]];
  while (queue.length) {
    const [x, y] = queue.pop();
    if (seen.has(key(x, y)) || y >= -72) continue;
    seen.add(key(x, y));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      // Ledges are one-way: hop two tiles south.
      if (dy === 1 && maps.tileAt('overworld', nx, ny) === 'L') { if (maps.isWalkableTile('overworld', nx, ny + 1)) queue.push([nx, ny + 1]); continue; }
      if (maps.isWalkableTile('overworld', nx, ny) && !occupied.has(key(nx, ny))) queue.push([nx, ny]);
    }
  }
  const near = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(key(x + dx, y + dy)));
  for (const e of [...maps.NPCS.filter(present), ...maps.GROUND_ITEMS, ...maps.SIGNS].filter(onMap)) assert.ok(near(e.x, e.y), `${e.id ?? 'sign'} at (${e.x},${e.y}) can't be reached`);
  for (const b of maps.BUILDINGS.filter(b => b.y < -72)) assert.ok(seen.has(key(b.door[0], b.door[1] + 1)), `${b.letter} door can't be reached`);
  assert.ok(seen.has(key(15, -117)) || seen.has(key(16, -117)), 'the rival row at the north exit');
});

// Walk the pool arena the way the game does: a step onto a current keeps sliding until still ground or a block.
function poolMoves(x, y, occupied) {
  const key = (x, y) => `${x},${y}`;
  const V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const free = (x, y) => maps.isWalkableTile('arena2', x, y) && !occupied.has(key(x, y));
  const out = [];
  for (const [dx, dy] of Object.values(V)) {
    let nx = x + dx, ny = y + dy;
    if (!free(nx, ny)) continue;
    for (let guard = 0; guard < 100; guard++) {
      const c = maps.currentAt('arena2', nx, ny);
      if (!c || !free(nx + V[c][0], ny + V[c][1])) break;
      nx += V[c][0]; ny += V[c][1];
    }
    out.push([nx, ny]);
  }
  return out;
}
function poolReach(start, occupied) {
  const key = (x, y) => `${x},${y}`;
  const seen = new Set();
  const queue = [start];
  while (queue.length) {
    const [x, y] = queue.pop();
    if (seen.has(key(x, y))) continue;
    seen.add(key(x, y));
    for (const n of poolMoves(x, y, occupied)) queue.push(n);
  }
  return seen;
}

test('Marina\'s pool arena: everyone can be reached and no current traps you', () => {
  const key = (x, y) => `${x},${y}`;
  const npcs = maps.NPCS.filter(n => n.map === 'arena2');
  const occupied = new Set(npcs.map(n => key(n.x, n.y)));
  const door = maps.interiorDoor('arena2');
  const reached = poolReach(door, occupied);
  const near = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reached.has(key(x + dx, y + dy)));
  for (const n of npcs) assert.ok(near(n.x, n.y), `${n.id} can't be reached`);
  assert.ok(npcs.some(n => n.trainer?.badge === 'badgeAquamarine'));
  // From every tile you can come to rest on, the way back to the door is still open.
  for (const k of reached) {
    const [x, y] = k.split(',').map(Number);
    assert.ok(poolReach([x, y], occupied).has(key(...door)), `stuck at (${x},${y})`);
  }
  // Trainers who spot you walk up to you and back to their post afterwards. Wherever they
  // could stop, the walk out and back is clear, and once they're back nobody is trapped.
  const V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  for (const n of npcs.filter(n => n.trainer?.sight)) {
    const [dx, dy] = V[n.facing];
    for (let i = 2; i <= n.trainer.sight; i++) {
      const px = n.x + dx * i, py = n.y + dy * i;
      if (!maps.isWalkableTile('arena2', px, py) || occupied.has(key(px, py))) break;
      if (!reached.has(key(px, py))) continue;
      for (let j = 1; j < i; j++) assert.ok(maps.isWalkableTile('arena2', n.x + dx * j, n.y + dy * j), `${n.id} can walk to you at (${px},${py})`);
      assert.ok(poolReach([px, py], occupied).has(key(...door)), `after ${n.id} walks back, (${px},${py}) can still reach the door`);
    }
  }
  // Not trivially straight: a straight walk up the middle can't reach the leader's platform.
  const [dx] = door;
  let y = door[1];
  while (maps.isWalkableTile('arena2', dx, y - 1) && !maps.currentAt('arena2', dx, y - 1)) y--;
  assert.ok(y > 2, 'the middle is blocked by water');
});

test('a save made before Route 4 existed still loads onto the same spot', async () => {
  // Written by the previous build (OW_Y0 was -72): standing on the Route 3 road, healed at the cave's center.
  const oldSave = {
    v: 1, lang: 'en', playerName: 'Caju', rivalName: 'Caio', money: 4321,
    party: [createMon('bolhuga', 16)], box: [], bag: { amuleto: 3, fossilgarra: 1 },
    flags: { hasStarter: true, badgeTopaz: true, beat_leader1: true, fossilTaken: true },
    seen: ['bolhuga'], caught: ['bolhuga'],
    pos: { map: 'overworld', x: 15, y: -60, facing: 'up' },
    heal: { map: 'center3', x: 5, y: 3, facing: 'up' },
    playTime: 5400, starter: 'bolhuga',
  };
  storage.set('encantados-save-v1', JSON.stringify(oldSave));
  const loaded = store.loadGame();
  assert.deepEqual(loaded.pos, oldSave.pos);
  assert.equal(maps.tileAt('overworld', 15, -60), ',');
  assert.ok(maps.isWalkableTile('overworld', 15, -60));
  const { rt, loadMap } = await server.ssrLoadModule('/src/world/runtime.ts');
  G().set({ ...loaded, sound: false, music: false });
  loadMap(loaded.pos.map, loaded.pos.x, loaded.pos.y, loaded.pos.facing);
  assert.deepEqual([rt.map, rt.player.x, rt.player.y], ['overworld', 15, -60]);
  // Everything from the old northern wall south is exactly as it was.
  const { createHash } = await import('node:crypto');
  const rows = [];
  for (let y = -72; y < 76; y++) { let r = ''; for (let x = 0; x < 32; x++) r += maps.owTile(x, y); rows.push(r); }
  assert.equal(createHash('sha1').update(rows.join('\n')).digest('hex'), 'd4837bbf3d83fd8f5cab32f8f628645e04f46bf4');
  const doors = Object.fromEntries(maps.BUILDINGS.filter(b => b.letter !== 'h').map(b => [b.letter, b.door]));
  assert.deepEqual(doors.P, [21, 72]);
  assert.deepEqual(doors.G, [15, 6]);
  assert.deepEqual(doors.V, [16, -67]);
  assert.deepEqual(doors.Q, [6, -66]);
  assert.equal(maps.buildingForInterior(loaded.heal.map).letter, 'Q');
});

test('trainers who walk up to you have a clear path there and back', () => {
  const key = (m, x, y) => `${m},${x},${y}`;
  const V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const things = [...maps.NPCS, ...maps.GROUND_ITEMS, ...maps.SIGNS];
  for (const n of maps.NPCS.filter(n => n.trainer?.sight)) {
    const others = new Set(things.filter(e => e !== n && (!e.visible || e.visible({}))).map(e => key(e.map, e.x, e.y)));
    const [dx, dy] = V[n.facing];
    for (let i = 1; i <= n.trainer.sight; i++) {
      const x = n.x + dx * i, y = n.y + dy * i;
      // Sight stops at the first blocked tile, so only the open stretch matters.
      if (!maps.isWalkableTile(n.map, x, y)) break;
      assert.ok(!others.has(key(n.map, x, y)), `${n.id}'s path is blocked at (${x},${y})`);
    }
  }
});
