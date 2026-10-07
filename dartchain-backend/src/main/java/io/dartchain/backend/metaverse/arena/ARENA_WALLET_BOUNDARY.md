# Frontière wallet / gameplay — MetaVerseBB Arena

## Règle

Le prototype d’arène **ne doit jamais** lire, modifier, claim ou transférer le solde blockchain réel (`walletBalance`).

## Mapping des soldes (Q1 = C hybride)

| Concept | Implémentation | Lootable |
|---|---|---|
| `faucetBalance` (jeu) | `InMemoryArenaLedgerStore` / `ArenaEconomyMockService` | Oui (serveur) |
| `pendingDisplayMirror` | Lecture seule de `FaucetPendingBalanceStore` au join | Non (miroir UI) |
| `protectedBalance` | Champ ledger arène (stub) | Non |
| `walletBalance` | `BlockchainService` / dock wallet | **Jamais** |

## Interdits

- Aucun appel à `BlockchainService` depuis `metaverse.arena`
- Aucun appel claim faucet (`FaucetService.claim`)
- Aucun smart contract / MetaMask / signature
- Aucun débit de `FaucetPendingBalanceStore` lors d’un kill

## Endpoints isolés

- `POST /api/metaverse/arena/session/join`
- `POST /api/metaverse/arena/session/leave`
- `GET /api/metaverse/arena/state`
- `POST /api/metaverse/arena/events/elimination`
- `GET /api/metaverse/arena/leaderboard`

## Multijoueur

- MVP historique = mock local (bots).
- **Q2=B actif** : WebSocket dédié `/ws/metaverse-arena` (auth JWT via `access_token`).
- Fallback automatique vers mock si WS indisponible.
- Ne pas réutiliser `/ws/live|chat|peers` pour le combat.
