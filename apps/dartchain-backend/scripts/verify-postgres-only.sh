#!/usr/bin/env bash
# Phase T — vérifie que prod/staging exposent Postgres comme mode de persistance.
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"

echo "==> Legacy health (persistenceMode)"
curl -fsS "${BASE_URL}/api/health" | grep -q '"persistenceMode":"postgres"'

if curl -fsS "${BASE_URL}/actuator/info" 2>/dev/null | grep -q '"persistence-mode":"postgres"'; then
  echo "==> Actuator info (persistence-mode) OK"
fi

echo "Postgres-only OK (${BASE_URL})"
