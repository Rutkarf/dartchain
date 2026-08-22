# MetaverseBB — scope map

ACTIVE_FEATURE: metaverseBB codebase audit  
ACTIVE_SCOPE: `apps/dartchain-frontend/Dart/src/app/metaverse/`  
AUDIT_DATE: 2026-08-20  
LISTED_ELEMENTS: 41 (7 components + 34 services)  
DELETION_POLICY: never delete

Point d’entrée Angular : `app-root` (`app.ts` / `app.html`) monte `<app-three-floor>` — c’est le seul host. Pas de route dédiée.

## 1. Inventory

Préfixe des chemins : `apps/dartchain-frontend/Dart/src/app/`

| Element name | Type | File path | Exists | Primary role |
|---|---|---|---|---|
| app-three-floor | Component | `metaverse/three-floor.ts` | YES | Host WebGL, renderer, rAF |
| app-character | Component | `metaverse/character/character.component.ts` | YES | Bootstrap avatar CharacterAnon |
| app-city-scene | Component | `metaverse/city-scene/city-scene.component.ts` | YES | Charge Marseille / legacy |
| app-joystick-move | Component | `metaverse/input/joystick-move/joystick-move.component.ts` | YES | Stick MOVE bas-gauche |
| app-joystick-view | Component | `metaverse/input/joystick-view/joystick-view.component.ts` | YES | Stick VIEW bas-droite |
| app-virtual-joystick | Component | `metaverse/input/joystick-shared/virtual-joystick.component.ts` | YES | Stick partagé MOVE/VIEW |
| app-placement-details-panel | Component | `metaverse/placement-details-panel/placement-details-panel.ts` | YES | HUD emplacement RDC |
| ThreeSceneService | Service | `core/services/three-scene.service.ts` | YES | Registre scene/camera/renderer |
| CharacterControlService | Service | `core/services/character-control.service.ts` | YES | Move, collisions, tokens, clavier |
| CameraControlService | Service | `core/services/camera-control.service.ts` | YES | Caméra 3ᵉ personne / orbit |
| CharacterNftService | Service | `core/services/character-nft.service.ts` | YES | Mesh FBX/STL + anim |
| CharacterNftApiService | Service | `core/services/character-nft-api.service.ts` | YES | HTTP stub user ↔ mesh |
| RunnerWorldService | Service | `core/services/runner/runner-world.service.ts` | YES | Monde runner / colliders |
| RunnerStateService | Service | `core/services/runner/runner-state.service.ts` | YES | Progress runner |
| MapLoadingService | Service | `core/map/map-loading.service.ts` | YES | Provider + fallback legacy |
| MapConfigService | Service | `core/map/map-config.service.ts` | YES | Config carte depuis environment |
| MarseilleMapProvider | Service | `core/map/marseille-map.provider.ts` | YES | Ville OSM Vieux-Port |
| LegacyFloorMapProvider | Service | `core/map/legacy-floor-map.provider.ts` | YES | Floor fallback |
| OSMBuildingProvider | Service | `core/map/osm-building.provider.ts` | YES | Extrusions bâtiments OSM |
| GeoCoordinateService | Service | `core/map/geo-coordinate.service.ts` | YES | WGS84 → monde Three |
| LocalOriginService | Service | `core/map/local-origin.service.ts` | YES | Origine locale Marseille |
| WorldStreamingManager | Service | `core/map/world-streaming.manager.ts` | YES | Streaming chunks |
| MarseilleGeoDebugService | Service | `core/map/marseille-geo-debug.service.ts` | YES | Overlay F11 geo |
| PlacementFacade | Service | `core/map/placements/placement.facade.ts` | YES | Sélection / inquiry placements |
| PlacementAnchorLayer | Service | `core/map/placements/placement-anchor.layer.ts` | YES | Hit-volumes RDC Three.js |
| PlacementApiRepository | Service | `core/map/placements/placement-api.repository.ts` | YES | HTTP placements |
| WigleVisualizationService | Service | `core/map/wigle/wigle-visualization.service.ts` | YES | Overlay réseau WiGLE |
| WigleBuildingRegistryService | Service | `core/map/wigle/wigle-building-registry.service.ts` | YES | Registry bâtiments réseau |
| WigleApiService | Service | `core/map/wigle/wigle-api.service.ts` | YES | HTTP WiGLE |
| WigleGeoService | Service | `core/map/wigle/wigle-geo.service.ts` | YES | Points geo WiGLE |
| GeoMappingService | Service | `core/map/wigle/geo-mapping.service.ts` | YES | Mapping observations → bâtiments |
| TokenCellService | Service | `core/map/token-cell.service.ts` | YES | Champ M4T3R au sol |
| FootprintTrailManager | Service | `core/map/footprint-trail-manager.service.ts` | YES | Traces au sol |
| M4t3rPickupFxService | Service | `core/map/m4t3r-pickup-fx.service.ts` | YES | FX ramassage |
| M4t3rCoinPickupFxService | Service | `core/map/m4t3r-coin-pickup-fx.service.ts` | YES | FX pièces |
| M4t3rPickupFxOrchestratorService | Service | `core/map/m4t3r-pickup-fx-orchestrator.service.ts` | YES | Orchestre FX pickup |
| M4t3rCollectTrailVisualService | Service | `core/map/m4t3r-collect-trail-visual.service.ts` | YES | Visuel trail collect |
| M4t3rRewardRuntimeService | Service | `core/map/m4t3r-reward-runtime.service.ts` | YES | Runtime rewards sol |
| M4t3rRewardApiService | Service | `core/map/m4t3r-reward-api.service.ts` | YES | HTTP rewards |
| M4t3rTrailApiService | Service | `core/map/m4t3r-trail-api.service.ts` | YES | HTTP trail collect |
| M4t3rDebugOverlay | Service | `core/map/m4t3r-debug-overlay.ts` | YES | Overlay F9 stats M4T3R |

