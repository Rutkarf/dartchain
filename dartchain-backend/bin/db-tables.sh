#!/usr/bin/env bash
# Liste les tables Postgres DartChain (dev Docker).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

cd "${REPO_ROOT}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-dartchain}"
POSTGRES_DB="${POSTGRES_DB:-dartchain}"

docker compose --profile dev exec -T postgres-dev \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "\dt+"
