#!/usr/bin/env bash
# Déploie le frontend Angular sur Cloudflare Workers (assets SPA).
# Prérequis : bash scripts/cloudflare-build.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="${ROOT}/apps/dartchain-frontend/Dart/dist/browser"

cd "${ROOT}"

if [[ ! -f "${DIST}/index.html" ]]; then
  echo "FAIL: ${DIST}/index.html introuvable — lancer d'abord scripts/cloudflare-build.sh" >&2
  exit 1
fi

echo "==> Cloudflare Workers deploy (name=dartchain)"
echo "    assets: ${DIST}"

# Workers Builds / wrangler.toml [assets] → wrangler deploy (PAS pages deploy)
npx wrangler deploy

echo "Cloudflare Workers deploy OK"