## 2. Usage

Critère « other features » : import hors `metaverse/**`, `core/map/**`, `metaverse/services/**`.

| Element name | Used by metaverseBB | Used by other features | Unused | Notes |
|---|---|---|---|---|
| app-three-floor | YES | NO | NO | Monté seulement par `app.ts` |
| app-character | YES | NO | NO | Enfant ThreeFloor |
| app-city-scene | YES | NO | NO | Enfant ThreeFloor |
| app-joystick-move | YES | NO | NO | Enfant ThreeFloor |
| app-joystick-view | YES | NO | NO | Enfant ThreeFloor |
| app-virtual-joystick | YES | NO | NO | Enfants MOVE + VIEW |
| app-placement-details-panel | YES | NO | NO | Enfant ThreeFloor |
| ThreeSceneService | YES | NO | NO | Floor + placements + wigle |
| CharacterControlService | YES | NO | NO | Injecte `WalletSessionService` (sortant DartChain) |
| CameraControlService | YES | NO | NO | Floor + character-control |
| CharacterNftService | YES | NO | NO | Character + camera + control |
| CharacterNftApiService | YES | NO | NO | Seulement `app-character` |
| RunnerWorldService | YES | NO | NO | Control + legacy provider |
| RunnerStateService | YES | NO | NO | Seulement character-control |
| MapLoadingService | YES | NO | NO | city-scene + character-control |
| MapConfigService | YES | NO | NO | Exclusive ; le *fichier* `map-configuration.ts` est SHARED |
| MarseilleMapProvider | YES | NO | NO | Via MapLoadingService |
| LegacyFloorMapProvider | YES | NO | NO | Fallback |
| OSMBuildingProvider | YES | NO | NO | Marseille + GeoMapping |
| GeoCoordinateService | YES | NO | NO | Pipeline WGS84 |
| LocalOriginService | YES | NO | NO | Facade mince sur MapConfig |
| WorldStreamingManager | YES | NO | NO | MarseilleMapProvider |
| MarseilleGeoDebugService | YES | NO | NO | F11, attaché par Marseille provider |
| PlacementFacade | YES | NO | NO | Panel + anchor layer |
| PlacementAnchorLayer | YES | NO | NO | MapLoadingService |
| PlacementApiRepository | YES | NO | NO | Via PlacementFacade |
| WigleVisualizationService | YES | NO | NO | MapLoading + Marseille |
| WigleBuildingRegistryService | YES | NO | NO | Marseille + visualization |
| WigleApiService | YES | NO | NO | Visualization (+ barrel unused) |
| WigleGeoService | YES | NO | NO | Visualization |
| GeoMappingService | YES | NO | NO | Visualization |
| TokenCellService | YES | NO | NO | Control + Marseille |
| FootprintTrailManager | YES | NO | NO | Control + Marseille |
| M4t3rPickupFxService | YES | NO | NO | Control + Marseille |
| M4t3rCoinPickupFxService | YES | NO | NO | Control + Marseille |
| M4t3rPickupFxOrchestratorService | YES | NO | NO | CharacterControl |
| M4t3rCollectTrailVisualService | YES | NO | NO | Control + Marseille |
| M4t3rRewardRuntimeService | YES | NO | NO | CharacterControl + debug overlay |
| M4t3rRewardApiService | YES | NO | NO | Via reward runtime |
| M4t3rTrailApiService | YES | NO | NO | CharacterControl |
| M4t3rDebugOverlay | YES | NO | NO | MarseilleMapProvider (F9) |

