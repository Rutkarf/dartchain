#!/usr/bin/env bash
# No-op deploy — Cloudflare publie dist/browser via "Build output directory".
# À utiliser quand l'UI exige une Deploy command mais le token n'a pas Pages Edit.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="${ROOT}/apps/dartchain-frontend/Dart/dist/browser"

if [[ ! -f "${DIST}/index.html" ]]; then
  echo "FAIL: ${DIST}/index.html introuvable — vérifier le build command" >&2
  exit 1
fi

echo "Deploy no-op OK — Cloudflare publiera: ${DIST}"
echo "(Build output directory doit être: apps/dartchain-frontend/Dart/dist/browser)"
