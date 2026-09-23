# Arène BB — Kill-to-earn (état)

## Livré (solo fiable)

- Star Conquest **désactivé** via `starConquestEnabled: false` (code intact, réactivation = flag `true`)
- Feel tir : beam, muzzle, sparks, flash, kick cam, freeze KO
- Lock-on + soft-aim + bots IA (strafe / cover)
- HUD KTE + age gate + modes FFA / Horde / Duel (rebuild bots)
- Loot ledger + streak multi ; claim quête 3 KO depuis **HUD et dock**
- Respawn bots même après upgrade WS hybrid
- Boundary : wallet blockchain jamais touché

## Backlog P1 (multi / prod — non livré)

- Hits / health serveur + séparation humains vs bots AI
- Rooms dans `ArenaPresenceRegistry` + reconnect WS
- Caps / cooldowns `ArenaBalanceProperties` réellement appliqués
- Leaderboard REST branché au HUD
- Ledger persistant (remplacer `InMemoryArenaLedgerStore`)
- Colliders joueur + leave session UI

## Backlog P2

- Shadows restore correct, télémétrie export, reset quotidien quête / age gate
- E2E combat → loot → dock

## Jouer

1. Age gate 16+ (une fois)
2. FIRE / Espace / F / double-tap
3. KO → +ƒ ledger · streak = multi
4. 3 KO → Claim quête (HUD ou dock)
5. `?` = modes / skins / room (room = stub UI)
