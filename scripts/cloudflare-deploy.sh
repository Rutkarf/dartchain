#!/usr/bin/env bash
# Déploie le frontend Angular sur Cloudflare Pages (après cloudflare-build.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="${ROOT}/apps/dartchain-frontend/Dart/dist/browser"
PROJECT_NAME="${CLOUDFLARE_PAGES_PROJECT:-dartchain}"

cd "${ROOT}"

if [[ ! -f "${DIST}/index.html" ]]; then
  echo "FAIL: ${DIST}/index.html introuvable — lancer d'abord scripts/cloudflare-build.sh" >&2
  exit 1
fi

echo "==> Cloudflare Pages deploy (${PROJECT_NAME})"
echo "    assets: ${DIST}"

# Pages project → wrangler pages deploy (PAS wrangler deploy)
npx wrangler pages deploy "${DIST}" --project-name="${PROJECT_NAME}" --commit-dirty=true

echo "Cloudflare Pages deploy OK"
