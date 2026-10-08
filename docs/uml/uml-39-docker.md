# 39 — Docker

## Objectif

Décrire les services et les profils réels de `docker-compose.yml`, plus les deux Dockerfiles. Les diagrammes 21 à 40 sont des vues complémentaires. Ils ne font pas partie des 14 diagrammes UML officiels.

Il n’y a pas de service Redis. Il n’y a pas de service Kafka. Ils ne sont pas dessinés.

## Statut

Élevé. Confirmé par la lecture du compose et des Dockerfiles. Les conteneurs n’ont pas été démarrés dans cette session : la fiche décrit le fichier.

## Sources analysées

- `docker-compose.yml` (en-tête de profils, services, volumes, healthchecks)
- `apps/dartchain-backend/Dockerfile`
- `apps/dartchain-frontend/Dart/Dockerfile`
- `apps/dartchain-frontend/Dart/nginx.conf`
- `infra/nginx/nginx.prod.conf` (monté par `frontend-prod`)

Mots de passe, JWT, jeton actuator : variables d’environnement seulement, valeurs [SECRET MASQUÉ].

## Éléments représentés

Six profils. Services nommés. Images. Ports publiés. Volumes Postgres. Healthchecks. Absence de Redis.

## Diagramme

```mermaid
flowchart TB
  subgraph default [profil default]
    pg[postgres]
    be[backend]
    fe[frontend]
    fe --> be --> pg
  end
  subgraph dev [profil dev]
    pgd[postgres-dev]
    bed[backend-dev]
    bed --> pgd
  end
  subgraph dbl [profil db-local]
    pgl[postgres-local]
  end
  subgraph st [profil staging]
    pgs[postgres-staging]
    bes[backend-staging]
    fes[frontend-staging]
    fes --> bes --> pgs
  end
  subgraph prod [profil prod]
    pgp[postgres-prod]
    a[backend-a]
    b[backend-b]
    fep[frontend-prod]
    fep --> a --> pgp
    fep --> b --> pgp
  end
  subgraph p2p [profil p2p]
    pga[postgres-a]
    pgb[postgres-b]
    na[backend-p2p-a]
    nb[backend-p2p-b]
    na --> pga
    nb --> pgb
  end
```

Légende : un profil Compose n’active que son cadre. `default` ne lance pas `backend-a`. Aucun cadre ne contient Redis.

## Explication

Le fichier annonce un compose unique. Commandes écrites en commentaire :

- `docker compose --profile default up --build`
- `docker compose --profile dev up --build -d` (Postgres + backend, UI via `ng serve`)
- `docker compose --profile staging up --build`
- `docker compose --profile prod up --build -d` (nginx + 2 backends)
- `docker compose --profile p2p up --build -d`
- `docker compose --profile db-local up -d` (Postgres seul)

| Profil | Services | Image / build | Port publié lu |
| --- | --- | --- | --- |
| `default` | `postgres`, `backend`, `frontend` | `postgres:16-alpine` ; build des deux Dockerfiles | frontend `${APP_PORT:-8080}:80` |
| `dev` | `postgres-dev`, `backend-dev` | idem | Postgres `${POSTGRES_DEV_PORT:-5432}:5432` ; backend `${BACKEND_DEV_PORT:-8080}:8080` |
| `db-local` | `postgres-local` | `postgres:16-alpine` | `${POSTGRES_LOCAL_PORT:-5432}:5432` |
| `staging` | `postgres-staging`, `backend-staging`, `frontend-staging` | idem default | Postgres `${POSTGRES_STAGING_PORT:-5433}:5432` ; frontend `${APP_STAGING_PORT:-9080}:80` |
| `prod` | `postgres-prod`, `backend-a`, `backend-b`, `frontend-prod` | idem ; nginx prod monté en volume | frontend `${APP_PORT:-8080}:80` |
| `p2p` | `postgres-a`, `postgres-b`, `backend-p2p-a`, `backend-p2p-b` | Dockerfiles backend | `${P2P_NODE_A_PORT:-8081}:8080` et `${P2P_NODE_B_PORT:-8082}:8080` |

Volumes nommés : `dartchain_pg_data`, `dartchain_pg_dev_data`, `dartchain_pg_local_data`, `dartchain_staging_pg_data`, `dartchain_pg_prod_data`, `dartchain_pg_a`, `dartchain_pg_b`.

Healthchecks :

