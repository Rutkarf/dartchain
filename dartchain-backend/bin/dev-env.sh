#!/usr/bin/env bash
# Helpers partagés pour le dev local (Postgres + port backend).

dev_postgres_ready() {
  if command -v pg_isready >/dev/null 2>&1; then
    pg_isready -h 127.0.0.1 -p 5432 -U dartchain -d dartchain >/dev/null 2>&1 && return 0
  fi

  local container
  for container in $(docker ps --format '{{.Names}}' 2>/dev/null); do
    if ! docker port "$container" 5432 >/dev/null 2>&1; then
      continue
    fi
    if docker exec "$container" pg_isready -U dartchain -d dartchain >/dev/null 2>&1; then
      DEV_POSTGRES_CONTAINER="$container"
      return 0
    fi
  done

  return 1
}

dev_free_backend_port() {
  local port="${1:-8080}"
  local freed=0

  if ! ss -tln 2>/dev/null | grep -q ":${port} "; then
    return 0
  fi

  local cid name
  while read -r cid; do
    [[ -z "$cid" ]] && continue
    name="$(docker inspect -f '{{.Name}}' "$cid" 2>/dev/null | sed 's|^/||')"
    echo "==> Port ${port} occupé par Docker (${name}) — arrêt pour dev local..."
    docker stop "$cid" >/dev/null
    freed=1
  done < <(docker ps -q --filter "publish=${port}" 2>/dev/null || true)

  if [[ "$freed" -eq 1 ]]; then
    sleep 2
    return 0
  fi

  local pid
  pid="$(ss -tlnp 2>/dev/null | grep ":${port} " | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -1)"
  if [[ -n "$pid" ]]; then
    echo "==> Port ${port} occupé par PID ${pid} — arrêt..."
    kill "$pid" 2>/dev/null || true
    sleep 2
  fi

  if ss -tln 2>/dev/null | grep -q ":${port} "; then
    echo "ERREUR: le port ${port} est toujours occupé." >&2
    echo "Arrête la stack Docker (docker compose down) ou lance avec PORT=8081." >&2
    return 1
  fi
}

dev_load_repo_env() {
  local repo_root="${1:-}"
  if [[ -z "$repo_root" ]]; then
    return 0
  fi

  if [[ -f "${repo_root}/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "${repo_root}/.env"
    set +a
  fi
}

dev_export_postgres_env() {
  export SPRING_PROFILES_ACTIVE=postgres
  export DARTCHAIN_PERSISTENCE_MODE=postgres
  export DATABASE_URL="${DATABASE_URL:-jdbc:postgresql://localhost:5432/${POSTGRES_DB:-dartchain}}"
  export DATABASE_USERNAME="${DATABASE_USERNAME:-${POSTGRES_USER:-dartchain}}"
  export DATABASE_PASSWORD="${DATABASE_PASSWORD:-${POSTGRES_PASSWORD:-dartchain}}"
  export DARTCHAIN_JWT_SECRET="${DARTCHAIN_JWT_SECRET:-dev-local-jwt-secret-for-cursor-development-only-32}"
  export OAUTH_DEV_MOCK_ENABLED="${OAUTH_DEV_MOCK_ENABLED:-true}"
  export OAUTH_BACKEND_BASE_URL="${OAUTH_BACKEND_BASE_URL:-http://localhost:8080}"
  export OAUTH_FRONTEND_CALLBACK_URL="${OAUTH_FRONTEND_CALLBACK_URL:-http://localhost:4200/}"
  if [[ -z "${DARTCHAIN_MAIL_HOST:-}" ]]; then
    export DARTCHAIN_MAIL_HOST=127.0.0.1
    export DARTCHAIN_MAIL_PORT=1025
    export DARTCHAIN_MAIL_STARTTLS=false
    export DARTCHAIN_MAIL_FROM="${DARTCHAIN_MAIL_FROM:-noreply@dartchain.local}"
  fi
}

# SMTP local (Mailpit) quand aucun relais externe n'est défini dans .env.
# Les messages sont consultables sur http://127.0.0.1:8025.
dev_ensure_local_mail() {
  if [[ -n "${DARTCHAIN_MAIL_HOST:-}" ]]; then
    return 0
  fi
  if ! command -v docker >/dev/null 2>&1; then
    echo "ERREUR: Docker est requis pour le SMTP local (Mailpit)." >&2
    return 1
  fi

  local name="dartchain-mailpit"
  if docker ps --format '{{.Names}}' | grep -qx "$name"; then
    echo "Mailpit déjà démarré ($name) — http://127.0.0.1:8025"
    return 0
  fi

  if docker ps -a --format '{{.Names}}' | grep -qx "$name"; then
    echo "Démarrage de $name..."
    docker start "$name" >/dev/null
  else
    echo "Création de $name (SMTP 127.0.0.1:1025, boîte http://127.0.0.1:8025)..."
    docker run -d \
      --name "$name" \
      --restart unless-stopped \
      -p 127.0.0.1:1025:1025 \
      -p 127.0.0.1:8025:8025 \
      docker.io/axllent/mailpit:v1.28 >/dev/null
  fi

  echo -n "Attente de Mailpit"
  for _ in $(seq 1 20); do
    if curl -fsS http://127.0.0.1:8025/api/v1/info >/dev/null 2>&1; then
      echo " — OK"
      return 0
    fi
    echo -n "."
    sleep 1
  done
  echo
  echo "ERREUR: Mailpit ne répond pas sur http://127.0.0.1:8025" >&2
  return 1
}
