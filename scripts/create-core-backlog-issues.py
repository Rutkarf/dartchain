#!/usr/bin/env python3
"""Create 50 DartChain Project Core backlog issues and add to GitHub Project."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass

REPO = "Rutkarf/dartchain"
PROJECT_OWNER = os.environ.get("GH_PROJECT_OWNER", "FrakturKorp")
PROJECT_NUMBER = int(os.environ.get("GH_PROJECT_NUMBER", "1"))
SKIP_EXISTING = int(os.environ.get("GH_SKIP_EXISTING", "1"))


@dataclass(frozen=True)
class Issue:
    id: str
    title: str
    label: str
    body: str


ISSUES: list[Issue] = [
    Issue(
        "CORE-001",
        "API Star Conquest — persistance progression serveur",
        "enhancement",
        """## Contexte
Star Conquest persiste la progression en `localStorage` (`star-conquest-progress-v1`). La quête `sc-data-persist` est **Icebox** ; aucun module backend SC n'existe.

**Fichiers :**
- `apps/dartchain-frontend/Dart/src/app/particle-background/star-conquest/star-conquest-progress.ts`
- `apps/dartchain-frontend/Dart/src/app/core/services/star-conquest-progress.service.ts`
- `apps/dartchain-frontend/Dart/src/app/particle-background/star-conquest/star-conquest.mock.ts`

## Objectif
Persister la progression SC côté Spring Boot (utilisateur authentifié) avec fallback offline.

## Tâches
- [ ] `StarConquestProgressController` + store Postgres (questId, status, claimedAt, rewardM4T3R)
- [ ] `GET/PUT /api/v1/star-conquest/progress` (Bearer)
- [ ] Merge server ↔ local au login dans `star-conquest-progress.service.ts`
- [ ] Documenter politique de conflit (claimedAt le plus récent)
- [ ] Entrées dans `ApiContractCatalog.java` (bump 0.18.0)

## Critères d'acceptation
- [ ] Login hydrate depuis API ; logout conserve localStorage
- [ ] Spec `star-conquest.spec.ts` : merge + offline
- [ ] Invariant 35 quêtes / 7 familles préservé

**Priorité : P0** · **Epic : Star Conquest**""",
    ),
    Issue(
        "CORE-002",
        "Sync catalogue Star Conquest depuis API",
        "enhancement",
        """## Contexte
Le catalogue 35 quêtes est hardcodé dans `star-conquest.mock.ts`. Toute évolution produit exige un redeploy frontend.

## Objectif
Hydrater le catalogue SC depuis le backend avec fallback mock si API indisponible.

## Tâches
- [ ] DTO backend aligné sur `StarQuest` (`star-conquest.model.ts`)
- [ ] `GET /api/v1/star-conquest/catalog` (public, cache 5 min)
- [ ] FE : loader dans `star-conquest.mock.ts` / facade avec fallback
- [ ] Test : 7 familles × 5 quêtes, connexions valides

## Critères d'acceptation
- [ ] `STAR_CONQUEST_MOCK_QUESTS` reste fallback dev/offline
- [ ] Spec catalogue + board colonnes GitHub inchangées
- [ ] Dépend de CORE-001 pour statuts utilisateur

**Priorité : P1** · **Epic : Star Conquest**""",
    ),
    Issue(
        "CORE-003",
        "Slippage picker mémorisé (sc-swap-slippage)",
        "enhancement",
        """## Contexte
Quête `sc-swap-slippage` **In Progress** : label « Slippage max 0,5 % » live sans picker ni persistance.

**Fichiers :**
- `apps/dartchain-frontend/Dart/src/app/features/exchange-panel/exchange-panel.ts`
- `apps/dartchain-frontend/Dart/src/app/particle-background/star-conquest/star-conquest.mock.ts`

## Objectif
Strip 16px avec presets 0,1 % / 0,5 % / 1 % / custom, mémorisé, branché sur le swap.

## Tâches
- [ ] UI picker compact 250px dans exchange-panel
- [ ] Persistance `localStorage` ou profil utilisateur
- [ ] Validation serveur alignée (CORE-034)
- [ ] Spec `exchange-panel.spec.ts`

## Critères d'acceptation
- [ ] Quote lock 30s respecte le slippage choisi
- [ ] Quête SC passable en Done après QA live

**Priorité : P1** · **Epic : Frontend Shell**""",
    ),
    Issue(
        "CORE-004",
        "Rate cache soft-expire 30s (sc-data-rates)",
        "enhancement",
        """## Contexte
Quête `sc-data-rates` **In Progress** : « Taux garanti 30 s » sans soft-expire cache réseau.

**Fichiers :**
- `apps/dartchain-frontend/Dart/src/app/core/services/crypto-rate.service.ts`
- `apps/dartchain-frontend/Dart/src/app/features/rate-panel/`

## Objectif
Cache mémoire + timestamp, refresh silencieux à expiration, anti-spam onglet actif.

## Tâches
- [ ] Soft-expire à 30s avec indicateur « taux expiré »
- [ ] Max 1 req/30s par paire token
- [ ] Backoff 429 aligné `RateLimitFilter`
- [ ] Spec rates + swap integration

## Critères d'acceptation
- [ ] Pas de rafale réseau au focus tab
- [ ] CTA swap disabled si taux stale >60s

