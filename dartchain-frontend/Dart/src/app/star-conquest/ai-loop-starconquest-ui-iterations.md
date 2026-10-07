# StarConquest UI maturity iteration log

Append only. Start: 2026-08-20 ~22:54 UTC+2.

## SC-UI-001 — Inventory + baseline

- Protected existing behavior: pick/claim/live/scanner/keyboard/stick contract, 35 quests, Ruche theme.
- New additive capability: `starconquest-ui-maturity-baseline.md`, backlog, highlight notes.
- Files modified: none (docs created).
- Visual effect: none.
- Regression risk: none.
- Verification method: files exist.
- Actual result: DONE.

## SC-UI-002 — Rest / hive / galaxy / orbit config

- Protected: universe `coreOpacity > 0.9` still in theme config.
- New: `star-conquest-ui-maturity.config.ts`.
- Files: created config.
- Visual: none until wired.
- Verification: unit tests on restMul < 1 and galaxy radius.
- Actual result: DONE.

## SC-UI-003 — Visual-state matrix

- Protected: quest statuses unchanged.
- New: `star-conquest-visual-state.ts`.
- Verification: idle vertex < selected; locked maps to locked.
- Actual result: DONE.

## SC-UI-004 — Hive cell layout

- New: `star-conquest-hive.layout.ts` (5 cells, hex points).
- Protected: layout homes of quests not moved.
- Actual result: DONE.

## SC-UI-005 — Canvas orbit helpers

- New: `star-conquest-orbit.ts`.
- Protected: tap threshold 7 px.
- Actual result: DONE.

## SC-UI-006 / SC-UI-007 — Rest glow + vertex states in graph

- Protected: focus pulse still brighter than rest; theme values unchanged.
- Files: `star-conquest-graph.ts`.
- Visual: repos calme, sélection lisible.
- Actual result: DONE.

## SC-UI-008 / SC-UI-009 / SC-UI-010 — Hive cells, galaxy bowl, nebula depth

- Files: `star-conquest-effects.ts`, `star-conquest-background.ts`, aurora shader, `star-conquest-depth.ts`.
- Visual: circular aurora, far/mid/near contrast, hive hexes, containment of echoes.
- Actual result: DONE.

## SC-UI-011 / SC-UI-012 / SC-UI-013 — Orbit pan + hide stick overlay

- Protected: stick contract, keyboard pan, tap-to-pick.
- New: `StarConquestWorld.panByDelta`, canvas drag on host, pan-stick hidden when `canvasOrbit`.
- Files: `star-conquest-world.ts`, `particle-background.ts`, `star-conquest-features.ts`, `star-conquest-pan-stick.ts`.
- Actual result: DONE.

## SC-UI-014 / SC-UI-015 / SC-UI-018 — Panel/scanner 250×550

- Files: panel/scanner CSS, overlay tokens (panelH 148, scanner 156).
- Visual: less chrome glow, 32px touch, internal scroll.
- Actual result: DONE.

## SC-UI-016 / SC-UI-017 — Mobile quality + depth diagnostics

- Files: maturity config, `star-conquest-depth-diagnostics.ts`.
- Actual result: DONE.

## SC-UI-019 — Tests

- Files: `star-conquest-product.spec.ts`, `star-conquest.spec.ts`.
- Verification method: `ng test --no-watch --coverage=false --include='**/star-conquest*.spec.ts' --include='**/star-quest-*.spec.ts' --include='**/particle-background.spec.ts'`.
- Actual result: **6 files, 82 tests passed**.

## SC-UI-020 — Docs

- Files: `starconquest-controls.md`, `starconquest-ui-highlight-layout.md`.
- Actual result: DONE.
