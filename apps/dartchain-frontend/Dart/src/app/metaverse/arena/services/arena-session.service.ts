import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@auth/services/auth.service';
import { ProductConfigService } from '@core/config/product-config.service';
import { FaucetService } from '@faucet/services/faucet.service';
import { environment } from '../../../../environments/environment';
import { WalletSessionService } from '@wallet/services/wallet-session.service';

import { ArenaEconomyMockService } from './arena-economy.mock.service';
import { ArenaTransportHybridService } from './arena-transport.hybrid.service';
import { ArenaMetaService } from './arena-meta.service';
import { ArenaTelemetryService } from './arena-telemetry.service';
import type {
  ArenaEliminationResult,
  PlayerGameState,
} from '../models/player-game-state.model';
import { ARENA_FAUCET_DISCLAIMER } from '../models/game-balance.config';

export type ArenaUiPhase = 'off' | 'rules' | 'playing' | 'eliminated';

/**
 * Orchestration arène — feature-flaguée, isolée du wallet claim.
 */
@Injectable({ providedIn: 'root' })
export class ArenaSessionService {
  private readonly product = inject(ProductConfigService);
  private readonly auth = inject(AuthService);
  private readonly walletSession = inject(WalletSessionService);
  private readonly faucet = inject(FaucetService);
  private readonly economy = inject(ArenaEconomyMockService);
  private readonly transport = inject(ArenaTransportHybridService);
  private readonly meta = inject(ArenaMetaService);
  private readonly telemetry = inject(ArenaTelemetryService);
  private readonly http = inject(HttpClient);

  private readonly phaseSignal = signal<ArenaUiPhase>('off');
  private readonly localSignal = signal<PlayerGameState | null>(null);
  private readonly lastLootSignal = signal<ArenaEliminationResult | null>(null);
  private readonly noticeSignal = signal<string | null>(null);

  readonly enabled = computed(() => this.product.metaverseArenaEnabled);
  readonly phase = this.phaseSignal.asReadonly();
  readonly localPlayer = this.localSignal.asReadonly();
  readonly lastLoot = this.lastLootSignal.asReadonly();
  readonly notice = this.noticeSignal.asReadonly();
  readonly disclaimer = ARENA_FAUCET_DISCLAIMER;
  readonly transportMode = this.transport.transportMode;

  openRules(): void {
    if (!this.enabled()) return;
    this.phaseSignal.set('rules');
  }

  dismissRules(): void {
    if (this.phaseSignal() === 'rules') {
      this.phaseSignal.set('off');
    }
  }

  async enterArena(): Promise<void> {
    if (!this.enabled()) return;
    if (this.phaseSignal() === 'playing' && this.localSignal()) return;

    const user = this.auth.user();
    // Guest autorisé : l’Arène BB doit être jouable sans bouton / sans login obligatoire.
    const userId = user?.id ?? `guest-local`;
    const displayName = user?.username ?? 'Guest';

    let pendingMirror = 0;
    const wallet = this.walletSession.address();
    if (user && wallet) {
      try {
        const state = await firstValueFrom(this.faucet.getState(wallet));
        pendingMirror = Number.parseFloat(state.pendingAmount ?? '0') || 0;
      } catch {
        pendingMirror = 0;
      }
    }

    const local = this.economy.seedFromPendingMirror(userId, displayName, pendingMirror);
    const playing: PlayerGameState = { ...local, status: 'alive' };
    this.economy.upsert(playing);
    this.transport.connect(playing);
    this.localSignal.set(playing);
    this.phaseSignal.set('playing');
    this.noticeSignal.set(null);
    this.telemetry.resetSession();

    if (user) {
      void this.tryServerJoin(playing);
    }
  }

  /** Démarre l’arène si le flag est on et qu’aucune session n’est active. */
  ensureAutoPlay(): void {
    if (!this.enabled()) return;
    if (this.phaseSignal() === 'playing' || this.phaseSignal() === 'eliminated') return;
    void this.enterArena();
  }

  leaveArena(): void {
    const local = this.localSignal();
    if (local) {
      this.economy.upsert({ ...local, status: 'disconnected' });
    }
    this.transport.disconnect();
    this.localSignal.set(null);
    this.phaseSignal.set('off');
    this.lastLootSignal.set(null);
  }

