#!/usr/bin/env bash
# Build Angular pour Cloudflare Pages (URLs backend injectées via env).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

BACKEND_URL="${BACKEND_URL:-https://dartchain-backend-1-0-0.onrender.com}"
BACKEND_URL="${BACKEND_URL%/}"
if [[ "${BACKEND_URL}" == *"YOUR-BACKEND"* ]]; then
  echo "FAIL: BACKEND_URL invalide (${BACKEND_URL}). Définir BACKEND_URL dans Cloudflare Pages." >&2
  exit 1
fi
BACKEND_URL="${BACKEND_URL#http://}"
BACKEND_URL="${BACKEND_URL#https://}"
BACKEND_URL="https://${BACKEND_URL}"
BACKEND_HOST="${BACKEND_URL#https://}"

# Showcase activé par défaut (aligné backend dev / démo publique). Désactiver : SHOWCASE_ENABLED=false
SHOWCASE_ENABLED="${SHOWCASE_ENABLED:-true}"
case "${SHOWCASE_ENABLED}" in
  true|1|yes|on) SHOWCASE_TS="true" ;;
  *) SHOWCASE_TS="false" ;;
esac

cat > "${ROOT}/src/environments/environment.prod.ts" <<EOF
/** Généré par scripts/build-cloudflare.sh — ne pas éditer manuellement avant un déploiement CF. */
export const environment = {
  production: true,
  apiUrl: '${BACKEND_URL}/api',
  liveWsUrl: 'wss://${BACKEND_HOST}/ws/live',
  chatWsUrl: 'wss://${BACKEND_HOST}/ws/chat',
  commercial: true,
  faucetEnabled: false,
  showcaseEnabled: ${SHOWCASE_TS},
};
EOF

echo "==> Cloudflare build (backend: ${BACKEND_URL})"
npm run build -- --configuration production

if [[ ! -f dist/browser/index.html ]]; then
  echo "FAIL: dist/browser/index.html introuvable" >&2
  exit 1
fi

echo "OK: output Cloudflare Pages → dist/browser"
