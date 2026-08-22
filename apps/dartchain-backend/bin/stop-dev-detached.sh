#!/usr/bin/env bash
# Arrête frontend + backend démarrés via start-dev-detached.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/../.." && pwd)"
PID_DIR="${REPO_ROOT}/.dev-logs"

stop_pidfile() {
  local name="$1"
  local file="${PID_DIR}/${name}.pid"
  if [[ -f "${file}" ]]; then
    local pid
    pid="$(cat "${file}")"
    if kill -0 "${pid}" 2>/dev/null; then
      echo "==> Stop ${name} (pid ${pid})"
      kill -- "-${pid}" 2>/dev/null || kill "${pid}" 2>/dev/null || true
      sleep 1
      kill -9 -- "-${pid}" 2>/dev/null || kill -9 "${pid}" 2>/dev/null || true
    fi
    rm -f "${file}"
  fi
}

stop_pidfile backend
stop_pidfile frontend

for port in 8080 4200; do
  pids="$(ss -tlnp 2>/dev/null | grep ":${port} " | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | sort -u || true)"
  if [[ -n "${pids}" ]]; then
    echo "==> Kill restants port ${port}: ${pids}"
    # shellcheck disable=SC2086
    kill ${pids} 2>/dev/null || true
    sleep 1
    # shellcheck disable=SC2086
    kill -9 ${pids} 2>/dev/null || true
  fi
done

echo "Arrêté."
