#!/usr/bin/env bash
# Build frontend Angular pour Cloudflare Pages (monorepo).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONT="${ROOT}/apps/dartchain-frontend/Dart"

if [[ -z "${BACKEND_URL:-}" || "${BACKEND_URL}" == *"YOUR-BACKEND"* ]]; then
  echo "WARN: BACKEND_URL non défini — placeholder utilisé (à configurer dans Cloudflare Build variables)" >&2
fi

cd "${FRONT}"

if [[ -f package-lock.json ]]; then
  npm ci --legacy-peer-deps
else
  npm ci
fi

npm run build:cloudflare

if [[ ! -f dist/browser/index.html ]]; then
  echo "FAIL: dist/browser/index.html introuvable après build" >&2
  exit 1
fi

echo "Cloudflare build OK → apps/dartchain-frontend/Dart/dist/browser"
