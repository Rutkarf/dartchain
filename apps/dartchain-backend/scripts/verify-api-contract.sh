#!/usr/bin/env bash
# Phase AA — vérifie le contrat API natif (sans OpenAPI/Swagger).
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"

echo "==> Contrat v1 natif"
body="$(curl -fsS "${BASE_URL}/api/v1/contract")"
echo "${body}" | grep -q '"apiVersion":"v1"'
echo "${body}" | grep -q '"/api/v1/health"'
echo "${body}" | grep -q 'application/problem+json'

echo "==> Endpoints v1"
curl -fsS "${BASE_URL}/api/v1/health" | grep -q '"ok":true'
curl -fsS "${BASE_URL}/api/v1/blockchain/stats" | grep -q '"totalBlocks"'

echo "==> Legacy routes retirées"
legacy_stats_code="$(curl -sS -o /dev/null -w "%{http_code}" "${BASE_URL}/api/stats")"
test "${legacy_stats_code}" = "404"

legacy_pending_code="$(curl -sS -o /dev/null -w "%{http_code}" "${BASE_URL}/api/transactions/pending")"
test "${legacy_pending_code}" = "404"

echo "==> RFC 7807 sur /api/v1"
problem_type="$(curl -sS -o /dev/null -w "%{content_type}" \
  -X POST "${BASE_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{}')"
echo "${problem_type}" | grep -q 'application/problem+json'

echo "API contract verify OK (${BASE_URL})"