## 3. Functional roles

### Scene

Element: ThreeSceneService  
Role: Registre unique scene/camera/renderer créé par `app-three-floor`. Expose `ready$` pour character et city-scene.  
Criticality: CRITICAL  
Category: SCENE_RUNTIME  
Notes: Couplage fort avec three-floor ; aucun autre feature n’importe ce service.

Element: app-three-floor  
Role: Crée le canvas WebGL, le renderer, la boucle rAF hors NgZone, bind resize/visibility.  
Criticality: CRITICAL  
Category: SCENE_RUNTIME

Element: CameraControlService  
Role: Orbit / yaw-pitch 3ᵉ personne autour de l’avatar.  
Criticality: CRITICAL  
Category: SCENE_RUNTIME

### Character

Element: app-character  
Role: Attend `ThreeSceneService.ready$`, charge le mesh via NFT API optionnelle, reset runner.  
Criticality: CRITICAL  
Category: CHARACTER  
Notes: Injecte `AuthService` (DartChain) pour `userId`.

Element: CharacterControlService  
Role: God-service : clavier, joysticks, collisions, climb, tokens, trails, rewards, wallet session.  
Criticality: CRITICAL  
Category: CHARACTER  
Notes: Goulot d’étranglement n°1. 17 injects.

Element: CharacterNftService  
Role: Charge et anime CharacterAnon (FBX/STL).  
Criticality: CRITICAL  
Category: CHARACTER

Element: CharacterNftApiService  
Role: GET `/v1/characters/me` optionnel ; échec silencieux → mesh local.  
Criticality: SECONDARY  
Category: CHARACTER  
Notes: Stub utile, pas bloquant.

Element: RunnerWorldService / RunnerStateService  
Role: Monde procédural + progress pour collisions / fallback legacy.  
Criticality: CRITICAL (legacy) / USEFUL (Marseille)  
Category: CHARACTER

Element: app-joystick-move / app-joystick-view / app-virtual-joystick  
Role: Intention MOVE et VIEW ; gait et collisions restent dans CharacterControlService.  
Criticality: CRITICAL  
Category: CHARACTER

### Map / world

Element: app-city-scene  
Role: `MapLoadingService.initialize(scene, camera)` puis `characterControl.resetRunner()`.  
Criticality: CRITICAL  
Category: MAP_WORLD

Element: MapLoadingService  
Role: Marseille OSM, fallback legacy, attache WiGLE + placements.  
Criticality: CRITICAL  
Category: MAP_WORLD

Element: MarseilleMapProvider  
Role: Terrain Vieux-Port, OSM, tokens, debug, wigle registry.  
Criticality: CRITICAL  
Category: MAP_WORLD

Element: LegacyFloorMapProvider  
Role: Fallback si Marseille échoue ou `mapEnabled=false`.  
Criticality: CRITICAL  
Category: MAP_WORLD

Element: OSMBuildingProvider / GeoCoordinateService / WorldStreamingManager  
Role: Bâtiments OSM, CRS local, streaming.  
Criticality: CRITICAL  
Category: MAP_WORLD

Element: MapConfigService  
Role: Normalise environment → MapConfiguration.  
Criticality: CRITICAL  
Category: MAP_WORLD  
Notes: Service exclusive. Ne pas confondre avec `map-configuration.ts` (SHARED Star Conquest).

Element: LocalOriginService  
Role: Getters lat/lon/alt/scale depuis MapConfig.  
Criticality: SECONDARY  
Category: MAP_WORLD  
Notes: Facade mince — voir candidates.

Element: MarseilleGeoDebugService  
Role: HUD F11 geo debug.  
Criticality: DEBUG  
Category: NETWORK_DEBUG

### Placement

