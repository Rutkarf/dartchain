# MetaverseBB Marseille — iteration log

Append-only. Never overwrite prior entries.

## ITER-001 — Persistent loop documentation

- Date: 2026-08-20
- Protected existing behavior: all runtime code unchanged
- New additive capability: backlog, provenance, coordinate-system and this log
- Files: `ai-loop-marseille-backlog.md`, `ai-loop-marseille-iterations.md`, `marseille-data-provenance.md`, `marseille-coordinate-system.md`
- Accuracy/source status: documentation of existing `marseille-local-v1` only
- Regression risk: none (markdown)
- Verification: files created under exclusive `marseille-twin/`
- Result: PASS

## ITER-002 — Source-quality vocabulary

- Protected: no runtime presentation change
- New: `GeoSourceQuality` + `mayPresentAsRealGeometry`
- Files: `source-quality.ts` + spec
- Source status: policy only
- Verification: spec PASS
- Result: PASS

## ITER-003 — Additive MarseilleSpawnAnchor

- Protected: `METRO_SPAWN_ANCHOR` runtime, `applyAtRuntime: false`
- New: documented spawn at (−6.2, 0, −2.4), heading 0
- Files: `marseille-spawn-anchor.ts` + spec
- Source: PROJECTED OSM origin
- Verification: spec PASS
- Result: PASS

## ITER-004 — Ombrière 46×22 vs gameplay 18.4×12.2

- Protected: `MIRROR_CANOPY` 18.4×12.2 unchanged
- New: published target + geometric deviation record
- Source: APPROXIMATE target, PLACEHOLDER gameplay mesh
- Verification: spec PASS
- Result: PASS

## ITER-005 — Coordinate pipeline constants

- Protected: `GeoCoordinateService` math
- New: `MARSEILLE_COORDINATE_PIPELINE` (1 unit = 1 m, +X east, −Z north)
- Verification: spec PASS
- Result: PASS

## ITER-006 — Cyberpunk overlay flag

- Protected: current lighting/meshes
- New: `MARSEILLE_CYBERPUNK_OVERLAY.enabled = false`
- Verification: spec PASS
- Result: PASS

## ITER-007 — OSM ODbL attribution constant

- Protected: HUD copy
- New: `OSM_ODBL_ATTRIBUTION` (no Ville/IGN claim)
- Verification: spec PASS
- Result: PASS

## ITER-008 — Building LOD interface

- Protected: M4T3R LOD
- New: `buildingLodAtDistance` for massing
- Verification: spec PASS
- Result: PASS

## ITER-009 — Overlay resource registry

- Protected: existing provider dispose lists
- New: `OverlayResourceRegistry`
- Verification: spec PASS
- Result: PASS

## ITER-010 — Scene loading state model

- Protected: `MapLoadingService` states
- New: `MarseilleSceneState` additive
- Verification: spec PASS
- Result: PASS

## ITER-011 — Perf governor config

- Protected: renderer DPR path
- New: `enforceDprCap: false`
- Verification: spec PASS
- Result: PASS

## ITER-012 — Overlay factory

- Protected: building meshes
- New: empty group when off; sample hologram when on + dispose
- Verification: spec PASS
- Result: PASS

## ITER-013 — Atmosphere presets

- Protected: current fog/lights
- New: `currentGameplay` active; `nightHarbor` unused
- Verification: spec PASS
- Result: PASS

## ITER-014 — Building twin domain model

- Protected: Three meshes
- New: identity vs footprint vs overlay fields
- Verification: spec PASS
- Result: PASS

## ITER-015 — Raycast pick metadata

- Protected: placement hit-volumes
- New: overlay does not block gameplay raycast
- Verification: spec PASS
- Result: PASS

## ITER-016 — District / tile strategy

- Protected: 128 m chunks, maxLoadedChunks
- New: `expandBeyondCore: false`
- Verification: spec PASS
- Result: PASS

## ITER-017 — Calibration diagnostics

- Protected: no debug HUD change
- New: snapshot helper, `CALIBRATION_DIAGNOSTICS_ENABLED = false`
- Verification: spec PASS
- Result: PASS

## ITER-018 — Spawn fallback tests

- Protected: metro spawn offsets and heading
- New: tests binding twin anchor to existing spawn
- Verification: spec PASS
- Result: PASS

## ITER-019 — Footprint compatibility

- Protected: OSM way rings from GEO-WAY-1
- New: classifier rectangle vs way-ring
- Verification: spec PASS
- Result: PASS

## ITER-020 — Wire overlay into provider (flag off)

