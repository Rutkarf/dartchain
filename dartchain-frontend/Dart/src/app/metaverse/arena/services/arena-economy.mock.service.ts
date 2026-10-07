import { Injectable } from '@angular/core';

import { ArenaEconomyPort } from '../models/arena-economy.port';
import {
  DEFAULT_ARENA_BALANCE_CONFIG,
  type GameBalanceConfig,
} from '../models/game-balance.config';
import type {
  ArenaEliminationResult,
  PlayerGameState,
} from '../models/player-game-state.model';

/**
 * Ledger arène isolé en mémoire (Q1=C).
 * Ne touche pas FaucetPendingBalanceStore ni BlockchainService.
 */
@Injectable({ providedIn: 'root' })
export class ArenaEconomyMockService extends ArenaEconomyPort {
  private readonly states = new Map<string, PlayerGameState>();
  private readonly processedEvents = new Set<string>();
  private readonly config: GameBalanceConfig = DEFAULT_ARENA_BALANCE_CONFIG;

  seedFromPendingMirror(
    userId: string,
    displayName: string,
    pendingDisplayMirror: number
  ): PlayerGameState {
    const existing = this.states.get(userId);
    if (existing) {
      return {
        ...existing,
        pendingDisplayMirror,
        displayName,
        updatedAt: new Date().toISOString(),
      };
    }

    const now = new Date().toISOString();
    const shieldUntil = new Date(
      Date.now() + this.config.spawnShieldDurationSeconds * 1000
    ).toISOString();
    const seededFaucet = Math.max(0, Math.floor(pendingDisplayMirror));
    const state: PlayerGameState = {
      userId,
      displayName,
      status: 'spawning',
      position: { x: 0, y: 0, z: 5 },
      rotation: { x: 0, y: 0, z: 0 },
      health: this.config.maxHealth,
      maxHealth: this.config.maxHealth,
      equippedItem: 'arcade-rifle',
      faucetBalance: seededFaucet > 0 ? seededFaucet : 50,
      protectedBalance: 0,
      pendingDisplayMirror,
      kills: 0,
      deaths: 0,
      spawnShieldUntil: shieldUntil,
      createdAt: now,
      updatedAt: now,
    };
    this.states.set(userId, state);
    return state;
  }

  getState(userId: string): PlayerGameState | null {
    return this.states.get(userId) ?? null;
  }

  upsert(state: PlayerGameState): void {
    this.states.set(state.userId, { ...state, updatedAt: new Date().toISOString() });
  }

  applyElimination(input: {
    eventId: string;
    killerUserId: string;
    victimUserId: string;
    lootMultiplier?: number;
  }): ArenaEliminationResult {
    if (this.processedEvents.has(input.eventId)) {
      const killer = this.states.get(input.killerUserId);
      const victim = this.states.get(input.victimUserId);
      return {
        eventId: input.eventId,
        accepted: false,
        reason: 'DUPLICATE_EVENT',
        killerUserId: input.killerUserId,
        victimUserId: input.victimUserId,
        lootAmount: 0,
        killerFaucetBalanceAfter: killer?.faucetBalance ?? 0,
        victimFaucetBalanceAfter: victim?.faucetBalance ?? 0,
      };
    }

    const killer = this.states.get(input.killerUserId);
    const victim = this.states.get(input.victimUserId);
    if (!killer || !victim) {
      return {
        eventId: input.eventId,
        accepted: false,
        reason: 'PLAYER_NOT_FOUND',
        killerUserId: input.killerUserId,
        victimUserId: input.victimUserId,
        lootAmount: 0,
        killerFaucetBalanceAfter: killer?.faucetBalance ?? 0,
        victimFaucetBalanceAfter: victim?.faucetBalance ?? 0,
      };
    }

    if (input.killerUserId === input.victimUserId) {
      return {
        eventId: input.eventId,
        accepted: false,
        reason: 'SELF_ELIMINATION',
        killerUserId: input.killerUserId,
        victimUserId: input.victimUserId,
        lootAmount: 0,
        killerFaucetBalanceAfter: killer.faucetBalance,
        victimFaucetBalanceAfter: victim.faucetBalance,
      };
    }

    const mult = Math.max(1, input.lootMultiplier ?? 1);
    const rawLoot = Math.floor(victim.faucetBalance * this.config.lootRate * mult);
    const loot = Math.min(rawLoot, Math.floor(this.config.lootCapPerElimination * mult));
    const eligible =
      loot >= this.config.minimumFaucetBalanceToLoot || loot > 0
        ? Math.max(0, loot)
        : 0;

    const now = new Date().toISOString();
    const nextVictim: PlayerGameState = {
      ...victim,
      faucetBalance: Math.max(0, victim.faucetBalance - eligible),
      protectedBalance: victim.protectedBalance,
      health: 0,
      status: 'eliminated',
      deaths: victim.deaths + 1,
      lastEliminatedAt: now,
      updatedAt: now,
    };
    const nextKiller: PlayerGameState = {
      ...killer,
      faucetBalance: killer.faucetBalance + eligible,
      kills: killer.kills + 1,
      updatedAt: now,
    };

    this.states.set(victim.userId, nextVictim);
    this.states.set(killer.userId, nextKiller);
    this.processedEvents.add(input.eventId);

    return {
      eventId: input.eventId,
      accepted: true,
      killerUserId: killer.userId,
      victimUserId: victim.userId,
      lootAmount: eligible,
      killerFaucetBalanceAfter: nextKiller.faucetBalance,
      victimFaucetBalanceAfter: nextVictim.faucetBalance,
    };
  }

  /** Crédit ledger quête dock (Éliminer pour gagner local). */
  creditFaucet(userId: string, amount: number): number {
    const state = this.states.get(userId);
    if (!state || amount <= 0) return 0;
    const next = {
      ...state,
      faucetBalance: state.faucetBalance + amount,
      updatedAt: new Date().toISOString(),
    };
    this.states.set(userId, next);
    return amount;
  }

  /** Test / reset DEV uniquement. */
  clearAll(): void {
    this.states.clear();
    this.processedEvents.clear();
  }
}
