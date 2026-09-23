# DartChain — orchestration locale
# Usage : make help | make dev-stack | make stop | make status

ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
BACKEND := $(ROOT)/apps/dartchain-backend
FRONTEND := $(ROOT)/apps/dartchain-frontend/Dart
LOG_DIR := $(ROOT)/.dev-logs

.DEFAULT_GOAL := help

.PHONY: help dev-stack stop status logs \
	postgres-up backend frontend \
	verify verify-a11y verify-backend verify-frontend \
	soc2-check w3c-check

help:
	@echo "DartChain make targets"
	@echo "  make dev-stack     Postgres + backend (:8080) + frontend (:4200)"
	@echo "  make stop          Arrête la stack détachée"
	@echo "  make status        Health API + UI"
	@echo "  make logs          Suit les logs .dev-logs/"
	@echo "  make postgres-up   Conteneur Postgres seul"
	@echo "  make backend       Backend au premier plan (npm start)"
	@echo "  make frontend      Frontend au premier plan (ng serve)"
	@echo "  make w3c-check     Contrat a11y / structure HTML (Vitest)"
	@echo "  make soc2-check    Vérifs contrôles techniques (secrets, hardening, a11y)"
	@echo "  make verify        Backend verify + frontend quality"

# ── Stack complète ───────────────────────────────────────────────────────────

dev-stack:
	@echo "==> make dev-stack — Postgres + backend + frontend"
	bash "$(BACKEND)/bin/start-dev-detached.sh"

stop:
	bash "$(BACKEND)/bin/stop-dev-detached.sh"

status:
	@echo -n "Postgres :5432  "; (pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1 && echo OK) || echo DOWN
	@echo -n "Backend  :8080  "; (curl -fsS http://127.0.0.1:8080/api/health >/dev/null 2>&1 && echo OK) || echo DOWN
	@echo -n "Frontend :4200  "; (curl -fsS -o /dev/null http://127.0.0.1:4200/ >/dev/null 2>&1 && echo OK) || echo DOWN

logs:
	@mkdir -p "$(LOG_DIR)"
	@touch "$(LOG_DIR)/backend.log" "$(LOG_DIR)/frontend.log"
	tail -n 80 -F "$(LOG_DIR)/backend.log" "$(LOG_DIR)/frontend.log"

postgres-up:
	bash "$(BACKEND)/bin/postgres-up.sh"

backend:
	cd "$(BACKEND)" && npm start

frontend:
	cd "$(FRONTEND)" && npm start

# ── Qualité / conformité technique ───────────────────────────────────────────

w3c-check verify-a11y:
	@echo "==> Contrat accessibilité / structure (proxy W3C UX shell)"
	cd "$(FRONTEND)" && npm run verify:a11y

verify-backend:
	cd "$(BACKEND)" && npm run verify:release

verify-frontend:
	cd "$(FRONTEND)" && npm run verify:quality

verify: verify-backend verify-frontend

# SOC2 Type 1 = attestation d’auditeur (design des contrôles à un instant T).
# Cette cible vérifie des *contrôles techniques* déjà dans le code — pas une certification.
soc2-check:
	@echo "==> SOC2 Type 1 — contrôles techniques (pas une attestation AICPA)"
	@test -f "$(ROOT)/deploy/soc2-type1-control-map.md" && echo "OK control map" || (echo "MANQUE deploy/soc2-type1-control-map.md" >&2; exit 1)
	cd "$(BACKEND)" && npm run verify:secrets
	cd "$(BACKEND)" && npm run verify:ah
	cd "$(FRONTEND)" && npm run verify:a11y
	@echo "OK soc2-check technique. Attestation Type 1 = cabinet d’audit externe."
