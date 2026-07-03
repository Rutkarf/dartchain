#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

"$ROOT_DIR/scripts/postgres-up.sh"

export SPRING_PROFILES_ACTIVE=postgres
export DARTCHAIN_PERSISTENCE_MODE=postgres
export DATABASE_URL="${DATABASE_URL:-jdbc:postgresql://localhost:5432/dartchain}"
export DATABASE_USERNAME="${DATABASE_USERNAME:-dartchain}"
export DATABASE_PASSWORD="${DATABASE_PASSWORD:-dartchain}"

if ss -tlnp 2>/dev/null | grep -q ':8080'; then
  OLD_PID="$(ss -tlnp 2>/dev/null | grep ':8080' | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -1)"
  if [[ -n "$OLD_PID" ]]; then
    echo "Arrêt du backend sur le port 8080 (PID $OLD_PID)..."
    kill "$OLD_PID" 2>/dev/null || true
    sleep 2
  fi
fi

echo "Démarrage du backend (profil postgres)..."
exec ./mvnw spring-boot:run
