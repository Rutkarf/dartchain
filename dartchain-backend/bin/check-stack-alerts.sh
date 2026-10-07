#!/usr/bin/env bash
# Phase AE — alertes basiques sans Prometheus (cron / CI).
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
TOKEN="${DARTCHAIN_ACTUATOR_TOKEN:-}"

curl -fsS "${BASE_URL}/api/health" | grep -q '"ok"'

if [[ -z "${TOKEN}" || -z "${DARTCHAIN_OPS_ADMIN:-}" || -z "${DARTCHAIN_OPS_PASSWORD:-}" ]]; then
  echo "WARN: credentials ops absents — alertes snapshot ignorées" >&2
  echo "      Définir DARTCHAIN_ACTUATOR_TOKEN, DARTCHAIN_OPS_ADMIN, DARTCHAIN_OPS_PASSWORD" >&2
  exit 0
fi

login_body="$(curl -fsS -X POST "${BASE_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"${DARTCHAIN_OPS_ADMIN}\",\"password\":\"${DARTCHAIN_OPS_PASSWORD}\"}")"
access_token="$(echo "${login_body}" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)"

snapshot="$(curl -fsS -H "Authorization: Bearer ${access_token}" \
  -H "X-Actuator-Token: ${TOKEN}" \
  "${BASE_URL}/api/v1/ops/snapshot")"

if echo "${snapshot}" | grep -q '"level":"error"'; then
  echo "ALERT: erreur détectée dans ops snapshot" >&2
  echo "${snapshot}" | grep -o '"code":"[^"]*"' || true
  exit 2
fi

if echo "${snapshot}" | grep -q '"level":"warn"'; then
  echo "WARN: alerte ops détectée" >&2
  echo "${snapshot}" | grep -o '"code":"[^"]*"' || true
  exit 1
fi

echo "Stack alerts OK"