- Protected: scene visuals (no overlay meshes attached)
- New: `attachCyberpunkOverlayLayer()` + dispose hook
- Files: `marseille-map.provider.ts` (additive), `provider-overlay-wire.spec.ts`
- Verification: 20 spec files / 32 tests PASS (twin + canopy)
- Result: PASS

## ITER-021 — Landmark twin catalog

- Protected: OSM landmark meshes
- New: `createLandmarkTwinCatalog()` identity records (variant `none`)
- Source: PROJECTED footprints, APPROXIMATE heights
- Verification: spec PASS
- Result: PASS

## ITER-022 — shopsEast OSM centroid delta

- Protected: `VIEUX_PORT_SPAWN_FACADES.shopsEast` 26×18 AABB
- New: `shopsEastOsmDeltaMeters()` measurement only
- Verification: spec PASS
- Result: PASS

## ITER-023 — South façade edge (+Z)

- Protected: landmark 02 ring
- New: `southFacadeEdgeFromFootprint`
- Verification: spec PASS
- Result: PASS

## ITER-024 — Neon signage zones

- Protected: no mesh until overlay on
- New: 5 overlay-only PROJECTED bays on south edge of way/67704902
- Verification: spec PASS
- Result: PASS

## ITER-025 — Overlay layer isolation

- Protected: camera layer 0 / placement picks
- New: `MARSEILLE_OVERLAY_LAYER = 1`
- Verification: spec PASS
- Result: PASS

## ITER-026 — Placement panel ODbL line

- Protected: existing panel copy/CTA
- New: additive OSM attribution under the fiche
- Files: `placement-details-panel` html/ts/css + spec
- Verification: spec PASS
- Result: PASS

## ITER-027 — F11 calibration fields

- Protected: existing geo debug lines
- New: ombrière delta + `spawnApplyAtRuntime` (still false)
- Files: `marseille-geo-debug.service.ts` (additive)
- Verification: spec PASS
- Result: PASS

## ITER-028 — Landmark height quality

- Protected: runtime heights 20/24/18/22
- New: `LANDMARK_HEIGHT_QUALITY` all APPROXIMATE
- Verification: spec PASS
- Result: PASS

## ITER-029 — Spawn façade OSM align flag

- Protected: decorative shop row position
- New: `SPAWN_FACADE_OSM_ALIGN.enabled = false`
- Verification: spec PASS
- Result: PASS

## ITER-030 — Five neon bays

- Protected: no runtime mesh while overlay off
- New: `neon-bay-1` … `neon-bay-5`
- Verification: spec PASS
- Result: PASS

## ITER-031 — District tile ids

- Protected: 128 m chunks, `expandBeyondCore: false`
- New: `districtTileId`
- Verification: spec PASS
- Result: PASS

## ITER-032 — Holograms on neon bays (flag on only)

- Protected: live scene (flag off → 0 children)
- New: factory places holograms on OSM bays when enabled=true
- Verification: spec PASS
- Result: PASS

## ITER-033 — Overlay pick guard

- Protected: RDC placement hit-volumes
- New: `overlayPickIsIsolated()`
- Verification: spec PASS
- Result: PASS

## ITER-034 — Arcades west provenance

- Protected: arcade 38×16 AABB
- New: `ARCADES_WEST_PROVENANCE` estimated, not an OSM way ring
- Verification: spec PASS
- Result: PASS

## ITER-035 — Vieux-Port view target

- Protected: heading 0 / water +Z
- New: `VIEUX_PORT_VIEW_TARGET`
- Verification: spec PASS
- Result: PASS

## ITER-036 — Dual-mesh shopsEast note

- Protected: AABB shop row volume
- New: `SPAWN_FACADE_DUAL_MESH.resolveByShrinkingAabb = false`
- Verification: spec PASS
- Result: PASS

## ITER-037 — Spawn look-direction doc

- Protected: CameraControlService
- New: `SPAWN_LOOK_DIRECTION` (`applyAtRuntime: false`, yaw π)
- Verification: spec PASS
- Result: PASS

## ITER-038 — Overlay raycast no-op

- Protected: placement raycasts
- New: overlay group/meshes `raycast = () => undefined`
- Verification: spec PASS
- Result: PASS

## ITER-039 — Calibration snapshot for F11

- Protected: `CALIBRATION_DIAGNOSTICS_ENABLED = false`
- New: snapshot consumed by geo debug panel
- Verification: spec PASS
- Result: PASS

## ITER-040 — Barrel + overlay layer const

- Protected: existing twin public API
- New: exports for 021–039 + `MARSEILLE_OVERLAY_LAYER`
- Verification: twin specs PASS
- Result: PASS

