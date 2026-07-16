#!/usr/bin/env bash
# Phase W — vérifie le durcissement prod (actuator, nginx).
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"

curl_cmd() {
  if [[ "${BASE_URL}" == https://* ]]; then
    curl -kfsS "$@"
  else
    curl -fsS "$@"
  fi
}

curl_status() {
  if [[ "${BASE_URL}" == https://* ]]; then
    curl -k -sS "$@"
  else
    curl -sS "$@"
  fi
}

echo "==> Actuator public (health/info)"
curl_cmd "${BASE_URL}/actuator/health" | grep -q '"status":"UP"'
curl_cmd "${BASE_URL}/actuator/info" >/dev/null

echo "==> Actuator sensible bloqué via nginx"
metrics_status="$(curl_status -o /dev/null -w "%{http_code}" "${BASE_URL}/actuator/metrics" || true)"
prom_status="$(curl_status -o /dev/null -w "%{http_code}" "${BASE_URL}/actuator/prometheus" || true)"

if [[ "${metrics_status}" != "403" && "${metrics_status}" != "401" ]]; then
  echo "FAIL: /actuator/metrics devrait être 403/401, reçu ${metrics_status}" >&2
  exit 1
fi

if [[ "${prom_status}" != "403" && "${prom_status}" != "401" ]]; then
  echo "FAIL: /actuator/prometheus devrait être 403/401, reçu ${prom_status}" >&2
  exit 1
fi

echo "==> Health v1 (Phase Z)"
curl_cmd "${BASE_URL}/api/v1/health" | grep -q '"ok":true'

echo "Prod hardening verify OK (${BASE_URL})"
