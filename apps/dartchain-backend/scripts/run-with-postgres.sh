#!/usr/bin/env bash
# Dev local : Postgres + backend Spring Boot (reste au premier plan jusqu'à Ctrl+C).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

# shellcheck source=scripts/lib/dev-env.sh
source "$ROOT_DIR/scripts/lib/dev-env.sh"

dev_load_repo_env "$REPO_ROOT"

echo "==> Vérification PostgreSQL"
if dev_postgres_ready; then
  if [[ -n "${DEV_POSTGRES_CONTAINER:-}" ]]; then
    echo "    OK via conteneur ${DEV_POSTGRES_CONTAINER}"
  else
    echo "    OK sur localhost:5432"
  fi
else
  echo "    Démarrage Postgres local..."
  "$ROOT_DIR/scripts/postgres-up.sh"
fi

dev_export_postgres_env
dev_free_backend_port "${PORT:-8080}"

echo ""
echo "==> Backend DartChain (profil postgres)"
echo "    API : http://localhost:${PORT:-8080}"
echo "    Arrêt : Ctrl+C"
echo ""

exec ./mvnw spring-boot:run \
  -Dspring-boot.run.profiles=postgres \
  -Dspring-boot.run.jvmArguments="-Dspring.profiles.active=postgres"
