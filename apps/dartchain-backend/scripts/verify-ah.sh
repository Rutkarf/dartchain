#!/usr/bin/env bash
# Phase AH — tests politique secrets + validation fichier .env.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-${ROOT}/../../.env}"

cd "${ROOT}"
./mvnw -q test -Dtest=ProductionSecretPolicyTest,ProductCommercialGuardTest
bash scripts/verify-secrets.sh "${ENV_FILE}"
