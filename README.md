# DartChain

[![CI](https://github.com/Rutkarf/dartchain/actions/workflows/ci.yml/badge.svg)](https://github.com/Rutkarf/dartchain/actions/workflows/ci.yml)
[![Live](https://img.shields.io/badge/live-dartchain.pages.dev-1B4DFF)](https://dartchain.pages.dev)
[![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)](#prérequis)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-6DB33F?logo=springboot&logoColor=white)](#architecture)
[![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)](#architecture)
[![Node](https://img.shields.io/badge/Node-22-339933?logo=nodedotjs&logoColor=white)](#prérequis)

Démo full-stack d’une **chaîne native** (token **R4V3**, micro-unité **M4T3R**), d’un **wallet / faucet / swap**, et d’un **jumeau 3D du Vieux-Port de Marseille** (OpenStreetMap + Three.js), le tout dans un shell compact 250×550.

| | |
|---|---|
| **Démo** | [https://dartchain.pages.dev](https://dartchain.pages.dev) |
| **API prod** | [https://dartchain-backend-1-0-0.onrender.com](https://dartchain-backend-1-0-0.onrender.com) — health : [`/api/health`](https://dartchain-backend-1-0-0.onrender.com/api/health) |
| **Dépôt GitHub** | [Rutkarf/dartchain](https://github.com/Rutkarf/dartchain) |
| **Image backend** | [`docker.io/rutkarf/dartchain-backend:1.0.0`](https://hub.docker.com/r/rutkarf/dartchain-backend) |

> **Ce n’est pas une crypto réelle.** Aucun mainnet, aucun custodian, aucun achat. Tokens de démonstration uniquement. Les données Marseille sont des footprints OSM (précision ~2–5 m), pas un levé IGN.

---

## Table des matières

1. [Présentation](#présentation)
2. [Fonctionnalités (live)](#fonctionnalités-live)
3. [Feuille de route](#feuille-de-route)
4. [Architecture](#architecture)
5. [Prérequis](#prérequis)
6. [Cloner le dépôt](#cloner-le-dépôt)
7. [Lancer en local](#lancer-en-local)
8. [Docker Compose](#docker-compose)
9. [Variables d’environnement](#variables-denvironnement)
10. [Structure du monorepo](#structure-du-monorepo)
11. [Scripts utiles](#scripts-utiles)
12. [Tests et CI](#tests-et-ci)
13. [Déploiement](#déploiement)
14. [Attribution](#attribution)
15. [Licence et avertissements](#licence-et-avertissements)

---

## Présentation

DartChain est un **monorepo** :

- **Frontend** — SPA Angular 21 + Three.js (`apps/dartchain-frontend/Dart`). Une seule page, sans routes : navbar, swap, showcase, dock, chart, overlay Star Conquest, et le sol 3D Marseille (*floor peek*).
- **Backend** — API Spring Boot 3.5 / Java 21 (`apps/dartchain-backend`). Blockchain démo (blocs, mempool, mine), wallet, faucet, swap, peers P2P, quêtes, showcase, WebSockets, placements, rewards M4T3R.

Chaîne démo : **chain-id 3377**, réseau *DartChain Native*, token natif **R4V3**. Persistance locale : mémoire ou **PostgreSQL 16**.

---

## Fonctionnalités (live)

Inventaire aligné sur [dartchain.pages.dev](https://dartchain.pages.dev) et ce dépôt (août 2026).

### Ville 3D — MetaVerseBB (Marseille)

- Spawn Vieux-Port / Ombrière (Quai des Belges), projection locale `marseille-local-v1`
- Footprints OSM, extrusions, eau du port, collisions, streaming par chunks
- Marche clavier + joysticks **MOVE** / **VIEW**, caméra 3ᵉ personne
- Avatar CharacterAnon (mesh FBX/STL, stub NFT)
- Champ **M4T3R** au sol : cellules, trails, FX de ramassage, traces de pas
- HUD placements RDC (hit-volumes, inquiry API)
- Overlay cyberpunk (néons / hologrammes, qualités medium+)
- Atmosphère, fog, LOD bâtiments, gouverneur de perf (jusqu’à *ultra-low*)
- Debug F9 (stats M4T3R) et F11 (géo)

### Shell produit

- Viewport cible **250×550**, i18n **FR / EN**, focus trap clavier
- **Navbar** : ticker live, recherche explorer, sélecteur de projet (launch), état réseau (latence, WebSocket)
- **Auth** : inscription / connexion (JWT), boutons OAuth (Google, GitHub, Discord, Meta, Apple, Microsoft, X) — souvent non configurés hors prod
- **Swap** LaunchLab : quote verrouillée 30 s, label slippage 0,5 %, confirm HUD
- **Chart** token (collapse indépendant)

### Showcase

| Onglet | Contenu |
|--------|---------|
| **TOUS** | Fil d’actualités + drawers |
| **R4V3** | Hub token, piliers, FAQ communauté, whitepaper |
| **CHAT** | Chat temps réel (WebSocket) |
| **LABZ** | Launchpad (projets, whitepaper, CTA swap) |
| **D.A.O** | Votes / preview gouvernance |
| **MARCHÉ** | Carnet et tokens |

### Dock

| Onglet | Contenu |
|--------|---------|
| **Wallet** | Création, solde R4V3, envoi / réception / mine, explorer d’adresse, clés masquées + reveal, copie d’adresse |
| **Faucet** | Claim testnet m4t3r (compte + wallet), cooldown, historique, export JSON |
| **Transactions** | Mempool + compositeur |
| **Chaîne** | Liste / graphe, filtres, export, détail hash/nonce |
| **Quêtes** | Quotidiennes, auto, mission, coffre hebdo, XP, claim R4V3 |
| **Peers** | Connexion `ws://` / `wss://`, favoris, latence, sync |
| **Admin** | Observabilité native (jauges, latence HTTP, événements) — visible uniquement si `isAdmin()` |

### Star Conquest

35 quêtes, 5 galaxies, scanner des étoiles occluses, panneau holographique. La progression se fait par **actions produit** (swap, faucet, login…), pas par un claim magique sur l’étoile. Persistance actuelle : `localStorage`. Univers live : **Ruche** (agent swarm).

### API backend (aperçu)

`/api/health`, `/api/auth`, `/api/blockchain`, `/api/blocks`, `/api/swap`, `/api/crypto-rates`, `/api/quests`, `/api/peers`, `/api/ops`, `/api/m4t3r`, `/api/showcase/*`, `/api/metaverse/overpass`, WebSockets `/ws/live` et `/ws/chat`. Contrats v1 sous `/api/v1/…`.

---

## Feuille de route

Issu des boards produit et du code — pas d’annonces marketing.

**En cours**

- Sélecteur de slippage mémorisé (le label 0,5 % est déjà en production)
- Soft-cache des taux de change (anti-spam réseau)

**Bloqué / dépendances**

- Prévisualisation du hash de transaction avant envoi
- Synchronisation Spring des quêtes Star Conquest (aujourd’hui `localStorage` uniquement)
- Mint NFT avatar (API stub, mesh local en secours)
- Géodonnées IGN / BD TOPO (contrainte de licence)
- Ombrière à l’échelle publiée 46×22 m (le mesh gameplay fait 18,4×12,2 m ; un resize casserait spawn et collisions)

**Préparés dans le code, non branchés en live**

- Autres univers Star Conquest (Nébuleuse, Cortex, Orbital P2P, Grille M4T3R, Zodiac, Aurore)
- Overlay nuit / réflexions humides Marseille
- Scène ladder-climb / R4V3 (présente, non montée dans le shell)
- OAuth réellement provisionné côté serveur
- Administration des FAQ via API
- Jumeau plus dense (districts, hologrammes, calibration OSM derrière flags)

Hors scope : mainnet, custody, token réel.

---

## Architecture

```
  Navigateur (Angular 21 + Three.js)
  dartchain.pages.dev  |  localhost:4200
           │
           │  /api  /ws  (proxy en local)
           ▼
  Spring Boot 3.5 / Java 21
  localhost:8080  |  Render
           │
           ▼
  PostgreSQL 16   (ou mémoire si DARTCHAIN_PERSISTENCE_MODE=memory)
```

**Frontend** — chaque domaine sous `src/app/{domaine}/` contient typiquement :

- `components/` — UI du domaine
- `services/` — logique métier injectable
- `models/` — types et DTOs locaux

**Transversal (`core/`)** : i18n, config produit, utils Three.js, `shell-feedback.service`.

| Domaine | Rôle |
|---------|------|
| `world-map/` | Carte Marseille OSM / Three.js, M4T3R, placements |
| `metaverse/` | Floor 3D (`app-three-floor`), character, caméra, joysticks |
| `navbar/` | Barre supérieure, searchbar, ticker, brand crypto, statut réseau |
| `blockchain/` | Blocs, transactions, API client |
| `exchange/` | Swap, taux crypto, chart |
| `showcase/` | Launchpad, news, chart, DAO, chat, R4V3, marché |
| `dock/` | Panneaux dock bas |
| `wallet/`, `faucet/`, `quests/`, `peers/`, `auth/` | Surfaces dock / drawers |
| `star-conquest/` | Quest graph, particle background, services SC |
| `r4v3-scene/` | Scènes R4V3 + ladder-climb (démo) |
| `components/` | Composants **partagés** uniquement (badges 3D, error-banner…) |

Alias TypeScript : `@world-map/*`, `@blockchain/*`, `@navbar/*`, `@metaverse/*`, `@star-conquest/*`, etc. (`tsconfig.json`).

**Backend** — packages `io.dartchain.backend.{domaine}/` :

- `application/` — services
- `dto/`, `model/`
- `infrastructure/web/` — contrôleurs REST

Plus de packages globaux `controller/`, `service/`, `dto/` à la racine.

---

## Prérequis

Outils à installer **avant** de cloner et de lancer les deux stacks.

| Outil | Version | Usage |
|-------|---------|--------|
| **Git** | 2.x | Clone, branches |
| **Node.js** | **22** (voir `.node-version`) | Frontend Angular, scripts npm backend |
| **npm** | **9.2+** (`packageManager` frontend : `npm@9.2.0`) | Dépendances JS |
| **JDK** | **21** (Temurin recommandé) | Spring Boot — le wrapper Maven `./mvnw` suffit, Maven global optionnel |
| **Docker** + **Compose v2** | Engine 24+ | PostgreSQL 16, stacks `dev` / `default` / `prod` |
| **curl** / **ss** | — | Scripts ops `apps/dartchain-backend/bin/` |

Recommandé, pas obligatoire :

| Outil | Usage |
|-------|--------|
| **pg_isready** (client PostgreSQL) | Détection plus rapide de Postgres local |
| **Google Chrome** ou Chromium | DevTools + WebGL (la carte 3D exige un GPU / WebGL) |
| **IDE** | IntelliJ / VS Code / Cursor — Lombok activé pour le backend |

Vérification rapide :

```bash
git --version
node -v          # v22.x
npm -v           # 9.2+
java -version    # 21
docker --version
docker compose version
```

Mémoire indicative : ~4 Go RAM pour le couple `ng serve` + Spring + Postgres. WebGL requis pour Marseille / Star Conquest.

---

## Cloner le dépôt

Dépôt de production (branch `main` → Cloudflare Pages) :

```bash
git clone https://github.com/Rutkarf/dartchain.git
cd dartchain
```

SSH :

```bash
git clone git@github.com:Rutkarf/dartchain.git
cd dartchain
```

Fork de travail fréquent en local (`origin`) + dépôt Pages (`upstream`) :

```bash
git clone https://github.com/FrakturKorp/dartchain-.git
cd dartchain-
git remote add upstream https://github.com/Rutkarf/dartchain.git
```

Après un push sur le fork, synchroniser Pages :

```bash
git push upstream main
```

---

## Lancer en local

### Démarrage rapide

```bash
# Postgres + backend
cd apps/dartchain-backend && npm start

# Frontend (autre terminal)
cd apps/dartchain-frontend/Dart && npm start
```

Stack Docker : `cd apps/dartchain-backend && npm run dev:stack`

Deux processus : **backend (port 8080)** + **frontend (port 4200)**. Le frontend proxifie `/api` et `/ws` vers `127.0.0.1:8080` (`proxy.conf.json`) — pas de CORS en développement.

### 1. Backend (Spring Boot + PostgreSQL)

```bash
cd apps/dartchain-backend
npm start
```

`npm start` exécute `bin/run-with-postgres.sh` :

1. démarre un conteneur `postgres:16` si rien n’écoute sur `localhost:5432` (user/db/mot de passe `dartchain`) ;
2. lance `./mvnw spring-boot:run` avec le profil `postgres`.

API : [http://localhost:8080](http://localhost:8080) — health : [http://localhost:8080/api/health](http://localhost:8080/api/health).

Sans npm (équivalent) :

```bash
cd apps/dartchain-backend
./bin/postgres-up.sh
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres
```

Mémoire seule (sans Postgres) :

```bash
cd apps/dartchain-backend
./mvnw spring-boot:run
```

### 2. Frontend (Angular)

Dans un **second terminal** :

```bash
cd apps/dartchain-frontend/Dart
npm ci
npm start
```

UI : [http://localhost:4200](http://localhost:4200) (`ng serve`, configuration `development`, host `localhost`).

`npm ci` n’est nécessaire qu’à la première install ou après un changement de lockfile.

### Ordre et ports

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://localhost:4200 | 4200 |
| Backend | http://localhost:8080 | 8080 |
| PostgreSQL | `localhost:5432` | 5432 |
| Overpass (dev) | proxifié `/overpass` → `lz4.overpass-api.de` | — |

Si le 8080 est déjà pris, `run-with-postgres.sh` tente de libérer le port (conteneur Docker ou PID local). Sinon : `PORT=8081 npm start` côté backend.

### Stack Docker « tout-en-un » (dev hybride)

Postgres + backend en conteneurs, UI via `ng serve` :

```bash
cd apps/dartchain-backend
npm run dev:stack
# autre terminal
cd apps/dartchain-frontend/Dart && npm start
```

Détaché : `npm run dev:start-detached` / `npm run dev:stop-detached`.

Données :

```bash
cd apps/dartchain-backend
npm run data:seed      # JSON local, profil Spring seed
npm run data:import    # JSON → Postgres (profils postgres + data-import)
```

---

## Docker Compose

Fichier unique à la racine : `docker-compose.yml` (profils).

```bash
# Postgres + backend + frontend (nginx :8080)
docker compose --profile default up --build

# Postgres + backend, UI en ng serve (ports 5432 / 8080)
docker compose --profile dev up --build -d

# Postgres seul (Spring lancé à la main)
docker compose --profile db-local up -d

# Staging (frontend :9080)
docker compose --profile staging up --build

# Production HA (2 backends + nginx)
# Prérequis : cd apps/dartchain-backend && npm run secrets:generate
docker compose --profile prod up --build -d

# Deux nœuds P2P (8081 / 8082)
docker compose --profile p2p up --build -d
```

Images locales :

```bash
docker build -t dartchain-backend:local apps/dartchain-backend
docker build -t dartchain-frontend:local apps/dartchain-frontend/Dart
```

---

## Variables d’environnement

Un fichier `.env` à la **racine du monorepo** est chargé par les scripts `bin/dev-env.sh`.

### Backend (dev local — défauts déjà fournis)

| Variable | Défaut local | Rôle |
|----------|--------------|------|
| `PORT` | `8080` | Port HTTP |
| `SPRING_PROFILES_ACTIVE` | `postgres` | Profils Spring |
| `DARTCHAIN_PERSISTENCE_MODE` | `postgres` | `memory` ou `postgres` |
| `DATABASE_URL` | `jdbc:postgresql://localhost:5432/dartchain` | JDBC |
| `DATABASE_USERNAME` / `DATABASE_PASSWORD` | `dartchain` / `dartchain` | Identifiants |
| `DARTCHAIN_JWT_SECRET` | secret de dev (32+ car.) | JWT — **changer en prod** |
| `DARTCHAIN_ACTUATOR_TOKEN` | token de dev | Actuator restreint en prod |
| `DARTCHAIN_BOOTSTRAP_ADMIN` | vide | Username admin bootstrap |
| `OAUTH_*` | désactivé | Providers OAuth |

Production : générer les secrets avec `cd apps/dartchain-backend && npm run secrets:generate`. Ne jamais committer `.env` ni les secrets Render.

Exemples : [`deploy/render.env.example`](deploy/render.env.example), [`deploy/cloudflare.env.example`](deploy/cloudflare.env.example), [`deploy/docker-hub.env.example`](deploy/docker-hub.env.example).

### Frontend

En **dev**, les URLs passent par le proxy (`apiUrl: '/api'`).  
En **Cloudflare**, `tools/prepare-cloudflare-env.mjs` injecte :

| Variable | Exemple prod |
|----------|----------------|
| `BACKEND_URL` | `https://dartchain-backend-1-0-0.onrender.com` |
| `SHOWCASE_ENABLED` | `true` |

---

## Structure du monorepo

```
.
├── apps/
│   ├── dartchain-backend/          # API Java + bin/ (ops local)
│   │   ├── bin/                    # postgres, smoke, secrets, backup
│   │   ├── src/main/java/io/dartchain/backend/
│   │   ├── src/main/resources/     # application.yaml + profils
│   │   ├── pom.xml
│   │   └── Dockerfile
│   └── dartchain-frontend/Dart/    # SPA Angular
│       ├── src/app/{domaine}/
│       ├── src/environments/
│       ├── tools/                  # build Cloudflare, GeoJSON Marseille
│       ├── proxy.conf.json
│       └── Dockerfile
├── deploy/                         # Exemples Render, Cloudflare, Docker Hub
├── scripts/                        # cloudflare-build.sh / cloudflare-deploy.sh
├── docker-compose.yml
├── .github/workflows/              # ci.yml + deploy Pages manuel
└── .node-version                   # 22
```

---

## Scripts utiles

### Backend (`apps/dartchain-backend`)

| Commande | Effet |
|----------|--------|
| `npm start` | Postgres + Spring Boot (premier plan) |
| `npm run dev:stack` | Stack Docker hybride |
| `npm run postgres:up` | Conteneur Postgres seul |
| `npm run smoke` | Smoke API (MockMvc) |
| `npm run smoke:live` | Smoke HTTP contre une stack déjà up |
| `npm run verify:api` | Contrat API v1 |
| `npm run verify:release` | `./mvnw verify` (tests + JaCoCo ≥ 65 %) |
| `npm run data:seed` | Seed JSON local (profil Spring `seed`) |
| `npm run data:import` | Import JSON → Postgres (profils `postgres` + `data-import`) |
| `npm run secrets:generate` | Secrets prod |
| `npm run db:shell` / `db:backup` | Ops Postgres |

Détail des scripts shell : [`apps/dartchain-backend/bin/README.md`](apps/dartchain-backend/bin/README.md).

### Frontend (`apps/dartchain-frontend/Dart`)

| Commande | Effet |
|----------|--------|
| `npm start` | `ng serve` → http://localhost:4200 |
| `npm test` | Vitest |
| `npm run test:coverage` | Couverture |
| `npm run verify:a11y` | Contrat accessibilité |
| `npm run verify:quality` | Tests + a11y |
| `npm run build` | Build Angular |
| `npm run build:cloudflare` | Build prod Pages |
| `npm run build:geojson` | GeoJSON Marseille |
| `npm run verify:release` | Verify backend + couverture front |

---

## Tests et CI

```bash
# Frontend — tests Vitest + contrat a11y
cd apps/dartchain-frontend/Dart
npm test -- --no-watch --coverage=false
npm run verify:a11y
npm run build

# Backend — tests + gate JaCoCo (verify, floor 65 %)
cd apps/dartchain-backend
./mvnw verify
```

Workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (push `main` et pull requests) :

1. Backend : Temurin 21 + `./mvnw verify`
2. Frontend : Node 22 + `npm ci`, tests, a11y, `ng build`, smoke `build:cloudflare`
3. Docker : build des deux images

Déploiement Pages manuel (workflow_dispatch) : [`.github/workflows/cloudflare-deploy.yml`](.github/workflows/cloudflare-deploy.yml).

---

## Déploiement

| Cible | Rôle | Notes |
|-------|------|--------|
| **Cloudflare Pages** | Frontend prod | [dartchain.pages.dev](https://dartchain.pages.dev) — branch `main` de `Rutkarf/dartchain`, Node 22, `bash scripts/cloudflare-build.sh` |
| **Render** | Backend + Postgres | Image `docker.io/rutkarf/dartchain-backend:1.0.0`, health `/api/health` — voir [`apps/dartchain-backend/render-docker.md`](apps/dartchain-backend/render-docker.md) |

CORS autorise `localhost`, `https://dartchain.pages.dev` et `*.pages.dev` / `*.onrender.com`. Ajouter une origine via `DARTCHAIN_CORS_EXTRA`.

---

## Attribution

Bâtiments et voirie : © contributeurs [OpenStreetMap](https://www.openstreetmap.org/copyright), licence **ODbL**.  
Nœuds cadastre OSM : « cadastre-dgi-fr source : Direction Générale des Impôts - Cadastre ».

Aucune approbation de la Ville de Marseille, de l’IGN ou d’un commerce représenté. Détail : [`apps/dartchain-frontend/Dart/src/app/world-map/marseille-twin/marseille-data-provenance.md`](apps/dartchain-frontend/Dart/src/app/world-map/marseille-twin/marseille-data-provenance.md).

---

## Licence et avertissements

Aucun fichier `LICENSE` n’est publié dans ce dépôt : traiter le code comme **propriétaire** jusqu’à mention contraire.

- Tokens **R4V3 / M4T3R** : démonstration uniquement, sans valeur.
- Ne pas exposer de clés privées, JWT ou secrets d’actuator.
- Ne pas utiliser le faucet / le mineur comme infrastructure financière.
- Issues et PR : rester dans le périmètre démo (pas d’intégration de géodonnées propriétaires, pas de mainnet).

Ops shell live : [`apps/dartchain-backend/bin/README.md`](apps/dartchain-backend/bin/README.md).