**Priorité : P1** · **Epic : Frontend Shell**""",
    ),
    Issue(
        "CORE-005",
        "Prévisualisation TX avant envoi (sc-security-tx)",
        "enhancement",
        """## Contexte
Quête `sc-security-tx` **Blocked** jusqu'à swap + wallet mask + pickup complétés.

**Fichiers :**
- `apps/dartchain-frontend/Dart/src/app/features/wallet-panel/wallet-panel.ts`
- `apps/dartchain-frontend/Dart/src/app/particle-background/star-conquest/star-conquest.mock.ts`

## Objectif
Drawer confirmation FROM/TO/AMOUNT/hash prévu/solde restant avant `submitSend`.

## Tâches
- [ ] Composant preview réutilisable
- [ ] Désactiver Confirm si solde insuffisant
- [ ] FocusTrap + spec a11y
- [ ] Débloquer quête SC après deps live

## Critères d'acceptation
- [ ] Aucune clé privée en clair
- [ ] Hash preview cohérent avec backend payload builder

**Priorité : P1** · **Epic : Blockchain** · **Dépend : CORE-003**""",
    ),
    Issue(
        "CORE-006",
        "API Metaverse Placements MB-7",
        "enhancement",
        """## Contexte
`placement-api.repository.ts` documente : « backend pas encore livré — lot MB-7 ». Prod utilise fixtures dev.

**Contrats attendus :**
- `GET /api/v1/metaverse/placements?south&north&west&east`
- `GET /api/v1/metaverse/placements/:id`
- `POST /api/v1/metaverse/placements/:id/inquiries`

## Objectif
Livrer l'API placements Spring alignée sur `placement.dto.ts`.

## Tâches
- [ ] Package `metaverse/placements/` backend
- [ ] DTO + mapper + controller v1
- [ ] Tests controller integration
- [ ] Entrées `ApiContractCatalog.java`

## Critères d'acceptation
- [ ] FE prod n'utilise plus `placement-fixtures.dev.ts`
- [ ] Panel inquiry fonctionne end-to-end

**Priorité : P0** · **Epic : Metaverse**""",
    ),
    Issue(
        "CORE-007",
        "Placements Postgres + index géo",
        "enhancement",
        """## Contexte
Complément de CORE-006 : persistance durable des emplacements MetaverseBB.

## Objectif
Store Postgres avec index bbox, seed Vieux-Port, pas de fixtures en prod.

## Tâches
- [ ] Migration Flyway `metaverse_placements`
- [ ] Repository avec query bounds
- [ ] Seed script depuis fixtures dev (one-shot)
- [ ] Test bounds query performance

## Critères d'acceptation
- [ ] `environment.production` → source `api` uniquement
- [ ] Empty state graceful dans `placement-details-panel`

**Priorité : P0** · **Epic : Metaverse** · **Dépend : CORE-006**""",
    ),
    Issue(
        "CORE-008",
        "Workflow inquiry placement + rate limit",
        "enhancement",
        """## Contexte
Le frontend ne doit pas être autorité prix/disponibilité (`placement-api.repository.ts`).

## Objectif
POST inquiry retourne ticket ID, rate-limited, audit log.

## Tâches
- [ ] Handler inquiry backend + validation
- [ ] Rate limit par user/IP
- [ ] Brancher `placement-inquiry.guard.ts`
- [ ] États loading/error panel

## Critères d'acceptation
- [ ] 429 avec message UX panel
- [ ] Aucun prix inventé côté client

**Priorité : P1** · **Epic : Metaverse** · **Dépend : CORE-006**""",
    ),
    Issue(
        "CORE-009",
        "Settlement M4T3R → faucet pending UX",
        "enhancement",
        """## Contexte
`OffChainSettlementService` crédite `CREDITED_FAUCET_PENDING`. Le dock faucet n'expose pas clairement le solde pending ramassé.

**Fichiers :**
- `apps/dartchain-backend/src/main/java/io/dartchain/backend/m4t3r/settlement/OffChainSettlementService.java`
- `apps/dartchain-backend/src/main/java/io/dartchain/backend/dto/FaucetStateResponse.java`
- `apps/dartchain-frontend/Dart/src/app/features/faucet/`

## Objectif
Badge pending + CTA « Claim pending » avant cooldown normal.

## Tâches
- [ ] Enrichir `GET /api/v1/faucet/state` (pending M4T3R)
- [ ] UI dock faucet + `faucet-runtime.service.ts`
- [ ] E2E pickup sol → pending → claim

## Critères d'acceptation
- [ ] `M4t3rRewardServiceTest` aligné UI
- [ ] Pas de double-crédit

**Priorité : P1** · **Epic : M4T3R**""",
    ),
    Issue(
        "CORE-010",
        "Anti-cheat trail pickup (vitesse + nonce replay)",
        "enhancement",
        """## Contexte
Validation M4T3R côté serveur doit rejeter téléport et replays.

**Fichiers :**
- `apps/dartchain-backend/src/main/java/io/dartchain/backend/m4t3r/M4t3rRewardValidationService.java`
- `apps/dartchain-backend/src/main/java/io/dartchain/backend/m4t3r/M4t3rNonceStore.java`

## Objectif
Rejeter vitesse > seuil, nonce replay, positions impossibles.

## Tâches
- [ ] Seuils configurables `M4t3rRewardConfig`
- [ ] Réponse 422 explicite (debug only)
- [ ] Tests rejection paths
- [ ] Logs audit sans PII

