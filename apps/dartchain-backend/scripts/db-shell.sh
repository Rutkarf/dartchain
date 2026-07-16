#!/usr/bin/env bash
# Shell psql interactif sur Postgres dev Docker.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-dartchain}"
POSTGRES_DB="${POSTGRES_DB:-dartchain}"

exec docker compose --profile dev exec postgres-dev \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
