#!/usr/bin/env bash
# Lance la stack dev (Postgres + backend sur :8080) pour ng serve / Cursor.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/../.." && pwd)"

cd "${REPO_ROOT}"

echo "==> Arrêt stacks existantes"
for profile in prod default dev staging p2p db-local; do
  docker compose --profile "${profile}" down --remove-orphans 2>/dev/null || true
done

if [[ ! -f "${REPO_ROOT}/.env" ]]; then
  echo "==> Pas de .env — utilisation des defaults dev (postgres/dartchain)"
fi

echo "==> Démarrage profil dev"
docker compose --profile dev up --build -d

echo "==> Attente backend http://localhost:8080"
for i in $(seq 1 60); do
  if curl -fsS http://localhost:8080/api/health >/dev/null 2>&1; then
    echo "Backend OK"
    echo ""
    echo "UI dev : cd apps/dartchain-frontend/Dart && npm start"
    echo "API    : http://localhost:8080"
    echo "DB     : localhost:5432 (user/pass: dartchain sauf .env)"
    echo "Tables : cd apps/dartchain-backend && npm run db:tables"
    exit 0
  fi
  sleep 2
done

echo "FAIL: backend indisponible" >&2
docker compose --profile dev logs backend-dev --tail 40
exit 1