## Critères d'acceptation
- [ ] Marche normale avatar non rejetée
- [ ] Replay même nonce → rejected

**Priorité : P1** · **Epic : M4T3R**""",
    ),
    Issue(
        "CORE-011",
        "Mainnet settlement M4T3R (fail-closed)",
        "enhancement",
        """## Contexte
`MainnetSettlementService.java` retourne `MAINNET_NOT_IMPLEMENTED`.

## Objectif
Settlement mainnet derrière flag `m4t3r.reward.mainnet-enabled=false` par défaut.

## Tâches
- [ ] Implémentation ou stub documenté avec roadmap
- [ ] Config prod fail-closed
- [ ] Test flag off → off-chain only
- [ ] Doc ops dans `render-docker.md`

## Critères d'acceptation
- [ ] Prod default : off-chain → faucet pending
- [ ] Aucun appel mainnet accidentel

**Priorité : P2** · **Epic : M4T3R**""",
    ),
    Issue(
        "CORE-012",
        "Historique rewards M4T3R dans le dock",
        "enhancement",
        """## Contexte
`M4t3rRewardController` expose rewards ; pas de UI historique paginée.

## Objectif
Liste paginée des pickups/settlements dans wallet ou dock.

## Tâches
- [ ] `GET /api/v1/m4t3r/rewards/history?page&size`
- [ ] Composant dock compact 250px
- [ ] Lien depuis pickup FX toast

## Critères d'acceptation
- [ ] Pagination 20 items
- [ ] Statuts settlement visibles (PENDING/CREDITED/REJECTED)

**Priorité : P2** · **Epic : M4T3R**""",
    ),
    Issue(
        "CORE-013",
        "Grille M4T3R debug F9",
        "enhancement",
        """## Contexte
Overlay F9 (`m4t3r-debug-overlay.ts`) partiel ; ITER-023 backlog MetaverseBB.

## Objectif
Afficher cellules actives, clusters, cooldown — toggle debug only.

## Tâches
- [ ] Brancher `M4t3rGridUtils` backend + `m4t3r-grid.util.ts` FE
- [ ] Alignement origine `GEO_REFERENCE_CONFIG`
- [ ] Zero impact perf quand OFF
- [ ] Documenter raccourci F9 (ITER-023)

## Critères d'acceptation
- [ ] F9 n'intercepte pas joysticks mobile
- [ ] Test vectors grid cross-lang

**Priorité : P2** · **Epic : M4T3R**""",
    ),
    Issue(
        "CORE-014",
        "Trail pickup offline queue + sync",
        "enhancement",
        """## Contexte
Pickup M4T3R peut échouer offline ; pas de queue retry robuste.

**Fichiers :**
- `apps/dartchain-frontend/Dart/src/app/core/map/m4t3r-trail-api.service.ts`
- `apps/dartchain-backend/.../M4t3rTrailController.java`

## Objectif
Queue locale idempotente, sync au reconnect.

## Tâches
- [ ] Idempotency-Key header
- [ ] Queue IndexedDB ou localStorage
- [ ] Retry exponential backoff
- [ ] Spec offline → online

## Critères d'acceptation
- [ ] Pas de double settlement
- [ ] UI feedback « sync pending »

**Priorité : P1** · **Epic : M4T3R**""",
    ),
    Issue(
        "CORE-015",
        "Pipeline cadastre GeoJSON Vieux-Port",
        "enhancement",
        """## Contexte
Extrusions bâtiments depuis `public/geo/vieux-port/buildings.geojson` ; pipeline `build-marseille-geojson.mjs`.

## Objectif
Étendre couverture bbox Vieux-Port, CI vérifie artifact geo.

## Tâches
- [ ] Étendre `geo-source/vieux-port-cadastre.source.json`
- [ ] Script build + validation massing
- [ ] Tests `geojson-building.spec.ts`, `cadastre-building-visual.spec.ts`
- [ ] Attribution cadastre panel

## Critères d'acceptation
- [ ] `ng test` geo specs verts
- [ ] Provenance documentée `marseille-data-provenance.md`

**Priorité : P1** · **Epic : Metaverse**""",
    ),
    Issue(
        "CORE-016",
        "Atmosphere cyberpunk — flag prod",
        "enhancement",
        """## Contexte
`MarseilleAtmosphereService`, color grade shader, overlay cyberpunk — flag default OFF.

**Fichiers :**
- `apps/dartchain-frontend/Dart/src/app/core/map/marseille-atmosphere.service.ts`
- `apps/dartchain-frontend/Dart/src/app/core/map/metaversebb-color-grade.shader.ts`
- `apps/dartchain-frontend/Dart/src/app/core/map/marseille-twin/cyberpunk-overlay.config.ts`

## Objectif
Presets jour/nuit/brouillard activables via feature flag environment.

## Tâches
- [ ] Flag `metaverseCyberpunkOverlay` environment
- [ ] Toggle F11 debug only
- [ ] Perf budget <5ms/frame
- [ ] Test `metaversebb-render.pipeline.spec.ts`

## Critères d'acceptation
- [ ] OFF par défaut prod pages.dev
- [ ] Pas de régression spawn/collisions Ombrière

**Priorité : P2** · **Epic : Metaverse**""",
    ),
    Issue(
        "CORE-017",
        "Building LOD seamless (massing → façade)",
        "enhancement",
        """## Contexte
