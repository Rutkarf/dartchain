/**
 * État joueur isolé du profil Auth / wallet.
 * Ne contient jamais d’adresse wallet complète, clés ou secrets.
 */
export type PlayerGameStatus =
  | 'connected'
  | 'spawning'
  | 'alive'
  | 'eliminated'
  | 'disconnected';

export type EquippedArenaItem = 'arcade-rifle';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerGameState {
  userId: string;
  displayName: string;
  avatarId?: string;
  status: PlayerGameStatus;
  position: Vec3;
  rotation: Vec3;
  health: number;
  maxHealth: number;
  equippedItem: EquippedArenaItem;
  /** Ledger arène isolé (Q1=C) — pas le wallet blockchain. */
  faucetBalance: number;
  /** Solde jeu non lootable (stub) — distinct du claim on-chain. */
  protectedBalance: number;
  /** Miroir lecture seule du pending faucet (affichage) — jamais source de vérité loot. */
  pendingDisplayMirror: number;
  kills: number;
  deaths: number;
  spawnShieldUntil?: string;
  lastEliminatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArenaEliminationResult {
  eventId: string;
  accepted: boolean;
  reason?: string;
  killerUserId: string;
  victimUserId: string;
  lootAmount: number;
  killerFaucetBalanceAfter: number;
  victimFaucetBalanceAfter: number;
}
