#!/usr/bin/env bash
# Build Angular pour Cloudflare Pages (URLs backend injectées via env).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

BACKEND_URL="${BACKEND_URL:-https://YOUR-BACKEND.onrender.com}"
BACKEND_URL="${BACKEND_URL%/}"
BACKEND_URL="${BACKEND_URL#http://}"
BACKEND_URL="${BACKEND_URL#https://}"
BACKEND_URL="https://${BACKEND_URL}"
BACKEND_HOST="${BACKEND_URL#https://}"

cat > "${ROOT}/src/environments/environment.prod.ts" <<EOF
/** Généré par scripts/build-cloudflare.sh — ne pas éditer manuellement avant un déploiement CF. */
export const environment = {
  production: true,
  apiUrl: '${BACKEND_URL}/api',
  liveWsUrl: 'wss://${BACKEND_HOST}/ws/live',
  chatWsUrl: 'wss://${BACKEND_HOST}/ws/chat',
  commercial: true,
  faucetEnabled: false,
  showcaseEnabled: false,
};
EOF

echo "==> Cloudflare build (backend: ${BACKEND_URL})"
npm run build -- --configuration production

if [[ ! -f dist/browser/index.html ]]; then
  echo "FAIL: dist/browser/index.html introuvable" >&2
  exit 1
fi

echo "OK: output Cloudflare Pages → dist/browser"