`building-lod.util.ts` définit LOD ; transition distance caméra à finaliser.

## Objectif
Massing loin → façade proche sans pop visible.

## Tâches
- [ ] Brancher LOD sur `CameraControlService` distance
- [ ] Hystérésis anti-flicker
- [ ] Budget draw calls <200 mobile
- [ ] Spec `building-lod.util.spec.ts`

## Critères d'acceptation
- [ ] Transition <100ms perceptible
- [ ] Raycast metadata préservée

**Priorité : P2** · **Epic : Metaverse**""",
    ),
    Issue(
        "CORE-018",
        "Harbor water shader — réflexions quais",
        "enhancement",
        """## Contexte
`harbor-water.shader.ts` + `harbor-water-mesh.builder.ts` ; collision `isHarborWaterAt` ne doit pas régresser.

## Objectif
Normals côte, fresnel, rendu eau Vieux-Port (+Z view target).

## Tâches
- [ ] Shader tuning + sync `marseille-water-visual.util.ts`
- [ ] Test `harbor-water.spec.ts`
- [ ] Vérifier collision runner world

## Critères d'acceptation
- [ ] Spawn Ombrière inchangé
- [ ] FPS stable mobile (sc-three-fps)

**Priorité : P2** · **Epic : Metaverse**""",
    ),
    Issue(
        "CORE-019",
        "World streaming chunks 128m (Panier/Joliette)",
        "enhancement",
        """## Contexte
`WorldStreamingManager` + district tile helper 128m ; `geo-reference.config.ts` note mock procedural distant.

## Objectif
Charger districts au-delà Vieux-Port avec fallback legacy.

## Tâches
- [ ] Tile strategy Panier/Joliette
- [ ] Progressive load + dispose
- [ ] Fallback `LegacyFloorMapProvider`
- [ ] Perf governor `marseille-perf.config.ts`

## Critères d'acceptation
- [ ] Chunk fail → pas de crash scene
- [ ] Streaming OFF = comportement actuel

**Priorité : P2** · **Epic : Metaverse**""",
    ),
    Issue(
        "CORE-020",
        "Façade Auth/Wallet three-floor (ITER-021)",
        "enhancement",
        """## Contexte
MetaverseBB importe directement `AuthService`/`WalletSessionService` — couplage fort (audit backlog ITER-021).

**Fichiers :**
- `apps/dartchain-frontend/Dart/src/app/three-floor/floor-runtime/floor-session.adapter.ts`
- `apps/dartchain-frontend/Dart/src/app/core/services/character-control.service.ts`

## Objectif
Adapter interface unique ; zero import wallet direct dans character-control.

## Tâches
- [ ] Interface `FloorSessionPort`
- [ ] Impl adapter injectable
- [ ] Migrer character-control
- [ ] Tests adapter isolés

## Critères d'acceptation
- [ ] Scope map metaverseBB respecté
- [ ] Pickup M4T3R + wallet link inchangés

**Priorité : P1** · **Epic : Metaverse**""",
    ),
    Issue(
        "CORE-021",
        "Contrat template three-floor.html (ITER-022)",
        "documentation",
        """## Contexte
Attach points DOM/WebGL non documentés formellement.

## Objectif
Spec contrat `three-floor.html` : canvas, joysticks, panel placement, debug overlays.

## Tâches
- [ ] Markdown spec dans `three-floor/`
- [ ] Inventaire sélecteurs (metaversebb-scope.inventory.ts)
- [ ] Test snapshot structure DOM
- [ ] Lien audit backlog ITER-022

## Critères d'acceptation
- [ ] Tout nouveau overlay référence la spec
- [ ] Non-régression 250×550 documentée

**Priorité : P2** · **Epic : Metaverse**""",
    ),
    Issue(
        "CORE-022",
        "Documentation debug F9/F11 (ITER-023)",
        "documentation",
        """## Contexte
F9 M4T3R stats, F11 geo debug — attach points non documentés.

**Fichiers :**
- `apps/dartchain-frontend/Dart/src/app/core/map/m4t3r-debug-overlay.ts`
- `apps/dartchain-frontend/Dart/src/app/core/map/marseille-geo-debug.service.ts`

## Objectif
Guide debug dev : champs Ombrière, spawn, calibration.

## Tâches
- [ ] Doc markdown + diagramme flux
- [ ] Spec smoke champs F11
- [ ] Vérifier non-exposition prod

## Critères d'acceptation
- [ ] Raccourcis non capturés par joysticks
- [ ] ITER-023 backlog → DONE

**Priorité : P2** · **Epic : Metaverse**""",
    ),
    Issue(
        "CORE-023",
        "Blockchain Postgres-only en production",
        "enhancement",
        """## Contexte
`JsonBlockchainStateStore` utilisé en dev ; prod doit être Postgres-only.

**Fichiers :**
- `apps/dartchain-backend/src/main/java/io/dartchain/backend/blockchain/JsonBlockchainStateStore.java`
- `apps/dartchain-backend/scripts/verify-postgres-only.sh`

## Objectif
Profil prod rejette JSON store ; migration documentée.

## Tâches
- [ ] Guard `PostgresOnlyProfileGuard`
- [ ] Script migration JSON → Postgres
- [ ] Test `BlockchainPersistenceTest`
- [ ] Intégrer `verify-prod-hardening.sh`

