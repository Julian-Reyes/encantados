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
