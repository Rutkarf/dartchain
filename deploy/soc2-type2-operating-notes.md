# SOC 2 Type 2 — notes d’efficacité opérationnelle

SOC 2 **Type 2** évalue si les contrôles décrits en Type 1 **fonctionnent** sur une période (souvent 3–12 mois).

## Ce que le code fournit

| Besoin Type 2 | Support technique |
|---|---|
| Evidence access | Export `authAudit` + users (rôles) via panel admin seed |
| Evidence change | Historique git / CI artifacts |
| Evidence monitoring | Ops snapshot + `make smoke:live` / alertes |
| Evidence secrets | Hash seed uniquement (`DARTCHAIN_ADMIN_SEED_SHA256`) |

## Hors code (obligatoire)

1. Politique d’accès + revue trimestrielle des comptes ADMIN
2. Journal incidents + post-mortems
3. Rotation seed admin + preuve de rotation
4. Conservation logs (durée = période d’observation)
5. Lettre d’attestation auditeur

## Export evidence pack

Depuis le panel Admin (seed) → Export → **Tout (.json + .txt + .csv)**.