## Critères d'acceptation
- [ ] Restart Render sans perte chaîne
- [ ] Backup restore documenté

**Priorité : P0** · **Epic : Blockchain**""",
    ),
    Issue(
        "CORE-024",
        "Validation chaîne continue + panel Admin",
        "enhancement",
        """## Contexte
Validité chaîne via `GET /api/v1/blockchain/valid` ; pas de job continu ni alerte admin.

## Objectif
Job périodique validation hash/nonces + gauge admin panel.

## Tâches
- [ ] Scheduler `BlockchainService.validateChain()`
- [ ] Exposer dernier résultat ops snapshot
- [ ] UI admin gauge + timestamp
- [ ] Test corruption simulée

## Critères d'acceptation
- [ ] Corruption détectée <60s
- [ ] Log structuré JSON

**Priorité : P1** · **Epic : Blockchain**""",
    ),
    Issue(
        "CORE-025",
        "WebSocket blocs/tx live (navbar + bandeau)",
        "enhancement",
        """## Contexte
Polling chain existe ; WebSocket auth partiellement implémenté backend.

**Fichiers :**
- `apps/dartchain-backend/.../WebSocketAuthHandshakeInterceptor.java`
- `apps/dartchain-frontend/Dart/src/app/features/bandeau-accueil/`

## Objectif
Push `block.mined` + `tx.pending` via WS avec fallback poll.

## Tâches
- [ ] Topics WS + auth
- [ ] FE consumer + reconnect backoff
- [ ] Bandeau + navbar latency cohérents
- [ ] Test `LiveSocketHandlerIntegrationTest`

## Critères d'acceptation
- [ ] Pause tab → pas de drain (sc-three-fps)
- [ ] Fallback auto si WS down

**Priorité : P1** · **Epic : Blockchain**""",
    ),
    Issue(
        "CORE-026",
        "Mempool priorité + dock densité 250px",
        "enhancement",
        """## Contexte
Pending txs tri basique ; dock mempool doit rester lisible à 250px (`sc-dock-mempool` Ready).

## Objectif
Tri montant+timestamp stable ; UI rows compactes.

## Tâches
- [ ] Tri backend pending list
- [ ] `app-pending-transactions` densité
- [ ] Test ordre stable entre polls
- [ ] Spec viewport compact

## Critères d'acceptation
- [ ] Mine All respecte ordre
- [ ] Zero horizontal scroll

**Priorité : P1** · **Epic : Blockchain**""",
    ),
    Issue(
        "CORE-027",
        "Explorer search hash/index/address",
        "enhancement",
        """## Contexte
Navbar search explorer partiellement branché.

**Fichiers :**
- `apps/dartchain-backend/.../explorer/ExplorerSearchService.java`
- `apps/dartchain-frontend/Dart/src/app/navbar/`

## Objectif
Recherche unifiée block/hash/address avec empty states 250px.

## Tâches
- [ ] API search robuste + pagination
- [ ] FE debounce + résultats drawer
- [ ] Spec explorer-search
- [ ] Entrée ApiContractCatalog

## Critères d'acceptation
- [ ] Invalid query → message UX
- [ ] Latence <500ms p95 dev

**Priorité : P2** · **Epic : Blockchain**""",
    ),
    Issue(
        "CORE-028",
        "P2P multi-node sync (profil docker p2p)",
        "enhancement",
        """## Contexte
Profil `p2p` dans `docker-compose.yml` ; tests `P2pMultiNodeIntegrationTest`.

## Objectif
Deux nœuds convergent état chaîne ; script verify automatisé.

## Tâches
- [ ] Documenter profil p2p dev
- [ ] `verify-p2p-sync.sh` CI-ready
- [ ] Quest progress P2P sync optional
- [ ] Ops guide split-brain recovery

## Critères d'acceptation
- [ ] 2 nodes same chain height <30s
- [ ] Pas de regression single-node

**Priorité : P2** · **Epic : Blockchain**""",
    ),
    Issue(
        "CORE-029",
        "OAuth Google production (staging)",
        "enhancement",
        """## Contexte
OAuth providers disabled prod ; dev mock `OAUTH_DEV_MOCK_ENABLED`.

**Fichiers :**
- `apps/dartchain-backend/.../auth/oauth/OAuthService.java`
- `deploy/render.env.example`

## Objectif
Google OAuth E2E staging ; mock off.

## Tâches
- [ ] Env vars Render staging
- [ ] Callback URL Cloudflare preview
- [ ] Test OAuth flow integration
- [ ] Audit log entry on login

## Critères d'acceptation
- [ ] Login social pages.dev staging
- [ ] Dev mock reste pour local

**Priorité : P1** · **Epic : Auth**""",
    ),
    Issue(
        "CORE-030",
        "OAuth GitHub + Discord + Apple (feature flags)",
        "enhancement",
        """## Contexte
`OAuthProvider.java` liste providers ; tous off by default.

## Objectif
Chaque provider derrière flag indépendant + tests.

## Tâches
- [ ] Config flags par provider
- [ ] Env examples documentés
- [ ] `OAuthServiceTest` par provider
- [ ] UI auth drawer badges provider

## Critères d'acceptation
- [ ] Provider off → bouton hidden
- [ ] Callback errors → problem+json UX

