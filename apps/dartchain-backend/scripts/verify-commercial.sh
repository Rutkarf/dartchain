#!/usr/bin/env bash
# Phase Z — vérifie le mode commercial (health v1 + features désactivées).
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"

echo "==> Health v1 (contrat commercial)"
body="$(curl -fsS "${BASE_URL}/api/v1/health")"
echo "${body}" | grep -q '"ok":true'
echo "${body}" | grep -q '"commercial":true'
echo "${body}" | grep -q '"faucet":false'
echo "${body}" | grep -q '"legacyPrivateKey":false'
echo "${body}" | grep -q '"serverWalletCreate":false'

echo "==> Faucet bloqué"
faucet_status="$(curl -sS -o /dev/null -w "%{http_code}" \
  -X POST "${BASE_URL}/api/faucet/claim" \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0xverify"}' || true)"
if [[ "${faucet_status}" != "403" && "${faucet_status}" != "401" ]]; then
  echo "FAIL: POST /api/faucet/claim devrait être 403/401, reçu ${faucet_status}" >&2
  exit 1
fi

echo "==> Wallet serveur bloqué"
wallet_status="$(curl -sS -o /dev/null -w "%{http_code}" \
  -X POST "${BASE_URL}/api/wallets/create" || true)"
if [[ "${wallet_status}" != "403" ]]; then
  echo "FAIL: POST /api/wallets/create devrait être 403, reçu ${wallet_status}" >&2
  exit 1
fi

echo "Commercial verify OK (${BASE_URL})"