- Postgres : `pg_isready` sur l’utilisateur et la base du service.
- Backend : ancre `x-backend-healthcheck`, `curl` `/actuator/health` puis `/api/health`, intervalle 10 s, timeout 5 s, retries 12, `start_period` 45 s. `backend-staging`, `backend-a` et `backend-b` ne testent que `/actuator/health` dans leur bloc propre.
- Frontend : `wget` sur `http://127.0.0.1/`.

`depends_on` avec `condition: service_healthy` relie frontend → backend → postgres dans les profils qui ont les trois, et chaque backend p2p à sa base.

Variables communes des backends « prod-like » (`x-backend-env-prod`) : `PORT=8080`, `SPRING_PROFILES_ACTIVE=postgres,prod`, `DARTCHAIN_PERSISTENCE_MODE=postgres`, `DATABASE_URL` vers l’hôte `postgres` (surchargé pour `backend-a` / `backend-b` vers `postgres-prod`). Les secrets sont exigés par interpolation (`POSTGRES_PASSWORD`, `DARTCHAIN_JWT_SECRET`, `DARTCHAIN_ACTUATOR_TOKEN`) : [SECRET MASQUÉ]. OAuth forcé `OAUTH_DEV_MOCK_ENABLED=false` dans cette ancre. `backend-dev` active le mock OAuth par défaut dans le fichier (`OAUTH_DEV_MOCK_ENABLED` défaut `true`) et le profil Spring `postgres` sans `prod`.

Dockerfile backend : build Maven `./mvnw package -DskipTests` sur Temurin 21 JDK, runtime JRE 21, `curl`, user `appuser`, jar `/app/app.jar`, healthcheck `/api/health`.

Dockerfile frontend : `npm ci --legacy-peer-deps`, `npm run build:docker`, puis nginx 1.27 qui copie `nginx.conf` et `dist/browser`.

`frontend-prod` remplace la conf par `infra/nginx/nginx.prod.conf` (deux upstreams). Les autres frontends gardent la conf d’image (`backend:8080`), ce qui correspond aux noms de service `backend` ou, pour staging, au nom `backend-staging`. Le nginx d’image pointe en dur sur l’hôte Docker `backend`. Le service staging s’appelle `backend-staging`. Cette fiche ne réécrit pas le nginx : elle signale l’écart de nom.

## Correspondance avec le code

Fichier unique : `/home/azertyuiop/dev/dartchain/docker-compose.yml`. Pas d’autre `docker-compose*.yml` trouvé. Pas de service dont le nom ou l’image contient `redis`.

`.github/workflows/ci.yml`, job `docker`, construit `dartchain-backend:ci` et `dartchain-frontend:ci`. Ce sont des tags de pipeline, pas des services du compose.

## Hypothèses

- Le profil `default` est bien un profil Compose nommé, pas le comportement implicite sans `--profile`. Le fichier met `profiles: [default]` sur `postgres`, `backend` et `frontend`. Sans `--profile default`, ces services ne partent pas. C’est le sens des profils Compose quand ils sont déclarés.
- `frontend-staging` utilise le Dockerfile qui proxy vers l’hôte `backend`. Le service voisin s’appelle `backend-staging`. Si le réseau Docker ne crée pas d’alias `backend`, le proxy staging ne joint pas l’API. Ce n’est pas un essai `docker compose` ; c’est une lecture des noms.

## Anomalies détectées

- Nom d’upstream `backend` figé dans `nginx.conf`, alors que staging nomme son API `backend-staging` et la prod nomme `backend-a` / `backend-b` (la prod corrige cela par un volume de conf).
- Healthcheck staging / prod backend : seulement `/actuator/health`, alors que l’ancre default accepte aussi `/api/health`.
- `backend-dev` contient des défauts de secrets de développement dans le YAML Compose. Ils ne sont pas recopiés. Les traiter comme [SECRET MASQUÉ].
- Aucun Redis pour les sessions ou le rate limit. Le rate limit mémoire est une `ConcurrentHashMap` dans la JVM (`InMemoryRateLimitCounterStore`), et en postgres une table `rate_limit_buckets`.

## Recommandations

- Documenter la commande avec `--profile`, puisque `default` est un profil nommé.
- Aligner le `proxy_pass` de l’image avec le nom de service réel de chaque profil, ou ne monter le nginx d’image que là où le service s’appelle `backend`.
- Ne pas ajouter Redis dans un futur schéma « pour faire propre » sans un service dans ce fichier.