**Priorité : P2** · **Epic : Auth** · **Dépend : CORE-029**""",
    ),
    Issue(
        "CORE-031",
        "JWT refresh token rotation",
        "enhancement",
        """## Contexte
Refresh tokens sans rotation one-time ; risque replay.

**Fichiers :**
- `apps/dartchain-backend/.../auth/store/RefreshTokenStore.java`
- `apps/dartchain-frontend/Dart/src/app/core/auth/auth-token-refresh.ts`

## Objectif
Rotation à chaque refresh ; détection reuse → revoke all.

## Tâches
- [ ] Rotation server-side
- [ ] FE handle new refresh token
- [ ] Extend `AuthAcIntegrationTest`
- [ ] Documenter session limits

## Critères d'acceptation
- [ ] Reuse old refresh → 401 + revoke
- [ ] Logout all devices option

**Priorité : P1** · **Epic : Auth**""",
    ),
    Issue(
        "CORE-032",
        "Rate limit UX 429 (auth + faucet)",
        "enhancement",
        """## Contexte
`RateLimitFilter` backend ; frontend messages 429 génériques.

## Objectif
Countdown Retry-After dans auth drawer et faucet.

## Tâches
- [ ] Parser Retry-After header
- [ ] UI countdown FR/EN
- [ ] Align tests `RateLimitIntegrationTest`
- [ ] Spec auth-drawer 429

## Critères d'acceptation
- [ ] Bouton disabled pendant countdown
- [ ] Pas de retry storm

**Priorité : P1** · **Epic : Auth**""",
    ),
    Issue(
        "CORE-033",
        "WebSocket auth chat + live",
        "enhancement",
        """## Contexte
Showcase chat Ready live ; WS auth handshake existe backend.

## Objectif
WS chat rejeté si non auth ; reconnect sécurisé.

## Tâches
- [ ] Chat WS endpoint auth
- [ ] FE showcase-chat WS mode
- [ ] Tests handshake reject
- [ ] Fallback HTTP long-poll

## Critères d'acceptation
- [ ] Guest → HTTP seulement
- [ ] Token expiry → graceful reconnect

**Priorité : P1** · **Epic : Auth**""",
    ),
    Issue(
        "CORE-034",
        "Swap slippage validation serveur",
        "enhancement",
        """## Contexte
Complément CORE-003 : slippage FE doit être enforce côté serveur.

**Fichiers :**
- `apps/dartchain-backend/.../SwapController.java`
- `apps/dartchain-backend/.../ExchangeService.java`

## Objectif
Rejeter swap si déviation > slippage client.

## Tâches
- [ ] Param slippageBps request
- [ ] Validation avant exécution
- [ ] Error problem+json explicite
- [ ] Integration test swap edge

## Critères d'acceptation
- [ ] Aligné picker FE CORE-003
- [ ] 400 si slippage dépassé

**Priorité : P1** · **Epic : Blockchain** · **Dépend : CORE-003**""",
    ),
    Issue(
        "CORE-035",
        "API Quêtes Dock Spring complète",
        "enhancement",
        """## Contexte
`QuestService.java` / `/api/quests` backend ; FE `app-quests-panel` partiellement mock.

## Objectif
Daily/weekly/mission entièrement server-driven.

## Tâches
- [ ] Cooldown server-side anti double-claim
- [ ] Brancher `QuestsProgressService` FE
- [ ] Sync `dock-quests-summary`
- [ ] Tests QuestController integration

## Critères d'acceptation
- [ ] Reset timers accurate UTC
- [ ] XP total cohérent SC + Dock

**Priorité : P1** · **Epic : Star Conquest**""",
    ),
    Issue(
        "CORE-036",
        "Star Conquest ↔ GitHub Project sync script",
        "enhancement",
        """## Contexte
`star-conquest-github-project.ts` : « pas de sync API GitHub ».

## Objectif
Script/Action sync mock catalog → issues Project v2 colonnes.

## Tâches
- [ ] Script lit `star-conquest.mock.ts` statuses
- [ ] Map completed→Done, active→In Progress, etc.
- [ ] Dry-run mode
- [ ] Doc `star-conquest-github-project.md`

## Critères d'acceptation
- [ ] 35 quêtes mappées 1:1
- [ ] Idempotent re-run

**Priorité : P2** · **Epic : DevOps**""",
    ),
    Issue(
        "CORE-037",
        "Live links Dock SC — couverture 100%",
        "enhancement",
        """## Contexte
Quêtes `available` doivent avoir CTA dock/showcase testé (`STAR_CONQUEST_LIVE_LINKS`).

## Objectif
Audit + compléter liens manquants ; 0 quête orpheline.

## Tâches
- [ ] Audit `star-conquest-live.ts`
- [ ] Compléter mappings
- [ ] Spec `star-conquest.spec.ts` coverage
- [ ] QA manuelle 250×550

## Critères d'acceptation
- [ ] 10 Ready live CTA naviguent correctement
- [ ] Toast feedback quête cohérent

**Priorité : P1** · **Epic : Star Conquest**""",
    ),
    Issue(
        "CORE-038",
        "Empty states dock (wallet, pending, peers)",
        "enhancement",
        """## Contexte
Listes vides sans guidance actionnable à 250px.

## Objectif
Skeletons + CTA contextuels (créer wallet, composer TX, add peer).

## Tâches
- [ ] wallet-panel empty
- [ ] pending-transactions empty
- [ ] peer-panel empty
- [ ] WCAG AA contrast

