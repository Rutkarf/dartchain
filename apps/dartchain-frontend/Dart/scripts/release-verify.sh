#!/usr/bin/env bash
# Vérifie que le monorepo est prêt pour release (tests + couverture).
set -euo pipefail

FRONT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "${FRONT_ROOT}/../../.." && pwd)"
BACKEND_ROOT="${REPO_ROOT}/apps/dartchain-backend"

echo "==> Backend (mvn verify + JaCoCo)"
cd "${BACKEND_ROOT}"
./mvnw -q verify

echo "==> Frontend (Vitest + coverage)"
cd "${FRONT_ROOT}"
npm run test:coverage

echo "Release verify OK (v1.0.0)"
