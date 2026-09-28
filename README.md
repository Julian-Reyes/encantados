# Encantados

A browser creature-collecting RPG built with React, TypeScript, React Three Fiber and procedural low-poly models. Explore Vila Pequi, Cidade Ipê, Routes 1–3 and the Gruta da Lapinha caves, choose a starter, battle trainers, and fill the bilingual Almanaque.

```sh
npm install
npm run dev
```

Build a standalone game with `npm run build`. The output is **dist/index.html**, including JavaScript, styles and fonts. Open it in a modern WebGL browser or host it as a static file. Saves belong to the browser and URL you play from; changing browser or hosting location does not transfer them.

Run the gameplay regression checks with `npm test` (Node 20.19+). These load the actual game modules without listening on an HTTP port.

## Controls

| Action | Keyboard |
| --- | --- |
| Walk / select | Arrow keys or WASD |
| Talk / inspect / confirm (A) | Z, Enter, Space or J |
| Back / cancel (B) | X, Shift or K |
| Run | Hold B while walking |
| Menu | Esc or M |

Touch devices show a D-pad and A/B/Start buttons. You can also enable these in Options. Click or tap dialogue once to reveal the whole line, then again to advance. Names use a text field and its OK button.

Leave your house and head north to meet Professor Jatobá. Choose an amulet at the lab table, then explore Route 1. Weaken wild creatures before using an Amulet; extras beyond your six-member team go to the Healing Center PC. Healing Centers and Mom restore HP, move PP and status. Save through the menu before closing the game.

## Included

- Three starters, eight other base species, and ten evolutions; 21 Almanaque entries.
- Turn-based battles, elemental effectiveness, statuses, catching, nicknames, experience, move learning and cancellable evolution.
- A rival, route trainers, the Garimpo Sombrio grunts, Arena Leader Topázio, shops, healing items, storage, signs, dialogue and pickups.
- A three-floor cave with ladders, cave encounters and a fossil to choose.
- English/Portuguese options, synthesized music and effects, local saves and mobile controls.
- Instanced terrain/vegetation, a 1.5 pixel-ratio cap and one 1024-pixel shadow map.

Route 3 climbs from Route 2 to the Gruta da Lapinha. The tunnel out of the cave to Serra do Cipó is still blocked by a rockslide. See [docs/ROADMAP.md](docs/ROADMAP.md) for the plan for the rest of the game.

## Validation

Automated checks cover dialogue sequencing, battle entry, exhausted parties, trainer rewards, catching into storage, leveling, save/load, type immunities, species data, and map data (everyone stands somewhere walkable, every cave ladder is paired and the whole cave can be reached). Browser checks use the production HTML in headless Chrome; this does not establish performance on a 2017 MacBook Pro or audio quality on physical speakers.

Pixelify Sans and Press Start 2P are bundled under the SIL Open Font License. Notices are in `src/assets/fonts` and embedded in the generated HTML.
