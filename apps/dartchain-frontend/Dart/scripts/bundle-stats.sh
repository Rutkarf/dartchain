#!/usr/bin/env bash
# Phase Y — génère stats.json pour audit bundle Angular.
set -euo pipefail

FRONT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${FRONT_ROOT}/dist/stats.json"

cd "${FRONT_ROOT}"
npm run build -- --configuration production --stats-json

if [[ -f dist/browser/stats.json ]]; then
  cp dist/browser/stats.json "${OUT}"
  echo "Bundle stats: ${OUT}"
elif [[ -f dist/Dart/browser/stats.json ]]; then
  cp dist/Dart/browser/stats.json "${OUT}"
  echo "Bundle stats: ${OUT}"
elif [[ -f dist/stats.json ]]; then
  echo "Bundle stats: dist/stats.json"
else
  echo "stats.json introuvable après build" >&2
  exit 1
fi

echo "bundle-stats OK (Phase Y)"