  refreshLocalFromEconomy(): void {
    const id = this.localSignal()?.userId;
    if (!id) return;
    const next = this.economy.getState(id);
    if (next) this.localSignal.set(next);
  }

  async reportElimination(victimUserId: string): Promise<ArenaEliminationResult | null> {
    const local = this.localSignal();
    if (!local || local.status !== 'alive') return null;

    const eventId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const lootMultiplier = this.meta.lootMultiplier();

    let result = await this.transport.requestElimination({
      eventId,
      killerUserId: local.userId,
      victimUserId,
      lootMultiplier,
    });

    // REST seulement hors WS (évite double traitement ; eventId reste idempotent serveur).
    if (this.transport.transportMode() !== 'ws') {
      const serverResult = await this.tryServerElimination({
        eventId,
        killerUserId: local.userId,
        victimUserId,
      });
      if (serverResult) {
        result = serverResult;
      }
    }

    this.lastLootSignal.set(result);
    this.refreshLocalFromEconomy();

    if (result.accepted) {
      this.meta.registerKill(local.displayName, result.lootAmount);
      this.telemetry.recordEarn(result.lootAmount);
      if (victimUserId.startsWith('bot-')) {
        this.transport.scheduleBotRespawn(victimUserId);
      }
    }

    return result;
  }

  claimDockQuestReward(): number {
    const local = this.localSignal();
    if (!local) return 0;
    const amount = this.meta.claimDockQuest();
    if (amount <= 0) return 0;
    this.economy.creditFaucet(local.userId, amount);
    this.refreshLocalFromEconomy();
    this.telemetry.recordEarn(amount);
    this.noticeSignal.set(`Quête dock : +${amount} ƒ ledger Kill-to-earn`);
    return amount;
  }

  publishLocalPose(position: { x: number; y: number; z: number }, yaw: number): void {
    const local = this.localSignal();
    if (!local || this.phaseSignal() !== 'playing') return;
    this.transport.publishPose(
      local.userId,
      position,
      { x: 0, y: yaw, z: 0 }
    );
  }

  markLocalEliminated(byDisplayName: string, lootAmount: number): void {
    this.refreshLocalFromEconomy();
    this.phaseSignal.set('eliminated');
    this.noticeSignal.set(
      lootAmount > 0
        ? `Éliminé par ${byDisplayName}. −${lootAmount} M4T3R faucet (ledger arène).`
        : `Éliminé par ${byDisplayName}.`
    );
    this.scheduleAutoRespawn();
  }

  async respawnLocal(): Promise<void> {
    const local = this.localSignal();
    if (!local) {
      await this.enterArena();
      return;
    }
    const next: PlayerGameState = {
      ...local,
      status: 'alive',
      health: local.maxHealth,
      spawnShieldUntil: new Date(Date.now() + 8000).toISOString(),
      position: { x: 0, y: 0, z: 5 },
    };
    this.economy.upsert(next);
    this.localSignal.set(next);
    this.phaseSignal.set('playing');
    this.noticeSignal.set(null);
  }

  /** Respawn auto après élimination (shell 250×550 — pas de gros panneau bloquant). */
  scheduleAutoRespawn(): void {
    window.setTimeout(() => {
      if (this.phaseSignal() === 'eliminated') {
        void this.respawnLocal();
      }
    }, 2500);
  }

  remotePlayers(): PlayerGameState[] {
    return this.transport.listRemotePlayers();
  }

  private async tryServerJoin(player: PlayerGameState): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/metaverse/arena/session/join`, {
          displayName: player.displayName,
          pendingDisplayMirror: player.pendingDisplayMirror,
        })
      );
    } catch {
      // Mock local reste source de vérité visuelle si API absente.
    }
  }

  private async tryServerElimination(input: {
    eventId: string;
    killerUserId: string;
    victimUserId: string;
  }): Promise<ArenaEliminationResult | null> {
    try {
      return await firstValueFrom(
        this.http.post<ArenaEliminationResult>(
          `${environment.apiUrl}/metaverse/arena/events/elimination`,
          input
        )
      );
    } catch {
      return null;
    }
  }
}
