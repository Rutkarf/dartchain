# SOC 1 & SOC 2 (Type 1 / Type 2) — DartChain

> **Ce dépôt ne délivre pas de certification AICPA.**  
> Les fichiers ci-dessous cartographient la couverture **technique** pour préparer un audit.

| Document | Contenu |
|---|---|
| [soc2-type1-control-map.md](./soc2-type1-control-map.md) | SOC 2 Type 1 — design des contrôles à une date |
| [soc1-control-map.md](./soc1-control-map.md) | SOC 1 — contrôles liés à l’intégrité financière / ledger |
| [soc2-type2-operating-notes.md](./soc2-type2-operating-notes.md) | SOC 2 Type 2 — efficacité opérationnelle sur période |
| `admin-seed.local.txt` | Seed unlock panel admin (**local, gitignored**) |

## Panel admin global

1. Onglet **Admin** (dock) — déverrouillage **uniquement** avec la seed 24 mots.
2. API :
   - `POST /api/v1/admin/unlock` `{ "seed": "…" }` → `unlockToken`
   - `GET /api/v1/admin/export?format=json|txt|csv` + header `X-Admin-Unlock-Token`
3. Config serveur : `DARTCHAIN_ADMIN_SEED_SHA256` (hash, jamais la phrase).
4. Exports : users (sans hashes), auth audit, faucet, blocks, pending, ops, contrôles SOC.

## Vérifs

```bash
make soc2-check
```
