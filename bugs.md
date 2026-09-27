# Playtest fixes

- Removed the battle-entry remount that started two concurrent battle engines.
- Wait for send-out dialogue before opening battle actions; ignore stale dialogue callbacks.
- Revealing typewriter text no longer lets the next animation frame hide it again.
- Dialogue blocks pointer input to menus behind it.
- Menus cannot open halfway through a walking step; repeated title clicks cannot launch concurrent intros.
- Storage keeps at least one healthy teammate, and battles handle an exhausted party safely.
- Consecutive evolutions mount independently; fainted creatures do not evolve.
- Filled in missing rival creature names in story dialogue.
- Adjusted battle framing and narrow-screen menus; touch controls have reserved space.
- Bundled fonts and their licenses into the standalone HTML.

## Checked

- `npm test`: eight passing gameplay regression checks.
- `npm run build`: TypeScript and single-file production bundle pass.
- Headless Chrome, production HTML: intro and naming, save/continue, professor interception, starter selection, rival battle, rewards, level-up, evolution, wild encounter, capture and mobile menu layouts.
- Battle/progression scenarios used temporary saved-game fixtures and controlled randomness where appropriate.
- No JavaScript errors were recorded during these browser flows. The final bundled fonts make no external asset requests.

Physical mobile touch gestures, speaker output and performance on the target 2017 MacBook Pro still need a hands-on pass. The Arena and northern road remain intentionally closed content.
