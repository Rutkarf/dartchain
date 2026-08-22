#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
APP="$ROOT/apps/dartchain-frontend/Dart/src/app"

source "$ROOT/scripts/refactor/lib/safe-move.sh"

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
elif [[ "${1:-}" == "--apply" ]]; then
  DRY_RUN=false
else
  echo "Usage: $0 --dry-run | --apply" >&2
  exit 2
fi

safe_git_move \
  "$APP/features/showcase-chart" \
  "$APP/showcase/components/showcase-chart"

safe_git_move \
  "$APP/features/showcase-chat" \
  "$APP/showcase/components/showcase-chat"

safe_git_move \
  "$APP/features/showcase-dao" \
  "$APP/showcase/components/showcase-dao"

safe_git_move \
  "$APP/features/showcase-launch" \
  "$APP/showcase/components/showcase-launch"

safe_git_move \
  "$APP/features/showcase-news" \
  "$APP/showcase/components/showcase-news"

safe_git_move \
  "$APP/features/showcase-r4v3" \
  "$APP/showcase/components/showcase-r4v3"

safe_git_move \
  "$APP/features/showcase-tabs" \
  "$APP/showcase/components/showcase-tabs"

safe_git_move \
  "$APP/features/showcase-window" \
  "$APP/showcase/components/showcase-window"https://github.com/Rutkarf/dartchain