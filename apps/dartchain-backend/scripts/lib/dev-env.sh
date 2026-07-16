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

dev_export_postgres_env() {
  export SPRING_PROFILES_ACTIVE=postgres
  export DARTCHAIN_PERSISTENCE_MODE=postgres
  export DATABASE_URL="${DATABASE_URL:-jdbc:postgresql://localhost:5432/dartchain}"
  export DATABASE_USERNAME="${DATABASE_USERNAME:-dartchain}"
  export DATABASE_PASSWORD="${DATABASE_PASSWORD:-dartchain}"
  export DARTCHAIN_JWT_SECRET="${DARTCHAIN_JWT_SECRET:-dev-local-jwt-secret-for-cursor-development-only-32}"
}