Element: PlacementAnchorLayer / PlacementFacade / PlacementApiRepository / app-placement-details-panel  
Role: Volumes RDC, sélection raycast, inquiry HTTP, panneau HUD.  
Criticality: USEFUL  
Category: PLACEMENT

### Tokens / rewards / network

Element: TokenCellService + FootprintTrailManager + M4t3r*  
Role: Champ de tokens au sol, FX, trail, rewards HTTP.  
Criticality: USEFUL  
Category: TOKENS_REWARDS

Element: WigleVisualizationService + WigleApiService + WigleGeoService + GeoMappingService + WigleBuildingRegistryService  
Role: Overlay observations réseau sur bâtiments OSM.  
Criticality: USEFUL  
Category: NETWORK_DEBUG

Element: M4t3rDebugOverlay  
Role: Overlay F9 stats GPU/tokens (dev).  
Criticality: DEBUG  
Category: NETWORK_DEBUG

## 4. Dependency map

```text
app-root (DartChain shell, hors scope)
  └── app-three-floor
        ├── ThreeSceneService.register
        ├── CharacterControlService.bindKeys
        ├── CameraControlService.attachOrbit
        ├── MapConfigService (quality / pixelRatio)
        ├── app-character
        │     ├── ThreeSceneService.ready$
        │     ├── CharacterNftApiService.fetchMine
        │     ├── CharacterNftService.loadCharacterForUser
        │     ├── CharacterControlService.resetRunner
        │     └── AuthService.user          ← SHARED_DEPENDENCY (DartChain)
        ├── app-city-scene
        │     ├── ThreeSceneService.ready$
        │     ├── MapLoadingService.initialize
        │     └── CharacterControlService.resetRunner
        ├── app-joystick-move → CharacterControlService.onMovementJoystickUpdate
        │     └── app-virtual-joystick
        ├── app-joystick-view → CharacterControlService.onCameraJoystickUpdate
        │     └── app-virtual-joystick
        └── app-placement-details-panel → PlacementFacade

MapLoadingService
  ├── MapConfigService.effectiveProvider
  ├── MarseilleMapProvider  (try)
  ├── LegacyFloorMapProvider (fallback)
  ├── WigleVisualizationService.attachNetworkLayer
  └── PlacementAnchorLayer.attachPlacementLayer

MarseilleMapProvider
  ├── MapConfigService, GeoCoordinateService, OSMBuildingProvider
  ├── WorldStreamingManager, TokenCellService
  ├── M4t3rPickupFxService, M4t3rCoinPickupFxService
  ├── FootprintTrailManager, M4t3rCollectTrailVisualService
  ├── M4t3rDebugOverlay, MarseilleGeoDebugService
  ├── WigleBuildingRegistryService, WigleVisualizationService
  └── marseille-twin/** (overlay, spawn, LOD — exclusive TS modules)

CharacterControlService   ← HOTSPOT (17 injects)
  ├── CharacterNftService, CameraControlService
  ├── RunnerWorldService, RunnerStateService
  ├── MapLoadingService, MapConfigService, GeoCoordinateService
  ├── TokenCellService, FootprintTrailManager
  ├── M4t3rPickupFx*, M4t3rCollectTrailVisualService
  ├── M4t3rTrailApiService, M4t3rRewardRuntimeService
  └── WalletSessionService          ← SHARED_DEPENDENCY (DartChain wallet)

PlacementFacade → PlacementApiRepository
PlacementAnchorLayer → PlacementFacade + ThreeSceneService

WigleVisualizationService
  ├── WigleApiService, WigleGeoService, GeoMappingService
  ├── WigleBuildingRegistryService, WigleDebugOverlay (not in listed set)
  └── ThreeSceneService, MapConfigService

M4t3rRewardRuntimeService → M4t3rRewardApiService
LocalOriginService → MapConfigService
GeoCoordinateService → LocalOriginService
```

### Bottlenecks

- `CharacterControlService` : move + tokens + rewards + wallet dans un seul service.
- `MarseilleMapProvider` : provider + visuels + debug + wigle + tokens.
- `map-configuration.ts` : constantes monde partagées avec Star Conquest (STOP-SHARED-DEPENDENCY).
- `WalletSessionService` / `AuthService` : couplage floor ↔ DartChain.

### Cycles

Aucun cycle de classes détecté. Ordre : ThreeFloor register → city-scene load map → character load mesh.

## 5. Classification

### EXCLUSIVE_METAVERSEBB

