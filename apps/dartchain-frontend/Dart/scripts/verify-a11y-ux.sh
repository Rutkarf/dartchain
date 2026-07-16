#!/usr/bin/env bash
# Phase Y — vérifie les livrables UX & accessibilité (sans Lighthouse externe).
set -euo pipefail

FRONT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_ROOT="$(cd "${FRONT_ROOT}/../../dartchain-backend" && pwd)"
APP_SRC="${FRONT_ROOT}/src/app"
FAIL=0

check() {
  local label="$1"
  local pattern="$2"
  local file="$3"
  if grep -q "${pattern}" "${file}"; then
    echo "OK  ${label}"
  else
    echo "FAIL ${label} (${file})"
    FAIL=1
  fi
}

echo "==> Phase Y — UX & a11y (statique)"

check "skip-link" 'app-skip-link' "${APP_SRC}/app.html"
check "focus-trap directive" 'FocusTrapDirective' "${APP_SRC}/core/directives/focus-trap.directive.ts"
check "auth drawer focus trap" 'appFocusTrap' "${APP_SRC}/features/auth-drawer/auth-drawer.html"
check "block drawer focus trap" 'appFocusTrap' "${APP_SRC}/features/block-detail-drawer/block-detail-drawer.html"
check "launch drawer focus trap" 'appFocusTrap' "${APP_SRC}/features/launch-form-drawer/launch-form-drawer.html"
check "chain graph component" 'app-chain-graph' "${APP_SRC}/features/blocks-list/blocks-list.html"
check "locale service" 'LocaleService' "${APP_SRC}/core/i18n/locale.service.ts"
check "showcase defer" '@defer' "${APP_SRC}/features/showcase-window/showcase-window.html"
check "dock aria-label" 'aria-label' "${APP_SRC}/app.html"

echo "==> Phase Z — produit commercial"
check "product config service" 'ProductConfigService' "${APP_SRC}/core/config/product-config.service.ts"
check "commercial env prod" 'commercial: true' "${FRONT_ROOT}/src/environments/environment.prod.ts"
check "faucet gated in dock" 'product.faucetEnabled' "${APP_SRC}/app.html"
check "health v1 controller" 'HealthV1Controller' "${BACKEND_ROOT}/src/main/java/io/dartchain/backend/controller/HealthV1Controller.java"

echo "==> Phase AA — contrat API natif"
check "api contract catalog" 'ApiContractCatalog' "${BACKEND_ROOT}/src/main/java/io/dartchain/backend/api/ApiContractCatalog.java"
if grep -q '@CrossOrigin' "${BACKEND_ROOT}/src/main/java/io/dartchain/backend/controller/TransactionController.java"; then
  echo "FAIL @CrossOrigin still present on TransactionController"
  FAIL=1
else
  echo "OK  no @CrossOrigin on TransactionController"
fi

echo "==> API explorer blocks"
if grep -q 'GetMapping("/blocks")' "${BACKEND_ROOT}/src/main/java/io/dartchain/backend/explorer/controller/ExplorerController.java"; then
  echo "OK  GET /api/explorer/blocks"
else
  echo "FAIL GET /api/explorer/blocks"
  FAIL=1
fi

if [[ "${FAIL}" -ne 0 ]]; then
  echo "verify-a11y-ux FAILED"
  exit 1
fi

echo "verify-a11y-ux OK (Phase Y+Z)"
