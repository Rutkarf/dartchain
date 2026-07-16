import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { FaucetService } from './faucet.service';
import { WalletSessionService } from './wallet-session.service';
import { formatDockRelativeTime } from '../utils/dock-time.util';

export type DockFaucetPhase =
  | 'error'
  | 'loading'
  | 'disconnected'
  | 'cooldown'
  | 'ready';

@Injectable({ providedIn: 'root' })
export class DockFaucetStateService {
  private readonly faucet = inject(FaucetService);
  private readonly walletSession = inject(WalletSessionService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly eligible = signal(false);
  readonly cooldownSeconds = signal(0);
  readonly defaultAmount = signal('—');
  readonly lastClaimAmount = signal<string | null>(null);
  readonly lastClaimAt = signal<number | null>(null);
  readonly lastUpdatedAt = signal<number | null>(null);

  readonly hasWallet = computed(() => this.walletSession.wallet() !== null);

  readonly phase = computed((): DockFaucetPhase => {
    if (this.error()) {
      return 'error';
    }
    if (this.loading()) {
      return 'loading';
    }
    if (!this.hasWallet()) {
      return 'disconnected';
    }
    if (!this.eligible() && this.cooldownSeconds() > 0) {
      return 'cooldown';
    }
    return this.eligible() ? 'ready' : 'cooldown';
  });

  readonly statusLabel = computed(() => {
    switch (this.phase()) {
      case 'error':
        return 'Erreur';
      case 'loading':
        return 'Sync…';
      case 'disconnected':
        return 'Sans wallet';
      case 'ready':
        return 'Disponible';
      default:
        return 'Cooldown';
    }
  });

  readonly headline = computed(() => {
    if (!this.hasWallet()) {
      return 'Connecter un wallet pour réclamer';
    }

    if (this.eligible()) {
      return `Réclamation ${this.defaultAmount()} R4V3 disponible`;
    }

    if (this.cooldownSeconds() > 0) {
      return `Prochaine réclamation dans ${this.formatCooldown(this.cooldownSeconds())}`;
    }

    const lastAmount = this.lastClaimAmount();
    if (lastAmount) {
      return `Dernière réclamation · ${lastAmount} R4V3`;
    }

    return 'Faucet en attente';
  });

  readonly progressLabel = computed(() => {
    const lastAt = this.lastClaimAt();
    if (!lastAt) {
      return '';
    }

    return `Dernière utilisation ${formatDockRelativeTime(lastAt)}`;
  });

  readonly updatedAgeLabel = computed(() =>
    formatDockRelativeTime(this.lastUpdatedAt())
  );

  async load(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    try {
      const config = await firstValueFrom(this.faucet.getConfig()).catch(() => null);
      if (config) {
        this.defaultAmount.set(config.defaultClaimAmount);
      }

      const address = this.walletSession.address();
      if (!address) {
        this.eligible.set(false);
        this.cooldownSeconds.set(0);
        this.lastUpdatedAt.set(Date.now());
        return;
      }

      const state = await firstValueFrom(this.faucet.getState(address)).catch(() => null);
      if (!state) {
        this.error.set(true);
        return;
      }

      this.eligible.set(state.eligible);
      this.cooldownSeconds.set(Math.max(0, state.cooldownSeconds ?? 0));
      this.lastClaimAmount.set(state.lastClaimAmount);
      this.lastClaimAt.set(
        state.lastClaimAt ? Date.parse(state.lastClaimAt) : null
      );
      this.lastUpdatedAt.set(Date.now());
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  refresh(): void {
    void this.load();
  }

  private formatCooldown(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) {
      return `${seconds}s`;
    }
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }
}
