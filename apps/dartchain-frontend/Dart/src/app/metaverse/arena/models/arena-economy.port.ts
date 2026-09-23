import type { ArenaEliminationResult, PlayerGameState } from './player-game-state.model';

/**
 * Port économie arène (Q1=C).
 * - Affiche un miroir du pending faucet.
 * - Applique les transferts uniquement sur le ledger arène isolé.
 * - Ne lit / ne modifie jamais walletBalance ni claim blockchain.
 */
export abstract class ArenaEconomyPort {
  abstract seedFromPendingMirror(
    userId: string,
    displayName: string,
    pendingDisplayMirror: number
  ): PlayerGameState;

  abstract getState(userId: string): PlayerGameState | null;

  abstract applyElimination(input: {
    eventId: string;
    killerUserId: string;
    victimUserId: string;
    lootMultiplier?: number;
  }): ArenaEliminationResult;
}
