# Frontière wallet / gameplay — MetaVerseBB Arena (frontend)

Voir aussi : `apps/dartchain-backend/.../metaverse/arena/ARENA_WALLET_BOUNDARY.md`

## Décisions validées

- Q1 = C (hybride) : miroir `pendingAmount` à l’affichage ; loot sur ledger arène isolé
- Q2 = A→B : mock local + bots ; **WS `/ws/metaverse-arena` actif** avec fallback mock
- Q3 = B+ : profil méditerranéen flaggé sur l’atmosphère existante
- Colliders AABB GeoJSON additifs (`ArenaGeoColliderService`) pour spawns bots safe

## Ne pas brancher

- `BlockchainService` / claim faucet / smart contracts
- `/ws/live`, `/ws/chat`, `/ws/peers` pour le combat
- Adresse wallet complète dans le HUD

## Flag

`environment.metaverseArenaEnabled` → `ProductConfigService.metaverseArenaEnabled`
