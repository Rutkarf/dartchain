import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { BlockchainApiService } from './blockchain-api.service';
import { WalletSessionService } from './wallet-session.service';
import { formatDockRelativeTime } from '../utils/dock-time.util';
import { formatR4v3Amount, normalizeR4v3Amount } from '../utils/r4v3-amount.util';

export type DockWalletPhase = 'error' | 'loading' | 'disconnected' | 'ready';

@Injectable({ providedIn: 'root' })
export class DockWalletStateService {
  private readonly api = inject(BlockchainApiService);
  private readonly walletSession = inject(WalletSessionService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly balance = signal<string | null>(null);
  readonly lastUpdatedAt = signal<number | null>(null);

  readonly hasWallet = computed(() => this.walletSession.wallet() !== null);
  readonly address = computed(() => this.walletSession.address() ?? '');

  readonly phase = computed((): DockWalletPhase => {
    if (this.error()) {
      return 'error';
    }
    if (this.loading()) {
      return 'loading';
    }
    if (!this.hasWallet()) {
      return 'disconnected';
    }
    return 'ready';
  });

  readonly statusLabel = computed(() => {
    switch (this.phase()) {
      case 'error':
        return 'Erreur';
      case 'loading':
        return 'Sync…';
      case 'disconnected':
        return 'Hors ligne';
      default:
        return 'Connecté';
    }
  });

  readonly headline = computed(() => {
    if (!this.hasWallet()) {
      return 'Créer ou importer un wallet';
    }

    const bal = this.balance();
    return bal !== null ? `${formatR4v3Amount(bal)} R4V3` : 'Solde —';
  });

  readonly progressLabel = computed(() => {
    const address = this.address();
    if (!address) {
      return '';
    }

    return address.length > 20
      ? `${address.slice(0, 8)}…${address.slice(-6)}`
      : address;
  });

  readonly updatedAgeLabel = computed(() =>
    formatDockRelativeTime(this.lastUpdatedAt())
  );

  constructor() {
    this.walletSession.balanceRefresh$.subscribe(() => this.refresh());
  }

  async load(): Promise<void> {
    const address = this.address();
    if (!address) {
      this.balance.set(null);
      return;
    }

    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    try {
      const response = await firstValueFrom(this.api.getBalance(address));
      this.balance.set(normalizeR4v3Amount(response?.balance ?? '0'));
      this.lastUpdatedAt.set(Date.now());
    } catch {
      this.balance.set(null);
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  refresh(): void {
    void this.load();
  }
}
