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

/** Valeurs de départ DEV — Éliminer pour gagner lisible, non définitives. */
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

export const ARENA_WEAPON_UI_NAME = 'Fusil à impulsion BB';

export const ARENA_FAUCET_DISCLAIMER =
  'Éliminer pour gagner : seul le registre de l’arène (M4T3R du robinet non réclamé) bouge. Le portefeuille de la chaîne ne bouge jamais.';

export const ARENA_KTE_TAG = 'Éliminer pour gagner';
