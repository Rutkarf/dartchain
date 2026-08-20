# MetaverseBB audit — iteration log

ACTIVE_FEATURE: metaverseBB codebase audit  
ACTIVE_SCOPE: `apps/dartchain-frontend/Dart/src/app/three-floor/`

## ITER-001 — inventory existence

Protected existing behavior: 41 listed elements remain  
New additive capability: tableau existence YES  
Files modified: `metaversebb-scope-map.md`  
Audit insight: 41/41 fichiers trouvés  
Regression risk: none (docs)  
Verification method: glob + grep paths  
Actual result: PASS

## ITER-002 — usage table

Protected existing behavior: no runtime change  
New additive capability: used-by-metaverseBB vs other features  
Files modified: `metaversebb-scope-map.md`  
Audit insight: 0 unused in listed set ; 0 used by DartChain UI  
Regression risk: none  
Verification method: ripgrep class names  
Actual result: PASS

## ITER-003 — functional roles

Protected existing behavior: unchanged  
New additive capability: CRITICAL / SECONDARY / DEBUG  
Files modified: `metaversebb-scope-map.md`  
Audit insight: CharacterNftApiService = SECONDARY stub  
Regression risk: none  
Verification method: read service headers  
Actual result: PASS

## ITER-004 — candidates for removal

Protected existing behavior: no deletions  
New additive capability: `metaversebb-candidates-for-removal.md`  
Files modified: `metaversebb-candidates-for-removal.md`  
Audit insight: CitySceneService + wigle-integration barrel unused (adjacent)  
Regression risk: none  
Verification method: grep imports  
Actual result: PASS — documented only

## ITER-005 — dependency map

Protected existing behavior: unchanged  
New additive capability: arbre textuel host → services  
Files modified: `metaversebb-scope-map.md`  
Audit insight: CharacterControlService = 17 injects hotspot  
Regression risk: none  
Verification method: inject() reads  
Actual result: PASS

## ITER-006 — classification

Protected existing behavior: previous Marseille backlog over-classified core services as SHARED  
New additive capability: usage-based EXCLUSIVE for all 41  
Files modified: `metaversebb-scope-map.md`, `ai-loop-metaversebb-audit-backlog.md`  
Audit insight: `map-configuration.ts` stays SHARED ; MapConfigService is exclusive  
Regression risk: none  
Verification method: files_with_matches  
Actual result: PASS

## ITER-007 — inventory spec

Protected existing behavior: ThreeFloor still creates  
New additive capability: `metaversebb-scope.inventory.ts` + `.spec.ts`  
Files modified: those two files  
Audit insight: 7 selectors + 41 counts frozen  
Regression risk: low (new tests only)  
Verification method: `ng test --include=**/metaversebb-scope.inventory.spec.ts`  
Actual result: PASS (included in ITER-020 run: 10 tests / 3 files)

## ITER-008 — Angular entry point

Protected existing behavior: `app.html` still hosts three-floor  
New additive capability: documented no dedicated route  
Files modified: `metaversebb-scope-map.md`  
Audit insight: single host in app-root  
Regression risk: none  
Verification method: read app.html  
Actual result: PASS

## ITER-009 — CharacterControl hotspot

Protected existing behavior: control service untouched  
New additive capability: documented 17 injects + WalletSession coupling  
Files modified: `metaversebb-scope-map.md`  
Audit insight: STOP-SHARED-DEPENDENCY if wallet API change required  
Regression risk: none  
Verification method: read character-control.service.ts  
Actual result: PASS

## ITER-010 — MarseilleMapProvider hotspot

Protected existing behavior: provider untouched  
New additive capability: listed injects OSM/tokens/debug/wigle  
Files modified: `metaversebb-scope-map.md`  
Audit insight: debug overlays attached inside provider  
Regression risk: none  
Verification method: read marseille-map.provider.ts injects  
Actual result: PASS

## ITER-011 — tokens/trails/rewards graph

Protected existing behavior: M4T3R runtime untouched  
New additive capability: layer TOKENS_REWARDS documented  
Files modified: `metaversebb-scope-map.md`  
Audit insight: all M4t3r* used via CharacterControl and/or Marseille provider  
Regression risk: none  
Verification method: grep  
Actual result: PASS

## ITER-012 — WiGLE graph

Protected existing behavior: network overlay untouched  
New additive capability: Wigle* usage table  
Files modified: `metaversebb-scope-map.md`, candidates  
Audit insight: visualization is live ; integration barrel is dead  
Regression risk: none  
Verification method: grep  
Actual result: PASS

## ITER-013 — placements graph

Protected existing behavior: panel + facade untouched  
New additive capability: PlacementFacade → API + AnchorLayer → MapLoading  
Files modified: `metaversebb-scope-map.md`  
Audit insight: exclusive placement stack  
Regression risk: none  
Verification method: grep  
Actual result: PASS

## ITER-014 — exclusive deps outside list

Protected existing behavior: marseille-twin untouched  
New additive capability: §6 missing modules  
Files modified: `metaversebb-scope-map.md`  
Audit insight: WigleDebugOverlay, character-assets, joystick input not in original list  
Regression risk: none  
Verification method: directory listing  
Actual result: PASS

## ITER-015 — layer proposal

Protected existing behavior: no file moves  
New additive capability: scene/character/map/placement/tokens/network/debug  
Files modified: `metaversebb-scope-map.md`  
Audit insight: folders already mixed under core/map  
Regression risk: none (docs only)  
Verification method: n/a  
Actual result: PASS

## ITER-016 — scripts

Protected existing behavior: package.json untouched  
New additive capability: documented `ng test` / `ng build`  
Files modified: `ai-loop-metaversebb-audit-backlog.md`  
Audit insight: no metaverseBB-specific npm script  
Regression risk: none  
Verification method: read package.json  
Actual result: PASS

## ITER-017 — non-regression baseline

Protected existing behavior: spawn/joysticks/providers  
New additive capability: §9 baseline  
Files modified: `metaversebb-scope-map.md`  
Audit insight: matches Marseille twin baseline  
Regression risk: none  
Verification method: cross-read ai-loop-marseille-backlog.md  
Actual result: PASS

## ITER-018 — correct prior SHARED classification

Protected existing behavior: services not edited  
New additive capability: usage-based exclusive for ThreeScene/CharacterControl/Camera/MapLoading  
Files modified: `ai-loop-metaversebb-audit-backlog.md`  
Audit insight: location under `core/services` ≠ shared usage  
Regression risk: none  
Verification method: files_with_matches  
Actual result: PASS

## ITER-019 — architecture insights

Protected existing behavior: unchanged  
New additive capability: strengths / risks / hotspots  
Files modified: `metaversebb-scope-map.md`  
Audit insight: adapter Auth/Wallet recommended, not implemented (shared)  
Regression risk: none  
Verification method: n/a  
Actual result: PASS

## ITER-020 — freeze + verify

Protected existing behavior: three-floor.spec still green  
New additive capability: inventory constants + test catalog §8  
Files modified: `metaversebb-scope.inventory.ts`, `*.spec.ts`, `metaversebb-scope-map.md`  
Audit insight: listed unused count = 0  
Regression risk: low  
Verification method: targeted ng test  
Actual result: PASS — 3 files, 10 tests (`metaversebb-scope.inventory`, `three-floor`, `placement-details-panel`)
