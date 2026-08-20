# MetaverseBB Marseille — Autopilot backlog

ACTIVE_FEATURE: metaverseBB Marseille cyberpunk digital twin  
ACTIVE_SCOPE: `apps/dartchain-frontend/Dart/src/app/core/map/marseille-twin/`  
SPAWN_LANDMARK: Ombrière du Vieux-Port (OSM way/200273945), Quai des Belges  
STYLE: real geometry + cyberpunk overlay (never reshape streets for style)  
DELETION_POLICY: never delete

## Scope classification (audit 2026-08-20)

### EXCLUSIVE_METAVERSEBB (modifiable / créable)

- `apps/dartchain-frontend/Dart/src/app/three-floor/**`
- `apps/dartchain-frontend/Dart/src/app/core/map/marseille-twin/**` (ce dossier)
- Marseille-only map modules consumed by `MarseilleMapProvider` / three-floor
  (`geo-reference.config.ts`, `marseille-map.provider.ts`, `placements/**`,
  `vieux-port-*.ts`, `osm-building.provider.ts`, `geo-coordinate.service.ts`, …)

### SHARED_DEPENDENCY (lecture seule)

- `core/map/map-configuration.ts` — imported by Star Conquest / knowledge-graph
- `CharacterControlService`, `CameraControlService`, `ThreeSceneService`
- `core/utils/three-*.ts`, `perf-profiler.util.ts`
- `MapLoadingService` (also injected by character control)

### OUT_OF_SCOPE

- Star Conquest, particle-background runtime, wallet, backend, routing

## Non-regression baseline (before ITER-001)

- Scene: `app-three-floor` + `MarseilleMapProvider` (`marseille-osm-three`), fallback `legacy-floor`
- Spawn: `METRO_SPAWN_ANCHOR.spawnOffsetFromMirror` (−6.2, 0, −2.4) from mirror (0, 5.6, 0)
- Heading: character Y=0 (faces −Z / north); camera yaw = π (south of avatar); water is +Z
- Scale: `WORLD_METERS_PER_UNIT = 1`, `GEO_REFERENCE_CONFIG.metersPerWorldUnit = 1`
- Axes: east = +X, north = −Z, up = +Y, CRS `marseille-local-v1`
- Floor/collision: harbor water via `isHarborWaterAt`, OSM + prototype colliders, runner world
- Camera/joysticks: OrbitControls + MOVE/VIEW sticks; VIEW dead-zone local to three-floor
- Raycast: placement hit-volumes RDC, HUD `placement-details-panel`
- Visuals: Ombrière gameplay canopy 18.4 × 12.2 m (not 46 × 22), OSM extrusions, neon already in lighting
- Tests: `ng test` (Vitest); build: `ng build`

## Candidate iterations (20+)

| ID | Task | Status |
|---|---|---|
| ITER-001 | Persistent loop docs + baseline | DONE (this file set) |
| ITER-002 | Source-quality vocabulary | DONE |
| ITER-003 | Additive `MarseilleSpawnAnchor` (no runtime move) | DONE |
| ITER-004 | Ombrière 46×22 validation target vs gameplay canopy | DONE |
| ITER-005 | Documented WGS84 → world pipeline constants | DONE |
| ITER-006 | Cyberpunk overlay feature flag (default off) | DONE |
| ITER-007 | OSM ODbL attribution constants | DONE |
| ITER-008 | Building LOD interface (massing, not M4T3R) | DONE |
| ITER-009 | Overlay GPU resource registry | DONE |
| ITER-010 | Marseille scene loading state model | DONE |
| ITER-011 | Exclusive perf governor config | DONE |
| ITER-012 | Cyberpunk overlay factory (dispose-safe) | DONE |
| ITER-013 | Fog / night atmosphere presets | DONE |
| ITER-014 | Building digital-twin domain model | DONE |
| ITER-015 | Raycast-safe building pick metadata | DONE |
| ITER-016 | District / tile strategy types | DONE |
| ITER-017 | Calibration diagnostics (pure, flag off) | DONE |
| ITER-018 | Spawn fallback preservation tests | DONE |
| ITER-019 | Rectangle vs OSM-way footprint compatibility | DONE |
| ITER-020 | Wire overlay into provider behind flag (off) | DONE |
| ITER-021 | Landmark twin catalog from OSM heroes | DONE |
| ITER-022 | shopsEast AABB vs OSM centroid delta (no mesh move) | DONE |
| ITER-023 | South façade edge (+Z) from OSM ring | DONE |
| ITER-024 | Neon signage zones along south edge | DONE |
| ITER-025 | Overlay Three.js layer isolation | DONE |
| ITER-026 | Additive OSM ODbL line on placement panel | DONE |
| ITER-027 | Additive Ombrière/spawn fields on F11 geo debug | DONE |
| ITER-028 | Landmark height quality = APPROXIMATE | DONE |
| ITER-029 | Spawn façade OSM align flag (off) | DONE |
| ITER-030 | Five overlay-only neon bays | DONE |
| ITER-031 | District tile id helper (128 m chunks) | DONE |
| ITER-032 | Holograms on neon bays only if overlay on | DONE |
| ITER-033 | Overlay pick isolation helper | DONE |
| ITER-034 | Arcades west provenance (estimated) | DONE |
| ITER-035 | Vieux-Port water view target (+Z) | DONE |
| ITER-036 | Dual-mesh shopsEast note (no AABB shrink) | DONE |
| ITER-037 | Spawn look-direction doc (camera untouched) | DONE |
| ITER-038 | Overlay raycast no-op | DONE |
| ITER-039 | F11 calibration snapshot fields (flag off) | DONE |
| ITER-040 | Overlay layer const + barrel exports | DONE |

## Blocked (do not execute without stop condition)

- IGN / BD TOPO download → `STOP-EXTERNAL-GEODATA`
- Resizing gameplay Ombrière to 46×22 → `STOP-REGRESSION-RISK` (spawn/collisions)
- Editing `map-configuration.ts` → `STOP-SHARED-DEPENDENCY`
