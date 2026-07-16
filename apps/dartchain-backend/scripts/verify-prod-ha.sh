#!/usr/bin/env bash
# Vérifie la stack HA prod (docker compose --profile prod) — nginx sur port 8080.
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"

echo "==> Attente HTTP (${BASE_URL})"
for i in $(seq 1 60); do
  if curl -fsS "${BASE_URL}/actuator/health" >/dev/null 2>&1; then
    break
  fi
  if [[ "${i}" -eq 60 ]]; then
    echo "FAIL: stack prod HA indisponible sur ${BASE_URL}" >&2
    exit 1
  fi
  sleep 5
done

echo "==> Smoke API"
bash "$(dirname "$0")/verify-prod-hardening.sh" "${BASE_URL}"

bash "$(dirname "$0")/smoke-api.sh" "${BASE_URL}"

echo "==> Health v1 + legacy routes retirées"
curl -fsS "${BASE_URL}/api/v1/health" | grep -q '"ok":true'
legacy_code="$(curl -sS -o /dev/null -w "%{http_code}" "${BASE_URL}/api/stats" || true)"
test "${legacy_code}" = "404"

echo "Prod HA verify OK (${BASE_URL})"
