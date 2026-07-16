#!/usr/bin/env bash
set -euo pipefail

BACKEND_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${BACKEND_ROOT}"

export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-postgres}"
export DARTCHAIN_PERSISTENCE_MODE="${DARTCHAIN_PERSISTENCE_MODE:-postgres}"
export DARTCHAIN_DATA_IMPORT_ENABLED="${DARTCHAIN_DATA_IMPORT_ENABLED:-true}"
export DARTCHAIN_DATA_IMPORT_EXIT_AFTER_IMPORT="${DARTCHAIN_DATA_IMPORT_EXIT_AFTER_IMPORT:-true}"

./mvnw -q spring-boot:run \
  -Dspring-boot.run.jvmArguments="-Ddartchain.data-import.enabled=${DARTCHAIN_DATA_IMPORT_ENABLED} -Ddartchain.data-import.exit-after-import=${DARTCHAIN_DATA_IMPORT_EXIT_AFTER_IMPORT}"