## Critères d'acceptation
- [ ] Zero-scroll preserved
- [ ] Spec snapshot empty states

**Priorité : P2** · **Epic : Frontend Shell**""",
    ),
    Issue(
        "CORE-039",
        "i18n FR/EN shell complet",
        "enhancement",
        """## Contexte
Toggle `navbar-locale-btn` ; strings hardcodés restants.

## Objectif
Service i18n central ; 100% labels dock/navbar/showcase.

## Tâches
- [ ] Audit strings hardcodés
- [ ] Fichiers fr.json / en.json
- [ ] Brancher composants shell
- [ ] Test layout EN no overflow

## Critères d'acceptation
- [ ] Toggle instant sans reload
- [ ] Persistance locale choix langue

**Priorité : P2** · **Epic : Frontend Shell**""",
    ),
    Issue(
        "CORE-040",
        "Virtual scroll peers + blocks lists",
        "enhancement",
        """## Contexte
Longues listes peers/blocks sans virtualisation — perf mobile.

## Objectif
CDK virtual scroll >50 rows, 60fps, mémoire stable.

## Tâches
- [ ] `app-peer-panel` virtual scroll
- [ ] `app-blocks-list` virtual scroll
- [ ] Test 500 blocs scroll
- [ ] Preserve 250px density

## Critères d'acceptation
- [ ] Mémoire <100MB après scroll
- [ ] Keyboard nav preserved

**Priorité : P2** · **Epic : Frontend Shell**""",
    ),
    Issue(
        "CORE-041",
        "Error banner taxonomy problem+json",
        "enhancement",
        """## Contexte
`app-error-banner` messages génériques ; backend expose problem+json.

## Objectif
Mapper 401/429/5xx/réseau → messages actionnables.

## Tâches
- [ ] Parser ApiProblemDetails
- [ ] Auto-dismiss 8s sauf 401
- [ ] Retry button si applicable
- [ ] Spec error mapping

## Critères d'acceptation
- [ ] Faucet 429 → countdown (lien CORE-032)
- [ ] Network offline → bannière persistent

**Priorité : P1** · **Epic : Frontend Shell**""",
    ),
    Issue(
        "CORE-042",
        "WiGLE live API (opt-in mock off)",
        "enhancement",
        """## Contexte
`WigleVisualizationService.java` mock by default ; `sc-map-wigle` Done avec mock.

## Objectif
Mode live WiGLE API derrière flag + rate limit.

## Tâches
- [ ] Flag `wigleLiveEnabled`
- [ ] Cache observations 1h
- [ ] FE légende + attribution
- [ ] Fallback mock graceful

## Critères d'acceptation
- [ ] Mock default prod
- [ ] Live dev/staging testable

**Priorité : P2** · **Epic : Metaverse**""",
    ),
    Issue(
        "CORE-043",
        "Proxy Overpass cache + rate limit",
        "enhancement",
        """## Contexte
`OverpassProxyService` — timeouts possibles sur bbox Marseille.

## Objectif
Cache TTL 24h/bbox, rate limit IP, fallback OSM local geojson.

## Tâches
- [ ] Cache layer backend
- [ ] Timeout 15s max
- [ ] Test `OverpassProxyServiceTest`
- [ ] FE loading state map

## Critères d'acceptation
- [ ] 2e load bbox → cache hit
- [ ] Overpass down → degraded mode

**Priorité : P1** · **Epic : Metaverse**""",
    ),
    Issue(
        "CORE-044",
        "Character NFT upload mesh utilisateur",
        "enhancement",
        """## Contexte
`CharacterNftController` backend ; FE stub `CharacterNftApiService`.

## Objectif
Upload STL/FBX ≤5MB, preview avatar, fallback CharacterAnon.

## Tâches
- [ ] Endpoint upload + validation MIME
- [ ] Brancher `app-character`
- [ ] Limite taille + virus scan stub
- [ ] Test character component

## Critères d'acceptation
- [ ] Invalid file → error UX
- [ ] Anon fallback si échec

**Priorité : P2** · **Epic : Metaverse**""",
    ),
    Issue(
        "CORE-045",
        "GitHub Actions — backend verify CI",
        "enhancement",
        """## Contexte
Pas de `.github/workflows/` ; JaCoCo 70% dans pom.xml.

## Objectif
Workflow PR : `./mvnw verify` + Postgres service container.

## Tâches
- [ ] `.github/workflows/backend.yml`
- [ ] Cache .m2
- [ ] JaCoCo gate 70%
- [ ] Badge README

## Critères d'acceptation
- [ ] PR rouge si tests fail
- [ ] <15min runtime

**Priorité : P0** · **Epic : DevOps**""",
    ),
    Issue(
        "CORE-046",
        "GitHub Actions — frontend test CI",
        "enhancement",
        """## Contexte
~174 spec.ts Vitest ; `release-verify.sh` local only.

## Objectif
Workflow PR : `npm ci && npm run test:coverage`.

## Tâches
- [ ] `.github/workflows/frontend.yml`
- [ ] Node 22 cache
- [ ] Upload coverage artifact
- [ ] Parallel with backend CI

## Critères d'acceptation
- [ ] Vitest green on PR
- [ ] Cache hit >80%

