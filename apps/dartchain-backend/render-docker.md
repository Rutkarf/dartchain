# Déploiement backend sur Render (image Docker Hub)

> Configurations complètes : voir `deploy/render.yaml`, `deploy/render.env.example`, `deploy/docker-hub.env.example`  
> Frontend Cloudflare Pages : `deploy/cloudflare.env.example`

## Image Docker (publique)

Page Hub : https://hub.docker.com/r/rutkarf/dartchain-backend

**URL exacte à coller dans Render :**

```text
docker.io/rutkarf/dartchain-backend:1.0.0
```

Tag `latest` (optionnel) :

```text
docker.io/rutkarf/dartchain-backend:latest
```

> Ne pas utiliser l’URL du site web (`https://hub.docker.com/...`) — uniquement l’URL registry ci-dessus.

## Build et push (local)

```bash
cd apps/dartchain-backend
docker build -t rutkarf/dartchain-backend:1.0.0 .
docker tag rutkarf/dartchain-backend:1.0.0 rutkarf/dartchain-backend:latest
docker login
docker push rutkarf/dartchain-backend:1.0.0
docker push rutkarf/dartchain-backend:latest
```

## Render — Web Service (Docker)

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Choisir **Deploy an existing image from a registry**
3. **Image URL** : `docker.io/rutkarf/dartchain-backend:latest`
4. **Credentials** : laisser **vide** (image publique — ne pas ajouter de Registry Secret sauf si le repo est passé en privé)
5. **Port** : `8080`
6. **Health check path** : `/api/health` (ne pas laisser `/` par défaut)

> **Architecture** : backend Render (Docker) + frontend Angular sur **Cloudflare Pages** (`*.pages.dev`).  
> Ne pas ouvrir l’URL Render dans le navigateur pour voir l’app — utiliser l’URL Cloudflare Pages.

### Si Render affiche « No public image found »

1. Vérifier l’orthographe : `rutkarf` en minuscules, tiret `dartchain-backend`, tag `:latest`
2. Supprimer toute **Registry Credential** incorrecte dans le service Render
3. Tester dans un terminal : `docker pull rutkarf/dartchain-backend:latest` (doit fonctionner sans login)
4. Attendre 1–2 min après un `docker push` puis réessayer sur Render
5. Utiliser le format complet : `docker.io/rutkarf/dartchain-backend:latest`

### Variables d'environnement utiles

| Variable | Exemple |
|----------|---------|
| `PORT` | `8080` (souvent défini automatiquement par Render) |
| `JAVA_TOOL_OPTIONS` | `-Xmx512m` (selon le plan Render) |
| `SPRING_PROFILES_ACTIVE` | `postgres,prod` |
| `DARTCHAIN_PERSISTENCE_MODE` | `postgres` |
| `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_NAME` | *(Render Postgres — voir `deploy/render.yaml`)* |
| `DATABASE_USERNAME` | `dartchain` |
| `DATABASE_PASSWORD` | *(secret)* |
| `DARTCHAIN_CORS_EXTRA` | `https://YOUR-PROJECT.pages.dev` |

Le profil `prod` active `application-prod.yaml` (compression HTTP, logs INFO).

### Stack locale complète (Docker)

À la racine du monorepo :

```bash
docker compose --profile default up --build
# UI : http://localhost:8080 (nginx → backend)
```

Voir les profils dans `docker-compose.yml` à la racine du monorepo (`dev`, `staging`, `prod`, `p2p`, `db-local`).

### PostgreSQL (persistance auth — ticket T1)

1. Créer une base PostgreSQL (Render Postgres, Neon, Supabase, etc.)
2. Lancer le backend avec le profil `postgres` :

```bash
docker compose --profile db-local up -d
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres
```

Variables minimales :

```text
SPRING_PROFILES_ACTIVE=postgres
DARTCHAIN_PERSISTENCE_MODE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=dartchain
DATABASE_USERNAME=dartchain
DATABASE_PASSWORD=dartchain
```

Flyway applique automatiquement `V1__auth.sql` (tables `users`, `auth_sessions`).

Sans PostgreSQL, le mode par défaut reste `memory` (JSON + sessions en mémoire).

## CORS

Le front Cloudflare (`*.pages.dev`) est déjà autorisé dans `CorsConfig.java`.
