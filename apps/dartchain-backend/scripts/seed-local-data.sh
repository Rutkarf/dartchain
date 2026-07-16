#!/usr/bin/env bash
set -euo pipefail

BACKEND_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${BACKEND_ROOT}/data"
SEED_DIR="${DATA_DIR}/seed"

mkdir -p "${DATA_DIR}"

for template in "${SEED_DIR}"/*.json; do
  filename="$(basename "${template}")"
  target="${DATA_DIR}/${filename}"
  if [[ ! -f "${target}" ]]; then
    cp "${template}" "${target}"
    echo "seeded ${filename}"
  fi
done

echo "Seed local data OK (${DATA_DIR})"
