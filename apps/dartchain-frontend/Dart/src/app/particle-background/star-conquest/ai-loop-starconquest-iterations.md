# StarConquest iteration log

Append only. Start: 2026-08-20 ~17:26 UTC+2.

## SC-ITER-001 — Inventory current StarConquest boundaries

- Protected existing behavior: entire quest graph, overlays, progress, pan world, pick/claim.
- New additive capability: written baseline, backlog, quality notes, classification.
- Files modified: none (docs created).
- Files created: `starconquest-non-regression-baseline.md`, `ai-loop-starconquest-backlog.md`, `ai-loop-starconquest-iterations.md`, `starconquest-product-quality-notes.md`.
- User-facing effect: none.
- Gameplay risk: none.
- Performance risk: none.
- Verification method: files exist; no gameplay code changed.
- Actual result: DONE.

## SC-ITER-002 — Typed normalized stick / pan input

- Protected: world.setStick still accepts raw −1…1; pick/claim unchanged.
- New: `star-conquest-input.ts` (dead-zone, diagonal clamp, axis helper).
- Files created: `star-conquest-input.ts`
- User-facing effect: none until wired.
- Gameplay/performance risk: none.
- Verification: unit tests in `star-conquest-product.spec.ts`.
- Actual result: DONE.

## SC-ITER-003 — Isolate control configuration

- Protected: dead-zone 0.04, tap threshold 7, recenter-on-release true.
- New: `star-conquest-controls.config.ts`
- Verification: tests assert historical defaults.
- Actual result: DONE.

## SC-ITER-004 — Wire world pan to config

- Protected: pan speed still `STAR_CONQUEST_SCALE.panSpeed`; stick axes identical via `applyAxisDeadzone`.
- Files modified: `star-conquest-world.ts`
- Verification: existing world tests + product tests (79 passed including host).
- Actual result: DONE.

## SC-ITER-005 — Reduced-motion helper

- New: `star-conquest-motion.ts`
- Verification: query matches true/false.
- Actual result: DONE.

## SC-ITER-006 — Diagnostics adapter

- New: `star-conquest-diagnostics.ts` (cap 48, no network).
- Wired: scanner open, pan-stick start/end, reset-view, pointer-cancel, webgl-lost.
- Actual result: DONE.

## SC-ITER-007 — Local feature flags

- New: `star-conquest-features.ts` — all default true (nothing hidden).
- Actual result: DONE.

## SC-ITER-008 — Selection snapshot model

- New: `star-conquest-selection.ts`
- Protected: panel view-model unchanged.
- Actual result: DONE.

## SC-ITER-009 — Accessible live region on quest panel

- Files modified: `star-quest-panel.html`, `star-quest-panel.css`
- New: `aria-live` line (status + CTA). Existing dialog remains.
- Verification: panel unit tests still pass.
- Actual result: DONE.

## SC-ITER-010 — Compact HUD chip

- Files modified: scanner html/css/ts
- New: 250×550 status bar (title, claimed count, help, recenter).
- Placed at top: 34px to clear navbar budget.
- Actual result: DONE.

## SC-ITER-011 — Help overlay

- New: help dialog in scanner template; state `helpOpen` / `toggleHelp`.
- Escape closes help first, then scanner.
- Actual result: DONE.

## SC-ITER-012 — Resource disposer registry

- New: `star-conquest-disposer.ts` (additive; existing graph/world dispose untouched).
- Actual result: DONE.

## SC-ITER-013 — Viewport overflow helpers

- New: `star-conquest-viewport-fit.ts` wrapping overlay box.
- Verification: 148×136 and 176×148 fit 250×550.
- Actual result: DONE.

## SC-ITER-014 — Keyboard pan intent

- New: `star-conquest-keyboard.ts`; host listens WASD/arrows (skips inputs).
- Protected: Escape still dismisses selection; floor joysticks untouched.
- Actual result: DONE.

## SC-ITER-015 — Loading / error overlay model

- New: `star-conquest-runtime-overlay.ts`; state `runtimePhase` / `runtimeMessage`.
- WebGL context lost sets error overlay (does not remove canvas).
- Actual result: DONE.

## SC-ITER-016 — Bottom-sheet state model

- New: `star-conquest-sheet.ts`; state `sheetKind` used by help.
- Actual result: DONE.

## SC-ITER-017 — Pointer tap vs drag + cancel helpers

- New: `star-conquest-pointer-safety.ts`; pan-stick uses threshold 7 (historical drag threshold).
- Actual result: DONE.

## SC-ITER-018 — Camera reset + cancel / blur safety

- Facade: additive `resetView$` / `resetView()`.
- Host: pointercancel, blur, visibility hidden → `endStick` + `releaseStick(false)` (no forced recenter during cancel).
- Destroy: `endStick` before clear.
- Actual result: DONE.

## SC-ITER-019 — Perf snapshot + pan-stick overlay

- New: `star-conquest-perf.ts` (budget description, no invented FPS).
- New: `star-conquest-pan-stick.ts` HTML overlay 44×44 above floor chrome; hidden when scanner/help open.
- Distinct from floor MOVE/VIEW.
- Actual result: DONE.

## SC-ITER-020 — Reduced-motion CSS + controls docs

- Panel/scanner: `prefers-reduced-motion` disables enter animation and label pulse.
- New: `starconquest-controls.md`
- Verification: `ng test --no-watch --include='**/star-conquest*.spec.ts' --include='**/star-quest-*.spec.ts' --include='**/particle-background.spec.ts'` → **6 files, 79 tests passed**.
- Actual result: DONE.
