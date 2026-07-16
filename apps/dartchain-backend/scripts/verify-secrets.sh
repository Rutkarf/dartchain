#!/usr/bin/env bash
# Phase AH — vérifie qu'un fichier .env ne contient pas de secrets faibles (prod/staging).
set -euo pipefail

ENV_FILE="${1:-.env}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "FAIL: fichier introuvable : ${ENV_FILE}" >&2
  exit 1
fi

fail() {
  echo "FAIL: ${1}" >&2
  exit 1
}

read_var() {
  local key="$1"
  grep -E "^${key}=" "${ENV_FILE}" | tail -n1 | cut -d= -f2- || true
}

is_weak() {
  local value="${1,,}"
  case "${value}" in
    "" | change-me | dartchain | password | password123 | dev-only-change-in-prod \
      | local-docker-jwt-secret-change-me-in-prod | local-docker-actuator-token)
      return 0
      ;;
  esac
  return 1
}

min_length() {
  local value="$1"
  local min="$2"
  [[ "${#value}" -ge "${min}" ]]
}

POSTGRES_PASSWORD="$(read_var POSTGRES_PASSWORD)"
JWT_SECRET="$(read_var DARTCHAIN_JWT_SECRET)"
ACTUATOR_TOKEN="$(read_var DARTCHAIN_ACTUATOR_TOKEN)"

if is_weak "${POSTGRES_PASSWORD}" || ! min_length "${POSTGRES_PASSWORD}" 16; then
  fail "POSTGRES_PASSWORD faible ou trop court (≥ 16 caractères requis)"
fi

if is_weak "${JWT_SECRET}" || ! min_length "${JWT_SECRET}" 32; then
  fail "DARTCHAIN_JWT_SECRET faible ou trop court (≥ 32 caractères requis)"
fi

if is_weak "${ACTUATOR_TOKEN}" || ! min_length "${ACTUATOR_TOKEN}" 24; then
  fail "DARTCHAIN_ACTUATOR_TOKEN faible ou trop court (≥ 24 caractères requis)"
fi

echo "Secrets verify OK (${ENV_FILE})"
