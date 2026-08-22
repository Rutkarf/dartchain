# StarConquest UI maturity backlog

Scope: `app-particle-background`, `StarConquestGraph`, `app-star-quest-panel`, `app-star-quest-scanner` and exclusive StarConquest files only.

Viewport: **250 × 550** portrait. Status: TODO | IN_PROGRESS | DONE | SKIPPED_NO_SAFE_ADDITIVE_PATH

| ID | Status | Task |
|---|---|---|
| SC-UI-001 | DONE | Inventory effects + non-regression UI baseline |
| SC-UI-002 | DONE | Isolate rest-glow / hive / galaxy / orbit configuration |
| SC-UI-003 | DONE | Quest visual-state matrix (idle, hover, selected, locked, completed, future) |
| SC-UI-004 | DONE | Hive cell layout (5 family pentagon + hex cells) |
| SC-UI-005 | DONE | Canvas orbit/drag helpers (tap vs pan) |
| SC-UI-006 | DONE | Apply rest-glow profile in graph (theme values unchanged) |
| SC-UI-007 | DONE | Apply visual-state multipliers to quest vertex colors |
| SC-UI-008 | DONE | Hive hex cells in effects (Ruche) |
| SC-UI-009 | DONE | Galaxy bowl: circular aurora containment |
| SC-UI-010 | DONE | Depth layer contrast + parallax on nebula echoes |
| SC-UI-011 | DONE | World pan-by-delta (orbit stays on release) |
| SC-UI-012 | DONE | Canvas drag/orbit on particle-background host |
| SC-UI-013 | DONE | Hide pan-stick overlay when canvas orbit is on (component kept) |
| SC-UI-014 | DONE | Panel compact layout 250×550 (touch 32px, no overflow) |
| SC-UI-015 | DONE | Scanner / labels rest glow + 250×550 list |
| SC-UI-016 | DONE | Mobile quality profile for rest effects |
| SC-UI-017 | DONE | Depth diagnostics (dev-only, no HUD) |
| SC-UI-018 | DONE | Overlay-fit / layout tokens for calmed chrome |
| SC-UI-019 | DONE | Tests for maturity modules |
| SC-UI-020 | DONE | Highlight + layout + controls documentation |

Decorative overlay hide (not a feature deletion):

```text
Element: app-star-conquest-pan-stick visual overlay
Reason for removal: joystick actions move to canvas drag/orbit; overlay occupied 44px on 250×550
Impact on UX: pan/keyboard/reset remain; stick contract unchanged
Impact on performance: one fewer pointer target on the floor chrome
Alternative considered: keep overlay beside canvas drag (rejected — duplicate control)
```
