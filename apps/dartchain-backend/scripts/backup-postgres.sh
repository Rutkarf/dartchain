#!/usr/bin/env bash
# Phase W — sauvegarde logique Postgres (stack docker-compose.yml).
set -euo pipefail

BACKEND_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_ROOT}/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_ROOT}/docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-${REPO_ROOT}/backups/postgres}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT="${BACKUP_DIR}/dartchain-${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

POSTGRES_DB="${POSTGRES_DB:-dartchain}"
POSTGRES_USER="${POSTGRES_USER:-dartchain}"

echo "==> Dump Postgres (${POSTGRES_DB})"
docker compose --profile default exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-owner --no-privileges \
  | gzip -9 > "${OUTPUT}"

echo "Backup OK : ${OUTPUT}"
