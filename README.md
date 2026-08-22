# DartChain Monorepo

Blockchain demo stack : backend Spring Boot, frontend Angular.

## Structure

```
apps/
├── dartchain-backend/     # API Java + bin/ (ops dev local)
└── dartchain-frontend/Dart/  # SPA Angular + tools/ (build CF, geojson)

deploy/                    # Exemples d’env (Render, Cloudflare)
.github/workflows/         # CI + déploiement Cloudflare
```

## Architecture frontend (par domaine)

Chaque domaine sous `src/app/{domaine}/` contient typiquement :

- `components/` — UI du domaine
- `services/` — logique métier injectable
- `models/` — types et DTOs locaux

**Transversal (`core/`)** : i18n, config produit, utils Three.js, `shell-feedback.service`.

| Domaine | Rôle |
|---------|------|
| `world-map/` | Carte Marseille OSM/Three.js (M4T3R, placements, WiGLE) |
| `navbar/` | Barre supérieure, searchbar, ticker, brand crypto |
| `blockchain/` | Blocs, transactions, API client |
| `exchange/` | Swap, taux crypto |
| `showcase/` | Launchpad, news, chart, DAO |
| `dock/` | Panneaux dock bas |
| `metaverse/` | Floor 3D (`app-three-floor`), services character/camera |
| `star-conquest/` | Quest graph, particle background, services SC |
| `r4v3-scene/` | Scènes R4V3 + ladder-climb (démo) |
| `components/` | Composants **partagés** uniquement (badges 3D, error-banner…) |

Alias TypeScript : `@world-map/*`, `@blockchain/*`, `@navbar/*`, `@metaverse/*`, `@star-conquest/*`, etc. (`tsconfig.json`).

## Architecture backend

Packages par domaine sous `io.dartchain.backend.{domaine}/` :

- `application/` — services
- `dto/`, `model/`
- `infrastructure/web/` — controllers REST

Plus de packages globaux `controller/`, `service/`, `dto/` à la racine.

## Démarrage rapide

```bash
# Postgres + backend
cd apps/dartchain-backend && npm start

# Frontend (autre terminal)
cd apps/dartchain-frontend/Dart && npm start
```

Stack Docker : `cd apps/dartchain-backend && npm run dev:stack`

## Validation

```bash
# Frontend — tests Vitest + contrat a11y
cd apps/dartchain-frontend/Dart
npm test -- --no-watch --coverage=false
npm run verify:a11y
npm run build

# Backend — tests + gate JaCoCo (verify, floor 65%)
cd apps/dartchain-backend
./mvnw verify
```

## Scripts npm utiles

| Commande | Emplacement | Effet |
|----------|-------------|-------|
| `npm start` | backend | Postgres + Spring Boot |
| `npm run smoke` | backend | Smoke API (MockMvc) |
| `npm run verify:api` | backend | Contrat API v1 (JUnit) |
| `npm run build:cloudflare` | frontend | Build prod Cloudflare |
| `npm run verify:a11y` | frontend | Contrat UX/a11y (Vitest) |
| `npm run verify:release` | frontend | mvn verify + couverture frontend |

Ops shell live : voir [apps/dartchain-backend/bin/README.md](apps/dartchain-backend/bin/README.md).

Import JSON → Postgres : `npm run data:import` (profils Spring `postgres` + `data-import`).
