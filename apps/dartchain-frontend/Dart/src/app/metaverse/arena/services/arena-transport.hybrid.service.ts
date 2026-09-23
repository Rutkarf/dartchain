import { Injectable, inject, signal } from '@angular/core';

import { AuthService } from '@auth/services/auth.service';
import { environment } from '../../../../environments/environment';

import { ArenaTransportPort } from '../models/arena-transport.port';
import { ArenaEconomyMockService } from './arena-economy.mock.service';
import { ArenaTransportMockService } from './arena-transport.mock.service';
import { ArenaMetaService } from './arena-meta.service';
import {
  DEFAULT_ARENA_BALANCE_CONFIG,
} from '../models/game-balance.config';
import type {
  ArenaEliminationResult,
  PlayerGameState,
  Vec3,
} from '../models/player-game-state.model';

type TransportMode = 'connecting' | 'ws' | 'mock';

/**
 * Transport hybride Q2=A→B : tente `/ws/metaverse-arena`, sinon mock bots.
 */
@Injectable({ providedIn: 'root' })
export class ArenaTransportHybridService extends ArenaTransportPort {
  private readonly auth = inject(AuthService);
  private readonly economy = inject(ArenaEconomyMockService);
  private readonly mock = inject(ArenaTransportMockService);
  private readonly meta = inject(ArenaMetaService);

  private socket: WebSocket | null = null;
  private localPlayer: PlayerGameState | null = null;
  private remotes = new Map<string, PlayerGameState>();
  private mode: TransportMode = 'connecting';
  private pendingElimination:
    | {
        eventId: string;
        resolve: (value: ArenaEliminationResult) => void;
      }
    | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly modeSignal = signal<TransportMode>('connecting');

  readonly transportMode = this.modeSignal.asReadonly();

  connect(localPlayer: PlayerGameState): void {
    this.disconnect();
    this.localPlayer = localPlayer;

    // Toujours mock immédiat → bots visibles sans attendre le WS (sinon arène « morte »).
    this.activateMock(localPlayer);

    const token = this.auth.token();
    const base = (environment.arenaWsUrl ?? '').replace(/\/+$/, '');
    if (!token || !base) {
      return;
    }

    // Guest / offline déjà jouable ; WS optionnel en upgrade silencieux.
    const separator = base.includes('?') ? '&' : '?';
    const room = encodeURIComponent(this.meta.roomId());
    const url = `${base}${separator}access_token=${encodeURIComponent(token)}&room=${room}`;

    try {
      this.socket = new WebSocket(url);
    } catch {
      return;
    }

    this.connectTimer = setTimeout(() => {
      // Garder mock si WS trop lent.
      this.clearConnectTimer();
    }, 2500);

    this.socket.onopen = () => {
      this.clearConnectTimer();
      this.mode = 'ws';
      this.modeSignal.set('ws');
      this.send({
        type: 'join',
        displayName: localPlayer.displayName,
        pendingDisplayMirror: localPlayer.pendingDisplayMirror,
      });
    };

    this.socket.onmessage = (event: MessageEvent<string>) => {
      this.handleMessage(event.data);
    };

    this.socket.onerror = () => {
      // mock déjà actif
    };

    this.socket.onclose = () => {
      this.socket = null;
      if (this.mode === 'ws' && this.localPlayer) {
        this.activateMock(this.localPlayer);
      }
    };
  }

