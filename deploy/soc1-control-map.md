# SOC 1 — carte de contrôles (DartChain)

> SOC 1 (SSAE 18) porte sur les **contrôles internes relatifs au reporting financier (ICFR)** chez un service organization.  
> DartChain démo n’est pas un SO financier ; cette carte documente les contrôles ledger / accès utiles si un auditeur élargit le périmètre.

| Critère (extrait) | Contrôle | Preuve |
|---|---|---|
| Accès logique ICFR | JWT + RBAC + seed admin pour exports | `RoleAuthorizationService`, `AdminUnlockService` |
| Intégrité traitements | Validation txs, mint/enqueue système | `TransactionValidationService`, `BlockchainService` |
| Change management | CI + PR | `.github/workflows/ci.yml` |
| Piste d’audit | Auth audit store + export admin | `InMemoryAuthAuditStore`, `/api/v1/admin/export` |
| Séparation des devoirs (partiel) | Seed ≠ JWT USER ; exports redacted | `AdminExportService` |

## Type 1 vs Type 2 (SOC 1)

- **Type 1** : design des contrôles à une date → cette carte + export `socControls`.
- **Type 2** : efficacité sur une **période d’observation** → process org (hors code) : revues d’accès, tickets, backups testés.
