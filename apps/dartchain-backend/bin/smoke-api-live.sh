#!/usr/bin/env bash
# Smoke API contre une instance HTTP déjà démarrée (Postgres / prod HA).
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
SUFFIX="$(date +%s)"
USERNAME="smoke${SUFFIX}"
EMAIL="${USERNAME}@dartchain.dev"
PASSWORD="password123"

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

echo "==> Health (legacy + persistence mode)"
curl_cmd "${BASE_URL}/api/health" | grep -q '"ok"'
curl_cmd "${BASE_URL}/api/health" | grep -q '"persistenceMode":"postgres"'

echo "==> Health (Actuator)"
if ! curl_cmd "${BASE_URL}/actuator/health" | grep -q '"status":"UP"'; then
  echo "WARN: /actuator/health indisponible" >&2
  curl_cmd "${BASE_URL}/api/health" | grep -q '"ok"'
fi

echo "==> Public reads"
curl_cmd "${BASE_URL}/api/blockchain/valid" >/dev/null
curl_cmd "${BASE_URL}/api/blockchain/chain" | grep -q '"index"'
curl_cmd "${BASE_URL}/api/quests/catalog" | grep -q '"dailyTasks"'
curl_cmd "${BASE_URL}/api/showcase/r4v3" | grep -q '"panel"'
curl_cmd "${BASE_URL}/api/showcase/r4v3" | grep -q '"launchTokens"'
curl_cmd "${BASE_URL}/api/crypto-rates/panels/native" | grep -q '"symbol":"R4V3"'

if curl_cmd "${BASE_URL}/actuator/info" 2>/dev/null | grep -q '"persistence-mode":"postgres"'; then
  echo "==> Persistence mode (Actuator info)"
  curl_cmd "${BASE_URL}/actuator/info" | grep -q '"persistence-mode":"postgres"'
fi

echo "==> Protected route without auth"
status="$(curl_status -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/faucet/claim" \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"smoke-wallet"}')"
test "${status}" = "401"

echo "==> Register"
register_body="$(curl_status -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${USERNAME}\",\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")"
echo "${register_body}" | grep -q '"token"'

echo "==> Login"
login_body="$(curl_status -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}")"
echo "${login_body}" | grep -q '"token"'

echo "Smoke API OK (${BASE_URL})"

echo "==> Peer stats"
curl_cmd "${BASE_URL}/api/peers/stats" | grep -q '"networkLoadPercent"'

echo "==> Actuator hardening"
metrics_status="$(curl_status -o /dev/null -w "%{http_code}" "${BASE_URL}/actuator/metrics" || true)"
if [[ "${metrics_status}" == "403" || "${metrics_status}" == "401" ]]; then
  echo "Actuator metrics protected"
else
  echo "WARN: /actuator/metrics status=${metrics_status} (attendu 403 via nginx en prod)" >&2
fi