  disconnect(): void {
    this.clearConnectTimer();
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.send({ type: 'leave' });
      } catch {
        // ignore
      }
    }
    this.socket?.close();
    this.socket = null;
    this.mock.disconnect();
    this.remotes.clear();
    this.localPlayer = null;
    this.pendingElimination = null;
    this.mode = 'connecting';
    this.modeSignal.set('connecting');
  }

  publishPose(userId: string, position: Vec3, rotation: Vec3): void {
    if (this.mode === 'mock') {
      this.mock.publishPose(userId, position, rotation);
      return;
    }
    if (this.mode !== 'ws' || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.send({
      type: 'pose',
      x: position.x,
      y: position.y,
      z: position.z,
      ry: rotation.y,
    });
  }

  async requestElimination(input: {
    eventId: string;
    killerUserId: string;
    victimUserId: string;
    lootMultiplier?: number;
  }): Promise<ArenaEliminationResult> {
    // Bots mock = validation locale uniquement (absents du ledger serveur).
    if (input.victimUserId.startsWith('bot-') || this.mode === 'mock') {
      return this.mock.requestElimination(input);
    }
    if (this.mode !== 'ws' || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return this.economy.applyElimination(input);
    }

    return new Promise((resolve) => {
      this.pendingElimination = { eventId: input.eventId, resolve };
      this.send({
        type: 'elimination',
        eventId: input.eventId,
        victimUserId: input.victimUserId,
        lootMultiplier: input.lootMultiplier ?? 1,
      });
      window.setTimeout(() => {
        if (this.pendingElimination?.eventId === input.eventId) {
          const fallback = this.economy.applyElimination(input);
          this.pendingElimination.resolve(fallback);
          this.pendingElimination = null;
        }
      }, 2000);
    });
  }

  listRemotePlayers(): PlayerGameState[] {
    // Toujours fusionner mock bots + remotes WS (bots = cibles solo garanties).
    const fromMock = this.mock.listRemotePlayers();
    const fromWs = [...this.remotes.values()].filter(
      (p) => p.userId !== this.localPlayer?.userId && p.status !== 'disconnected'
    );
    const byId = new Map<string, PlayerGameState>();
    for (const p of fromMock) byId.set(p.userId, p);
    for (const p of fromWs) byId.set(p.userId, p);
    return [...byId.values()];
  }

  scheduleBotRespawn(botId: string): void {
    // Bots solo toujours gérés par le mock, même après upgrade WS.
    if (botId.startsWith('bot-')) {
      this.mock.scheduleBotRespawn(botId);
    }
  }

  /** Rebuild cibles selon mode FFA / Horde / Duel / Peers. */
  rebuildBotsForMode(mode: 'ffa-bots' | 'horde' | 'duel-bots' | 'ffa-peers'): void {
    this.mock.rebuildBotsForMode(mode);
  }

  private activateMock(localPlayer: PlayerGameState): void {
    this.clearConnectTimer();
    this.socket?.close();
    this.socket = null;
    this.mode = 'mock';
    this.modeSignal.set('mock');
    this.mock.connect(localPlayer);
  }

  private handleMessage(raw: string): void {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }
    const type = String(payload['type'] ?? '');

    if (type === 'snapshot') {
      this.remotes.clear();
      const players = payload['players'];
      if (Array.isArray(players)) {
        for (const entry of players) {
          const state = this.mapRemote(entry as Record<string, unknown>);
          if (state && state.userId !== this.localPlayer?.userId) {
            this.remotes.set(state.userId, state);
            this.economy.upsert(state);
          }
        }
      }
      // Solo sur WS : garder des bots mock pour le prototype combat.
      if (this.remotes.size === 0 && this.localPlayer) {
        this.mock.connect(this.localPlayer);
        for (const bot of this.mock.listRemotePlayers()) {
          this.remotes.set(bot.userId, bot);
        }
      }
      return;
    }

    if (type === 'player_joined') {
      const player = this.mapRemote(
        (payload['player'] as Record<string, unknown>) ?? {}
      );
      if (player && player.userId !== this.localPlayer?.userId) {
        this.remotes.set(player.userId, player);
        this.economy.upsert(player);
      }
      return;
    }

    if (type === 'player_pose') {
      const userId = String(payload['userId'] ?? '');
      const existing = this.remotes.get(userId) ?? this.economy.getState(userId);
      if (!existing || userId === this.localPlayer?.userId) return;
      const next: PlayerGameState = {
        ...existing,
        position: {
          x: Number(payload['x'] ?? existing.position.x),
          y: Number(payload['y'] ?? existing.position.y),
          z: Number(payload['z'] ?? existing.position.z),
        },
        rotation: {
          x: 0,
          y: Number(payload['ry'] ?? existing.rotation.y),
          z: 0,
        },
        status: 'alive',
        updatedAt: new Date().toISOString(),
      };
      this.remotes.set(userId, next);
      this.economy.upsert(next);
      return;
    }

    if (type === 'player_left') {
      const userId = String(payload['userId'] ?? '');
      this.remotes.delete(userId);
      return;
    }

    if (type === 'elimination_result') {
      const result: ArenaEliminationResult = {
        eventId: String(payload['eventId'] ?? ''),
        accepted: Boolean(payload['accepted']),
        reason: payload['reason'] ? String(payload['reason']) : undefined,
        killerUserId: String(payload['killerUserId'] ?? ''),
        victimUserId: String(payload['victimUserId'] ?? ''),
        lootAmount: Number(payload['lootAmount'] ?? 0),
        killerFaucetBalanceAfter: Number(payload['killerFaucetBalanceAfter'] ?? 0),
        victimFaucetBalanceAfter: Number(payload['victimFaucetBalanceAfter'] ?? 0),
      };
      this.applyEliminationLocally(result);
      if (this.pendingElimination?.eventId === result.eventId) {
        this.pendingElimination.resolve(result);
        this.pendingElimination = null;
      }
    }
  }

  private applyEliminationLocally(result: ArenaEliminationResult): void {
    if (!result.accepted) return;
    const killer = this.economy.getState(result.killerUserId);
    const victim = this.economy.getState(result.victimUserId);
    if (killer) {
      this.economy.upsert({
        ...killer,
        faucetBalance: result.killerFaucetBalanceAfter,
        kills: killer.kills + (result.lootAmount >= 0 ? 1 : 0),
      });
    }
    if (victim) {
      this.economy.upsert({
        ...victim,
        faucetBalance: result.victimFaucetBalanceAfter,
        status: 'eliminated',
        health: 0,
        deaths: victim.deaths + 1,
      });
      if (victim.userId.startsWith('bot-')) {
        window.setTimeout(() => {
          const bot = this.economy.getState(victim.userId);
          if (!bot) return;
          const revived: PlayerGameState = {
            ...bot,
            status: 'alive',
            health: bot.maxHealth,
            spawnShieldUntil: new Date(
              Date.now() + DEFAULT_ARENA_BALANCE_CONFIG.spawnShieldDurationSeconds * 1000
            ).toISOString(),
          };
          this.economy.upsert(revived);
          this.remotes.set(revived.userId, revived);
        }, DEFAULT_ARENA_BALANCE_CONFIG.respawnDelaySeconds * 1000);
      }
    }
  }

  private mapRemote(raw: Record<string, unknown>): PlayerGameState | null {
    const userId = String(raw['userId'] ?? '');
    if (!userId) return null;
    const now = new Date().toISOString();
    return {
      userId,
      displayName: String(raw['displayName'] ?? userId.slice(0, 8)),
      status: (String(raw['status'] ?? 'alive') as PlayerGameState['status']) || 'alive',
      position: {
        x: Number(raw['x'] ?? 0),
        y: Number(raw['y'] ?? 0),
        z: Number(raw['z'] ?? 5),
      },
      rotation: { x: 0, y: Number(raw['ry'] ?? 0), z: 0 },
      health: DEFAULT_ARENA_BALANCE_CONFIG.maxHealth,
      maxHealth: DEFAULT_ARENA_BALANCE_CONFIG.maxHealth,
      equippedItem: 'arcade-rifle',
      faucetBalance: Number(raw['faucetBalance'] ?? 0),
      protectedBalance: Number(raw['protectedBalance'] ?? 0),
      pendingDisplayMirror: 0,
      kills: Number(raw['kills'] ?? 0),
      deaths: Number(raw['deaths'] ?? 0),
      createdAt: now,
      updatedAt: now,
    };
  }

  private send(payload: Record<string, unknown>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(payload));
  }

  private clearConnectTimer(): void {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
  }
}
