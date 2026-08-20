# MetaverseBB audit — Autopilot backlog

ACTIVE_FEATURE: metaverseBB codebase audit, scope validation and cleanup preparation  
ACTIVE_SCOPE: `apps/dartchain-frontend/Dart/src/app/three-floor/`  
TARGET_ITERATIONS: 20  
DELETION_POLICY: never delete  
SCOPE_POLICY: STRICT_METAVERSEBB_SCOPE

## Scope classification (audit 2026-08-20)

### EXCLUSIVE_METAVERSEBB (modifiable / créable)

- `apps/dartchain-frontend/Dart/src/app/three-floor/**`
- Les 34 services listés (usages uniquement floor/map/character)
- `core/map/marseille-twin/**` (déjà documenté ailleurs)

### SHARED_DEPENDENCY (lecture seule)

- `core/map/map-configuration.ts`
- `AuthService`, `WalletSessionService`
- `core/utils/three-*.ts`, `perf-profiler.util.ts`
- `FocusTrapDirective`

### OUT_OF_SCOPE

- Star Conquest, particle-background, wallet UI, routing, backend

## Candidate iterations (20+)

| ID | Task | Status |
|---|---|---|
| ITER-001 | Inventaire fichiers + existence YES | DONE |
| ITER-002 | Table usages metaverseBB vs other features | DONE |
| ITER-003 | Rôles fonctionnels 1–3 phrases | DONE |
| ITER-004 | Candidats removal (liste + adjacents) | DONE |
| ITER-005 | Carte de dépendances textuelle | DONE |
| ITER-006 | Classification exclusive / shared / oos | DONE |
| ITER-007 | Spec inventaire sélecteurs + counts | DONE |
| ITER-008 | Documenter point d’entrée Angular | DONE |
| ITER-009 | Documenter hotspot CharacterControlService | DONE |
| ITER-010 | Documenter hotspot MarseilleMapProvider | DONE |
| ITER-011 | Cartographier tokens / trails / rewards | DONE |
| ITER-012 | Cartographier WiGLE / network | DONE |
| ITER-013 | Cartographier placements | DONE |
| ITER-014 | Identifier deps exclusives hors liste | DONE |
| ITER-015 | Proposer découpage en couches | DONE |
| ITER-016 | Documenter scripts test/build | DONE |
| ITER-017 | Baseline non-régression | DONE |
| ITER-018 | Corriger classification vs backlog Marseille (services core exclusifs par usage) | DONE |
| ITER-019 | Insights architecture + risques | DONE |
| ITER-020 | Freeze inventaire machine-readable + verify tests | DONE |
| ITER-021 | Façade locale Auth/Wallet (adapter) | TODO — additive, in-scope |
| ITER-022 | Spec contrat template three-floor.html | TODO |
| ITER-023 | Documenter F9/F11 debug attach points | TODO |
| ITER-024 | Liste tests existants three-floor + map | DONE |

## Non-regression baseline

Voir `metaversebb-scope-map.md` §8.

Scripts:

- `npm test` → `ng test` (Vitest)
- `npm run build` → `ng build`
- Ciblé : `--include=**/metaversebb-scope.inventory.spec.ts`

## Stop conditions used

None during ITER-001…020. `map-configuration.ts` remains unread-write (STOP-SHARED-DEPENDENCY if edited).
