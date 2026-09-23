import { Injectable, inject } from '@angular/core';

import { ArenaTransportPort } from '../models/arena-transport.port';
import { ArenaEconomyMockService } from './arena-economy.mock.service';
import { DEFAULT_ARENA_BALANCE_CONFIG } from '../models/game-balance.config';
import type {
  ArenaEliminationResult,
  PlayerGameState,
  Vec3,
} from '../models/player-game-state.model';
import { ArenaGeoColliderService } from './arena-geo-collider.service';
import { MIRROR_SPAWN_SAFE_ZONE } from '@world-map/map-configuration';

/**
 * Spawns bots hors de la zone safe miroir (face −Z / Canebière).
 * Rayon safe = 14 m autour de (0, 5) → placer ≥ ~18 m du centre.
 */
const SAFE_R = MIRROR_SPAWN_SAFE_ZONE.radiusMeters + 4;
const ARENA_BOT_SPAWNS: ReadonlyArray<{ id: string; name: string; x: number; z: number; faucet: number }> = [
  { id: 'bot-canebiere', name: 'Bot Canebière', x: 3.2, z: MIRROR_SPAWN_SAFE_ZONE.centerZ - SAFE_R, faucet: 40 },
  { id: 'bot-panier', name: 'Bot Panier', x: -4.0, z: MIRROR_SPAWN_SAFE_ZONE.centerZ - SAFE_R - 2, faucet: 30 },
  { id: 'bot-quai', name: 'Bot Quai', x: 1.2, z: MIRROR_SPAWN_SAFE_ZONE.centerZ - SAFE_R - 4, faucet: 25 },
];

/**
 * Transport mock (Q2=A) — bots locaux immédiats, positions jouables.
 */
@Injectable({ providedIn: 'root' })
export class ArenaTransportMockService extends ArenaTransportPort {
  private readonly economy = inject(ArenaEconomyMockService);
  private readonly geoColliders = inject(ArenaGeoColliderService);
  private remotes: PlayerGameState[] = [];
  private localUserId: string | null = null;

  connect(localPlayer: PlayerGameState): void {
    this.localUserId = localPlayer.userId;
    // Spawn immédiat (pas d’attente GeoJSON) — l’arène doit être jouable tout de suite.
    this.spawnBots(ARENA_BOT_SPAWNS.map((s) => ({ x: s.x, z: s.z })));
    // Reposition optionnelle hors murs si colliders prêts.
    void this.geoColliders.ensureLoaded().then(() => {
      if (!this.localUserId) return;
      this.remotes = this.remotes.map((bot, index) => {
        const fallback = ARENA_BOT_SPAWNS[index];
        const safe = this.geoColliders.findSafeSpawnNear(
          fallback?.x ?? 2,
          fallback?.z ?? -4,
          6
        );
        const next = {
          ...bot,
          position: { x: safe.x, y: 0, z: safe.z },
          spawnShieldUntil: undefined,
          status: 'alive' as const,
        };
        this.economy.upsert(next);
        return next;
      });
    });
  }

  private spawnBots(positions: Array<{ x: number; z: number }>): void {
    const now = new Date().toISOString();
    const bots: PlayerGameState[] = ARENA_BOT_SPAWNS.map((def, index) => {
      const pos = positions[index] ?? { x: def.x, z: def.z };
      const seeded = this.economy.seedFromPendingMirror(def.id, def.name, def.faucet);
      const bot: PlayerGameState = {
        ...seeded,
        status: 'alive',
        // Cibles immédiatement lootables — pas de shield anti-jeu.
        spawnShieldUntil: undefined,
        position: { x: pos.x, y: 0, z: pos.z },
        rotation: { x: 0, y: 0, z: 0 },
        createdAt: now,
        updatedAt: now,
      };
      this.economy.upsert(bot);
      return bot;
    });
    this.remotes = bots;
  }

  disconnect(): void {
    this.localUserId = null;
    this.remotes = [];
  }

  publishPose(userId: string, position: Vec3, rotation: Vec3): void {
    const state = this.economy.getState(userId);
    if (!state) return;
    this.economy.upsert({ ...state, position, rotation, status: 'alive' });
  }

  async requestElimination(input: {
    eventId: string;
    killerUserId: string;
    victimUserId: string;
    lootMultiplier?: number;
  }): Promise<ArenaEliminationResult> {
    return this.economy.applyElimination(input);
  }

  listRemotePlayers(): PlayerGameState[] {
    return this.remotes
      .map((r) => this.economy.getState(r.userId))
      .filter((s): s is PlayerGameState => !!s && s.status !== 'disconnected');
  }

  scheduleBotRespawn(botId: string): void {
    const delay = DEFAULT_ARENA_BALANCE_CONFIG.respawnDelaySeconds * 1000;
    window.setTimeout(() => {
      const bot = this.economy.getState(botId);
      if (!bot) return;
      const def = ARENA_BOT_SPAWNS.find((b) => b.id === botId);
      const safe = this.geoColliders.findSafeSpawnNear(def?.x ?? 2, def?.z ?? -4, 8);
      const revived: PlayerGameState = {
        ...bot,
        status: 'alive',
        health: bot.maxHealth,
        spawnShieldUntil: undefined,
        position: { x: safe.x, y: 0, z: safe.z },
      };
      this.economy.upsert(revived);
      const idx = this.remotes.findIndex((r) => r.userId === botId);
      if (idx >= 0) this.remotes[idx] = revived;
      else this.remotes.push(revived);
    }, delay);
  }

  /**
   * Rebuild bots selon le mode (duel = 1, ffa/horde = 3).
   * Les bots hors mode passent en `disconnected`.
   */
  rebuildBotsForMode(mode: 'ffa-bots' | 'horde' | 'duel-bots' | 'ffa-peers'): void {
    const count = mode === 'duel-bots' ? 1 : mode === 'ffa-peers' ? 2 : 3;
    const activeDefs = ARENA_BOT_SPAWNS.slice(0, count);
    const activeIds = new Set(activeDefs.map((d) => d.id));

    for (const def of ARENA_BOT_SPAWNS) {
      if (activeIds.has(def.id)) continue;
      const existing = this.economy.getState(def.id);
      if (existing) {
        this.economy.upsert({ ...existing, status: 'disconnected' });
      }
    }

    const now = new Date().toISOString();
    const bots: PlayerGameState[] = activeDefs.map((def) => {
      const seeded = this.economy.seedFromPendingMirror(def.id, def.name, def.faucet);
      const bot: PlayerGameState = {
        ...seeded,
        status: 'alive',
        health: seeded.maxHealth,
        spawnShieldUntil: undefined,
        position: { x: def.x, y: 0, z: def.z },
        rotation: { x: 0, y: 0, z: 0 },
        createdAt: seeded.createdAt ?? now,
        updatedAt: now,
      };
      this.economy.upsert(bot);
      return bot;
    });
    this.remotes = bots;
  }
}
