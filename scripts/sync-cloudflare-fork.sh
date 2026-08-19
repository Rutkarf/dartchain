#!/usr/bin/env bash
# Pousse main vers le fork surveillé par Cloudflare Workers (Rutkarf/dartchain).
# Usage : bash scripts/sync-cloudflare-fork.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

BRANCH="${1:-main}"

if ! git remote get-url upstream >/dev/null 2>&1; then
  echo "FAIL: remote 'upstream' absent (attendu Rutkarf/dartchain)" >&2
  exit 1
fi

LOCAL_SHA="$(git rev-parse "${BRANCH}")"
REMOTE_SHA="$(git ls-remote upstream "refs/heads/${BRANCH}" | awk '{print $1}')"

echo "==> Sync Cloudflare fork"
echo "    branche : ${BRANCH}"
echo "    local   : ${LOCAL_SHA}"
echo "    upstream: ${REMOTE_SHA:-<absent>}"

if [[ "${LOCAL_SHA}" == "${REMOTE_SHA}" ]]; then
  echo "Déjà à jour — rien à pousser."
  exit 0
fi

git push upstream "${BRANCH}"
echo "OK — Cloudflare Workers devrait lancer un build sur Rutkarf/dartchain (${BRANCH})."