**Priorité : P0** · **Epic : DevOps**""",
    ),
    Issue(
        "CORE-047",
        "GitHub Actions — release-verify workflow",
        "enhancement",
        """## Contexte
`apps/dartchain-frontend/Dart/scripts/release-verify.sh` gate complet.

## Objectif
workflow_dispatch sur main exécute release gate.

## Tâches
- [ ] Workflow manual trigger
- [ ] Backend verify + frontend test + build
- [ ] Artifact dist/
- [ ] Notify on failure

## Critères d'acceptation
- [ ] Parité script local vs CI
- [ ] Log artifact retained 30d

**Priorité : P1** · **Epic : DevOps** · **Dépend : CORE-045, CORE-046**""",
    ),
    Issue(
        "CORE-048",
        "Cloudflare Pages deploy workflow",
        "enhancement",
        """## Contexte
`scripts/cloudflare-build.sh`, `wrangler.toml` — deploy manuel.

## Objectif
Push main → build + deploy Workers/Pages preview PR.

## Tâches
- [ ] Workflow cloudflare deploy
- [ ] Secrets CLOUDFLARE_API_TOKEN
- [ ] Preview URL comment PR
- [ ] `environment.prod.ts` generation

## Critères d'acceptation
- [ ] main → dartchain.pages.dev update
- [ ] PR preview smoke health backend

**Priorité : P1** · **Epic : DevOps**""",
    ),
    Issue(
        "CORE-049",
        "Playwright E2E parcours critique 250×550",
        "enhancement",
        """## Contexte
Pas d'e2e automatisé ; parcours register→faucet→swap→explorer manuel.

## Objectif
Suite Playwright viewport mobile portrait.

## Tâches
- [ ] Setup Playwright project
- [ ] Scénario critique 5 étapes
- [ ] CI headless + screenshots fail
- [ ] Staging backend target

## Critères d'acceptation
- [ ] Green on staging weekly
- [ ] <10min runtime

**Priorité : P1** · **Epic : DevOps**""",
    ),
    Issue(
        "CORE-050",
        "Observabilité unifiée — ops snapshot dashboard",
        "enhancement",
        """## Contexte
`OPS_SNAPSHOT_V1` admin ; navbar gauges partiellement alignées.

## Objectif
Dashboard admin : latence, WS, mempool, M4T3R/h, 5xx — refresh 10s.

## Tâches
- [ ] Enrichir ops snapshot metrics
- [ ] Admin panel gauges + sparklines
- [ ] Align navbar network status
- [ ] Test `ObservabilityAeIntegrationTest`

## Critères d'acceptation
- [ ] Admin-only 403 guest
- [ ] Metrics match backend truth ±1s

**Priorité : P1** · **Epic : DevOps**""",
    ),
]


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, check=False, **kwargs)


def existing_core_ids() -> set[str]:
    result = run(["gh", "issue", "list", "--repo", REPO, "--limit", "100", "--json", "title"])
    if result.returncode != 0:
        return set()
    titles = json.loads(result.stdout or "[]")
    ids: set[str] = set()
    for item in titles:
        title = item.get("title", "")
        if title.startswith("[CORE-"):
            ids.add(title.split("]")[0][1:])
    return ids


def create_issue(issue: Issue) -> str | None:
    title = f"[{issue.id}] {issue.title}"
    result = run(
        [
            "gh",
            "issue",
            "create",
            "--repo",
            REPO,
            "--title",
            title,
            "--label",
            issue.label,
            "--body",
            issue.body,
        ]
    )
    if result.returncode != 0:
        print(f"FAIL create {issue.id}: {result.stderr.strip()}", file=sys.stderr)
        return None
    url = result.stdout.strip()
    print(f"CREATED {issue.id}: {url}")
    return url


def add_to_project(url: str) -> bool:
    result = run(
        [
            "gh",
            "project",
            "item-add",
            str(PROJECT_NUMBER),
            "--owner",
            PROJECT_OWNER,
            "--url",
            url,
        ]
    )
    if result.returncode != 0:
        print(f"FAIL project add {url}: {result.stderr.strip()}", file=sys.stderr)
        return False
    return True


def main() -> int:
    if not os.environ.get("GH_TOKEN"):
        print("GH_TOKEN required", file=sys.stderr)
        return 1

    skip = existing_core_ids() if SKIP_EXISTING else set()
    created = 0
    skipped = 0
    project_added = 0
    failures = 0

    for issue in ISSUES:
        if issue.id in skip:
            print(f"SKIP {issue.id} (already exists)")
            skipped += 1
            continue
        url = create_issue(issue)
        if not url:
            failures += 1
            continue
        created += 1
        time.sleep(0.5)
        if add_to_project(url):
            project_added += 1
        else:
            failures += 1
        time.sleep(0.3)

    # Ensure pre-existing issues also on project
    if SKIP_EXISTING and skip:
        listed = run(["gh", "issue", "list", "--repo", REPO, "--limit", "100", "--json", "url,title"])
        if listed.returncode == 0:
            for item in json.loads(listed.stdout or "[]"):
                title = item.get("title", "")
                if title.startswith("[CORE-"):
                    if add_to_project(item["url"]):
                        print(f"PROJECT add existing: {title}")

    print(
        f"\nDone: created={created} skipped={skipped} project_added={project_added} failures={failures}"
    )
    print(f"Project: https://github.com/users/{PROJECT_OWNER}/projects/{PROJECT_NUMBER}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
