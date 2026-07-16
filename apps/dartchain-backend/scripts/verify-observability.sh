#!/usr/bin/env bash
# Phase AE — vérifie l'observabilité native (sans Prometheus/Grafana).
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
TOKEN="${DARTCHAIN_ACTUATOR_TOKEN:-}"

echo "==> Corrélation requêtes (X-Request-Id)"
headers="$(curl -sSI "${BASE_URL}/api/health" | tr -d '\r')"
echo "${headers}" | grep -qi "x-request-id:"

echo "==> Actuator info (ops API v1)"
curl -fsS "${BASE_URL}/actuator/info" | grep -q '"metrics-api":"/api/v1/ops/snapshot"'

echo "==> Health v1 (observability pointers)"
curl -fsS "${BASE_URL}/api/v1/health" | grep -q '"metricsApi":"/api/v1/ops/snapshot"'

if [[ -n "${TOKEN}" && -n "${DARTCHAIN_OPS_ADMIN:-}" && -n "${DARTCHAIN_OPS_PASSWORD:-}" ]]; then
  echo "==> Snapshot ops v1 (admin JWT + token)"
  login_body="$(curl -fsS -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"identifier\":\"${DARTCHAIN_OPS_ADMIN}\",\"password\":\"${DARTCHAIN_OPS_PASSWORD}\"}")"
  access_token="$(echo "${login_body}" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)"

  curl -fsS -H "Authorization: Bearer ${access_token}" \
    -H "X-Actuator-Token: ${TOKEN}" \
    "${BASE_URL}/api/v1/ops/snapshot" | grep -q '"phase":"AF"'
  curl -fsS -H "Authorization: Bearer ${access_token}" \
    -H "X-Actuator-Token: ${TOKEN}" \
    "${BASE_URL}/api/v1/ops/snapshot" | grep -q '"latency"'
else
  echo "WARN: token/admin absent — skip /api/v1/ops/snapshot" >&2
  echo "      Définir DARTCHAIN_ACTUATOR_TOKEN, DARTCHAIN_OPS_ADMIN, DARTCHAIN_OPS_PASSWORD" >&2
fi

echo "Observability verify OK (${BASE_URL})"
