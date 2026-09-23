/**
 * Config économique arène — valeurs de développement uniquement.
 * La vérité serveur doit primer ; le client ne doit pas imposer le loot.
 */
export interface GameBalanceConfig {
  lootRate: number;
  lootCapPerElimination: number;
  minimumFaucetBalanceToLoot: number;
  spawnShieldDurationSeconds: number;
  respawnDelaySeconds: number;
  killCooldownSeconds: number;
  dailyLootCap: number;
  dailyLossCap: number;
  newPlayerProtectionDurationSeconds: number;
  antiFarmingThreshold: number;
  maxHealth: number;
  hitscanDamage: number;
  fireCooldownMs: number;
  maxMoveSpeedMps: number;
}

/** Valeurs de départ DEV — Kill-to-earn lisible, non définitives. */
export const DEFAULT_ARENA_BALANCE_CONFIG: GameBalanceConfig = {
  lootRate: 0.18,
  lootCapPerElimination: 40,
  minimumFaucetBalanceToLoot: 1,
  spawnShieldDurationSeconds: 2,
  respawnDelaySeconds: 3.5,
  killCooldownSeconds: 1.5,
  dailyLootCap: 400,
  dailyLossCap: 400,
  newPlayerProtectionDurationSeconds: 60,
  antiFarmingThreshold: 8,
  maxHealth: 100,
  hitscanDamage: 38,
  fireCooldownMs: 200,
  maxMoveSpeedMps: 8,
};

export const ARENA_WEAPON_UI_NAME = 'BB Pulse Rifle';

export const ARENA_FAUCET_DISCLAIMER =
  'Kill-to-earn : seul le ledger arène (M4T3R faucet non claimé) bouge. Wallet blockchain = jamais.';

export const ARENA_KTE_TAG = 'Kill-to-earn';
