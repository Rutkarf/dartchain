# Scripts ops backend

Scripts shell pour dev local, Postgres Docker et vérifications **live** (stack déjà démarrée).

Les vérifications couvertes par les tests d'intégration Java utilisent `./mvnw test` via `package.json` (`npm run smoke`, `verify:api`, etc.).

## Dev local

| Script | Commande npm |
|--------|----------------|
| `run-with-postgres.sh` | `npm start` |
| `postgres-up.sh` | `npm run postgres:up` |
| `dev-stack.sh` | `npm run dev:stack` |
| `start-dev-detached.sh` | `npm run dev:start-detached` |
| `stop-dev-detached.sh` | `npm run dev:stop-detached` |

## Données

| Action | Commande npm |
|--------|----------------|
| Seed JSON local | `npm run data:seed` (profil Spring `seed`, `LocalDataSeeder`) |
| Import JSON → Postgres | `npm run data:import` (profils `postgres` + `data-import`) |

## Ops live (curl / docker compose)

| Script | Commande npm |
|--------|----------------|
| `smoke-api-live.sh` | `npm run smoke:live [BASE_URL]` |
| `verify-prod-hardening.sh` | `npm run verify:prod` |
| `verify-prod-ha.sh` | `npm run verify:prod-ha` |
| `verify-p2p-sync.sh` | `npm run verify:p2p` |
| `check-stack-alerts.sh` | `npm run verify:alerts` |
| `backup-postgres.sh` | `npm run db:backup` |
| `db-shell.sh` / `db-tables.sh` | `npm run db:shell` / `db:tables` |
| `generate-secrets.sh` | `npm run secrets:generate` |
| `verify-secrets.sh` | `npm run verify:secrets` |
