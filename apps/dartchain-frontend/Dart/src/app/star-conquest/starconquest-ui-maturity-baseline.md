# StarConquest UI maturity — non-regression baseline

Recorded: 2026-08-20. Target viewport: **250 × 550 CSS px** portrait.

## Identity

Neuronal particle quest graph behind the DartChain shell. Not a combat sim. Exclusive host: `app-particle-background`.

## Protected behaviors (must survive every iteration)

1. 35 interactive quests, 5 families, connections, rarity, M4T3R preview.
2. Tap/click a particle → panel near the star; claim / live CTA / locked / future.
3. Live links navigate Dock/auth without replacing claim.
4. Scanner lists off-screen quests; pick focuses the quest.
5. Reward labels follow projected particles; dim when occluded.
6. Keyboard WASD/arrows pan; Escape dismisses help → scanner → panel.
7. Progress `star-conquest-progress-v1` (preview, not on-chain).
8. Universe theme: Ruche (`agent-swarm`) only. Theme `coreOpacity > 0.9` stays in config.
9. Stick pan **contract** (`setStick` / `endStick` / keyboard) remains.
10. Floor MOVE/VIEW joysticks are MetaVerseBB — out of scope.

## Current visual (pre-maturity)

- Rest glow is high: graph tick uses `coreOpacity + 0.12`, halo `+ 0.18`, bloom `0.22 + halo*0.4`.
- Agent-swarm: orbital rings + synaptic pulse + motes; mandala orbit of quests.
- Nebula: rectangular aurora plane + far/mid/near quest echoes.
- Pan UI: 44px HTML pan-stick overlay (to be hidden, not deleted).

## Interactions (click/tap)

| Surface | Action |
|---|---|
| Canvas particle | pick → panel |
| Empty canvas | clear selection (and, after maturity, drag = orbit pan) |
| Panel CTA | claim or live navigate |
| Panel close / Escape | dismiss |
| Scanner item / reward label | select quest |
| Keyboard | pan + Escape |
| Pan-stick overlay | pan while held (contract kept; overlay hidden when `canvasOrbit`) |

## Tests

`ng test --no-watch --include='**/star-conquest*.spec.ts' --include='**/star-quest-*.spec.ts' --include='**/particle-background.spec.ts'`
