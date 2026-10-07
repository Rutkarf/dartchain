#!/usr/bin/env bash
# Sauvegarde logique Postgres (stack docker-compose.yml).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_ROOT}/docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-${REPO_ROOT}/backups/postgres}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT="${BACKUP_DIR}/dartchain-${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

POSTGRES_DB="${POSTGRES_DB:-dartchain}"
POSTGRES_USER="${POSTGRES_USER:-dartchain}"

cd "${REPO_ROOT}"

echo "==> Dump Postgres (${POSTGRES_DB})"
docker compose --profile default exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-owner --no-privileges \
  | gzip -9 > "${OUTPUT}"

echo "Backup OK : ${OUTPUT}"
