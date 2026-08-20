# StarConquest product quality notes

## Classification (2026-08-20)

### EXCLUSIVE_STARCONQUEST

- `particle-background/star-conquest/**`
- `core/services/star-conquest.facade.ts`
- `core/services/star-conquest-state.service.ts`
- `core/services/star-conquest-progress.service.ts`
- `core/services/star-conquest-universe.service.ts`
- `core/services/star-joystick-bridge.service.ts` (SC-only, currently unused register)
- `particle-background/particle-background.ts|css|html|spec.ts` — SC WebGL host (mounted by app shell, used only as neuronal sky)

### SHARED_DEPENDENCY (analyze only)

- `app.ts`, `app.html`, `app.css` (mounts SC, global z-index)
- `ProductConfigService`, `environment.*`
- `core/utils/three-webgl.util.ts`, `three-animation.util.ts`, `three-container.util.ts`
- `particle-background/knowledge-graph/**`
- Dock / auth / quests-panel (live CTA targets)
- `viewport-compact.ts`

### OUT_OF_SCOPE

- `three-floor/**` including MOVE/VIEW joysticks (MetaVerseBB)
- Wallet, faucet, blockchain API, CI, package.json, backend

## Product gaps (safe to add)

1. Stick pan overlay is hidden while `canvasOrbit` is on (contract kept).
2. HorizonJoystick still not mounted (Three.js object).
3. Help overlay chrome is state-ready but not a full HUD (`overlayHud` off).

## 250×550

Overlays use `STAR_CONQUEST_OVERLAY` (panel 148, scanner 176, floor chrome 86). Must keep HUD/help/pan-stick inside the same box.
