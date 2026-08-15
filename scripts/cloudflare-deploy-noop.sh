#!/usr/bin/env bash
# Vérifie que le dist Angular est prêt avant wrangler deploy.
# Workers Builds : préférer Deploy command = `npx wrangler deploy`
# (ou `bash scripts/cloudflare-deploy.sh`). Ce script ne publie rien seul.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="${ROOT}/apps/dartchain-frontend/Dart/dist/browser"

if [[ ! -f "${DIST}/index.html" ]]; then
  echo "FAIL: ${DIST}/index.html introuvable — vérifier le build command" >&2
  exit 1
fi

echo "OK: dist prêt → ${DIST}"
echo "Deploy command attendu: npx wrangler deploy"
