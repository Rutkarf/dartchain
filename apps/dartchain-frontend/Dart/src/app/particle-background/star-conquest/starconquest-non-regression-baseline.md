# StarConquest non-regression baseline

Recorded: 2026-08-20. Viewport product: 250×550 CSS px (portrait). Desktop compatibility: same overlay tokens, world pan still works on larger windows.

## Identity

Star Conquest is a **neuronal particle quest graph** (Three.js) behind the DartChain shell. It is **not** a planet/ship/fleet combat sim. There are no units, navmesh, OrbitControls, PointerLock, or battle rules in this folder.

## Exclusive runtime

- Scene host: `app-particle-background` (one WebGL canvas, `data-star-conquest=canvas`).
- World pan: `StarConquestWorld` (camera X/Y only, fixed Z).
- Graph: `StarConquestGraph` (35 mock quests, filaments, aurora, depth layers, network peers as visual orbits).
- HUD: `app-star-quest-panel`, `app-star-quest-scanner` (labels + hidden-quest list).
- State: `StarConquestStateService`, `StarConquestProgressService` (localStorage preview, not faucet).
- Facade: `StarConquestFacade` (select/hover/dismiss/progress/universe).
- HorizonJoystick (`StarConquestJoystick`) exists as a Three.js control; **not currently instantiated** in the scene. Stick signals exist on state (`setStick` / `endStick`) and are consumed by the world when `worldNavigating` is true.

## Gameplay flows to preserve

1. Catalog of 35 interactive quests (5 families) with connections, rarity, rewards M4T3R.
2. Pick a particle → panel near the star, compact on 250×550, claim / live CTA / locked / future.
3. Live links navigate Dock/auth without replacing claim.
4. Scanner lists off-screen quests; pick focuses the quest.
5. Reward labels follow projected particles; dim when occluded/near edge.
6. Stick pan (when navigating) moves camera; release recenters by default.
7. Escape dismisses panel/scanner.
8. Progress persisted under `star-conquest-progress-v1` (preview, not on-chain).
9. Universe theme: Ruche (`agent-swarm`) only.
10. Ping-pong outer world larger than 250×550; overlays stay inside the design viewport.

## Controls (actual)

- Pointer on SC canvas: hover (mouse), tap/click pick, no pointer-lock.
- Keyboard: Escape clears selection.
- Floor MOVE/VIEW joysticks belong to `app-three-floor` (MetaVerseBB) — **out of scope**.
- SC pan stick is a state contract, not yet an on-screen exclusive overlay.

## Visuals to preserve

Obsidian neural sky, family colors, filaments, aurora wisps, depth stars, under-floor / under-graph roots, product scale palier (`visual` 2.74), overlay box 148/176 px.

## Shared (do not modify in this loop)

`app.ts` / `app.html` / `app.css`, `ProductConfigService` / `environment.*`, `three-webgl.util`, `three-animation.util`, `three-container.util`, `knowledge-graph/**`, `three-floor/**`, Dock/auth/wallet, viewport-compact, design tokens, package.json.

## Tests

`star-conquest.spec.ts`, panel/scanner/view specs. Command: `ng test --no-watch --include='**/star-conquest*.spec.ts' --include='**/star-quest-*.spec.ts'`.
