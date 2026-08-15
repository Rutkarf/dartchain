#!/usr/bin/env bash
# Lance frontend + backend en session détachée (survit à la fermeture du shell Cursor/agent).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/apps/dartchain-backend"
FRONTEND_DIR="${REPO_ROOT}/apps/dartchain-frontend/Dart"
LOG_DIR="${REPO_ROOT}/.dev-logs"
PID_DIR="${LOG_DIR}"

mkdir -p "${LOG_DIR}"

free_port() {
  local port="$1"
  local pids
  pids="$(ss -tlnp 2>/dev/null | grep ":${port} " | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | sort -u || true)"
  if [[ -z "${pids}" ]]; then
    return 0
  fi
  echo "==> Libération port ${port} (PID: ${pids})"
  # shellcheck disable=SC2086
  kill ${pids} 2>/dev/null || true
  sleep 2
  pids="$(ss -tlnp 2>/dev/null | grep ":${port} " | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | sort -u || true)"
  if [[ -n "${pids}" ]]; then
    # shellcheck disable=SC2086
    kill -9 ${pids} 2>/dev/null || true
    sleep 1
  fi
}

echo "==> Arrêt éventuels serveurs liés à Cursor"
free_port 8080
free_port 4200

# Postgres doit rester up
if ! (command -v pg_isready >/dev/null 2>&1 && pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1); then
  echo "==> Postgres indisponible — démarrage via scripts backend"
  unset DOCKER_HOST
  export DOCKER_HOST=unix:///var/run/docker.sock
  bash "${BACKEND_DIR}/scripts/postgres-up.sh"
fi

echo "==> Backend détaché → http://127.0.0.1:8080 (log: ${LOG_DIR}/backend.log)"
unset DOCKER_HOST
export DOCKER_HOST=unix:///var/run/docker.sock
(
  cd "${BACKEND_DIR}"
  # setsid = nouvelle session : pas tué quand le shell agent Cursor abort
  setsid nohup npm start >"${LOG_DIR}/backend.log" 2>&1 < /dev/null &
  echo $! >"${PID_DIR}/backend.pid"
)

echo "==> Frontend détaché → http://127.0.0.1:4200 (log: ${LOG_DIR}/frontend.log)"
(
  cd "${FRONTEND_DIR}"
  setsid nohup npm start -- --host 127.0.0.1 --port 4200 >"${LOG_DIR}/frontend.log" 2>&1 < /dev/null &
  echo $! >"${PID_DIR}/frontend.pid"
)

echo "==> Attente readiness..."
for i in $(seq 1 90); do
  be_ok=0
  fe_ok=0
  curl -fsS http://127.0.0.1:8080/api/health >/dev/null 2>&1 && be_ok=1
  curl -fsS http://127.0.0.1:4200/ >/dev/null 2>&1 && fe_ok=1
  if [[ "${be_ok}" -eq 1 && "${fe_ok}" -eq 1 ]]; then
    echo "OK backend + frontend"
    echo "  API  : http://127.0.0.1:8080"
    echo "  UI   : http://127.0.0.1:4200"
    echo "  logs : ${LOG_DIR}/"
    echo "  stop : bash ${REPO_ROOT}/scripts/stop-dev-detached.sh"
    exit 0
  fi
  sleep 2
done

echo "FAIL: timeout readiness" >&2
echo "--- backend.log (tail) ---" >&2
tail -n 40 "${LOG_DIR}/backend.log" >&2 || true
echo "--- frontend.log (tail) ---" >&2
tail -n 40 "${LOG_DIR}/frontend.log" >&2 || true
exit 1
