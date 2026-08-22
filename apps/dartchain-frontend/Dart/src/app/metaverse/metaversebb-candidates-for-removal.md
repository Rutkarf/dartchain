# MetaverseBB — candidates for removal

AUDIT_DATE: 2026-08-20  
POLICY: document only — never delete without explicit human validation.

## Listed set (41)

Aucun composant/service de la liste n’est unused. Tous ont un usage runtime dans le graphe MetaVerseBB.

| Element | Type | Reason | Usage detected | Alternative | Recommendation |
|---|---|---|---|---|---|
| LocalOriginService | Service | Facade mince (getters MapConfig) | YES (GeoCoordinateService, GeoMappingService) | Lire MapConfigService directement | CONSERVER ; option ISOLER/inliner plus tard |
| CharacterNftApiService | Service | Stub HTTP, catch → null | YES (`app-character` only) | Mesh local déjà fallback | CONSERVER (prépare mint) |
| M4t3rDebugOverlay | Service | Debug F9, pas UX joueur | YES (MarseilleMapProvider) | — | CONSERVER (debug) |
| MarseilleGeoDebugService | Service | Debug F11 | YES (MarseilleMapProvider) | — | CONSERVER (debug) |
| RunnerWorldService | Service | Surtout legacy / collisions | YES (CharacterControl, LegacyFloorMapProvider) | Colliders OSM Marseille | CONSERVER (fallback + collisions) |
| RunnerStateService | Service | Progress runner | YES (CharacterControl only) | — | CONSERVER |

## Adjacent (not in the listed 41)

Découverts pendant l’audit. Hors liste d’origine. Ne pas supprimer.

| Element | Type | Reason | Usage detected | Alternative | Recommendation |
|---|---|---|---|---|---|
| CitySceneService `core/services/city-scene.service.ts` | Service | Ville procédurale legacy ; `app-city-scene` ne l’injecte pas | NO import | MapLoadingService + MarseilleMapProvider | CANDIDATE_FOR_REMOVAL — DÉPRÉCIER, ne pas supprimer |
| `wigle/wigle-integration.service.ts` | Barrel | Re-export alias `WigleIntegrationService` ; aucun import du fichier | NO import of file | Importer `wigle-visualization.service` | CANDIDATE_FOR_REMOVAL — barrel mort |
| `app-ladder-climb-scene` | Component | Scène climb séparée, non montée dans `app.html` | NO host | Prompt climb dans `app-character` | OUT_OF_SCOPE / CANDIDATE — hors MetaVerseBB host |
| `StarJoystickBridgeService` | Service | Pont floor ↔ Star Conquest ; register unused | Comments only | Layout DOM query | OUT_OF_SCOPE (Star Conquest) |

## Shared files that look like MetaVerseBB (do not treat as exclusive)

| File | Why it looks exclusive | Actual sharing | Action |
|---|---|---|---|
| `core/map/map-configuration.ts` | Spawn, WORLD_METERS, canopyTitle MetaVerseBB | particle-background, knowledge-graph, star-conquest-graph | STOP-SHARED-DEPENDENCY — ne pas éditer |
| `core/utils/three-*.ts` | Utilisés par three-floor | particle-background | Lecture seule |
| `FocusTrapDirective` | Panel placements | Star Conquest + drawers DartChain | Lecture seule |

## Options (human decision)

1. CONSERVER tout (défaut).  
2. Extraire les constantes quest hors `map-configuration.ts` **dans un nouveau fichier Star Conquest** (hors cette boucle).  
3. Adapter Auth/Wallet derrière une façade locale three-floor (additive).  
4. Découper CharacterControlService **sans suppression** (nouveaux services + délégation).

Required human decision: aucune suppression ; valider si CitySceneService et le barrel WiGLE peuvent être dépréciés plus tard.
