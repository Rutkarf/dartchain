# SOC2 Type 1 — carte de contrôles techniques (DartChain)

> **Important :** SOC 2 Type 1 est une **attestation d’un auditeur indépendant** (AICPA Trust Services Criteria) sur le *design* des contrôles à une date donnée.  
> Ce fichier **ne certifie pas** DartChain. Il cartographie ce que le code / l’ops couvrent déjà pour préparer un audit.

Produit : démo (tokens R4V3/M4T3R sans valeur). Périmètre audit réel = org + hébergeurs (Render, Cloudflare, Docker Hub) + process humains.

## Trust Services Criteria → preuves dans le dépôt

| Critère (extrait) | Contrôle attendu | Preuve code / ops |
|---|---|---|
| **CC6.1** Logical access | Auth JWT, RBAC USER/ADMIN, OAuth, **seed unlock panel admin** | `auth/`, `SecurityConfig`, `RoleAuthorizationService`, `AdminUnlockService` |
| **CC6.6 / CC6.7** Transmission & secrets | TLS en prod, secrets forts, seed admin = SHA-256 only | `ProductionSecretPolicy`, `DARTCHAIN_ADMIN_SEED_SHA256`, `.gitignore` `admin-seed.local.txt` |
| **CC6.8** Prevention unauthorized software | Images/build reproductibles, CI | `.github/workflows/ci.yml`, Dockerfiles |
| **CC7.1 / CC7.2** Detection / monitoring | Health, métriques, logs, rate limit, **admin export pack** | `/api/health`, `/api/v1/ops`, `/api/v1/admin/export`, `RateLimitFilter` |
| **CC7.3** Evaluation of anomalies | Alertes / smoke | `bin/check-stack-alerts.sh`, `smoke:live` |
| **CC8.1** Change management | Revue PR + CI gate | `ci.yml` (`mvnw verify`, Vitest, a11y) |
| **A1.2** Availability | Healthchecks Compose/Render | `docker-compose.yml` healthchecks, Render `/api/health` |
| **PI1.1** Processing integrity (partiel) | Validation txs, Flyway schema | `TransactionValidationService`, `db/migration` |
| **C1.1** Confidentiality (partiel) | Headers sécurité, CORS borné, actuator token | `SecurityHeadersFilter`, `CorsConfig`, `ActuatorAccessFilterConfig` |
| **P** Privacy | N/A produit démo — documenter absence de données perso réelles en prod | Politique org (hors repo) |

## Commandes de vérification technique

```bash
make soc2-check          # secrets + hardening AH + a11y
make w3c-check           # contrat accessibilité shell
make verify              # suite release backend + quality front
```

## Hors scope code (obligatoire pour un vrai Type 1)

- Politiques écrites (accès, incident, change, vendors)
- Inventaire actifs / diagramme de flux de données
- Revue d’accès périodique, offboarding
- Contrats DPA avec Render / Cloudflare
- Evidence pack (captures CI, tickets, backups testés)
- Période d’observation + lettre d’attestation auditeur

## W3C / accessibilité (complément)

- Shell : skip-link, focus-trap drawers, rôles `tab`/`tabpanel`, `lang="fr"` sur `index.html`
- Vérif automatisée : `make w3c-check` → `npm run verify:a11y`
- Validateur HTML W3C officiel : à lancer sur le HTML **rendu** (http://localhost:4200) — Angular émet du HTML dynamique ; le contrat a11y du repo est le garde-fou CI.