Les 7 composants listés.  
Les 34 services listés (usages runtime uniquement dans le graphe floor/map/character).

Modification autonome autorisée **sauf** si le changement force une edit de `map-configuration.ts`, `AuthService`, `WalletSessionService`, `core/utils/three-*.ts`, ou `app.ts`.

### SHARED_DEPENDENCY (hors liste, lecture seule)

- `core/map/map-configuration.ts` — Star Conquest / knowledge-graph / particle-background
- `WalletSessionService` — wallet, quests, faucet, CharacterControl
- `AuthService` — shell + `app-character`
- `FocusTrapDirective` — placement panel + Star Conquest + drawers
- `core/utils/three-container.util.ts`, `three-animation.util.ts`, `three-webgl.util.ts`, `perf-profiler.util.ts`
- `HttpClient` / `environment`

### OUT_OF_SCOPE (interagissent, ne pas modifier)

- `app-particle-background`, `app-star-quest-panel`, `app-star-quest-scanner`, `app-star-conquest-pan-stick`
- `StarJoystickBridgeService`
- Navbar, showcase, dock, wallet, graph, swap, `app-r4v3-scene`

### CANDIDATE_FOR_REMOVAL

Aucun élément **de la liste** n’est unused.  
Candidats de simplification / adjacents : voir `metaversebb-candidates-for-removal.md`.

## 6. Exclusive deps not in the original list

Toujours MetaVerseBB, à inclure dans un inventaire élargi :

- `core/map/marseille-twin/**`
- `core/map/geo-reference.config.ts`
- `core/map/wigle/wigle-debug-overlay.ts`
- `core/services/character-assets.config.ts`
- `core/services/runner/runner.config.ts`
- `metaverse/input/joystick-shared/{move,view}-joystick.input.ts`
- `metaverse/input/joystick-shared/virtual-joystick.pointer.ts`

## 7. Layer proposal (additive, not executed)

```text
scene/       three-floor + ThreeSceneService + CameraControlService
character/   character + joysticks + Character* + Runner*
map/         MapLoading + providers + geo + streaming
placement/   facade + layer + panel
tokens/      TokenCell + footprints + M4t3r*
network/     wigle/*
debug/       MarseilleGeoDebug + M4t3rDebugOverlay
```

Aujourd’hui ces couches sont aplaties sous `core/map` et `core/services`. Ne pas déplacer les fichiers (deletion/move risk). Documenter seulement.

## 8. Existing tests (exclusive + map)

three-floor:

- `three-floor.spec.ts`
- `metaversebb-scope.inventory.spec.ts`
- `placement-details-panel.spec.ts`
- `joystick-shared/move-joystick.input.spec.ts`
- `joystick-shared/view-joystick.input.spec.ts`
- `joystick-shared/virtual-joystick.pointer.spec.ts`

map (échantillon critique) : `map-loading.service.spec.ts`, `map-config.service.spec.ts`, `geo-coordinate.service.spec.ts`, `osm-building.provider.spec.ts`, `placements/*.spec.ts`, `m4t3r-*.spec.ts`, `wigle/geo-mapping.service.spec.ts`, `marseille-twin/*.spec.ts`.

## 9. Non-regression baseline

- Host : `app-three-floor` + canvas `.floor-canvas`
- Provider : `marseille-osm-three`, fallback `legacy-floor`
- Spawn : `METRO_SPAWN_ANCHOR.spawnOffsetFromMirror`
- Joysticks MOVE/VIEW exclusifs three-floor
- Raycast placements → `app-placement-details-panel`
- Tokens M4T3R au sol via CharacterControl
- Overlay WiGLE attaché indépendamment du provider
- Debug F9 (M4T3R) / F11 (geo)
- Tests : `ng test` (Vitest) ; scripts `test`, `build` dans `apps/dartchain-frontend/Dart/package.json`

## 10. Architecture insights

Strengths: arbre composants petit (7) ; fallback Marseille→legacy ; registres ThreeScene clairs.

Risks: CharacterControl god-object ; MapConfig constants partagées ; rewards couplés au wallet ; debug overlays attachés dans le provider.

Coupling hotspots: CharacterControlService, MarseilleMapProvider, map-configuration.ts.

Suggested clarifications: adapters locaux pour Auth/Wallet ; extraire constantes quest de `map-configuration.ts` **sans éditer le fichier partagé dans cette boucle**.
