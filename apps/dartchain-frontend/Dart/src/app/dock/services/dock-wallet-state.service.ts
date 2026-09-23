import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { BlockchainApiService } from '@blockchain/services/blockchain-api.service';
import { WalletSessionService } from '@wallet/services/wallet-session.service';
import { formatDockRelativeTime } from '@core/utils/dock-time.util';
import {
  addR4v3Amounts,
  compareR4v3Amounts,
  formatR4v3AmountCompact,
  normalizeR4v3Amount,
} from '@core/utils/r4v3-amount.util';

export type DockWalletPhase = 'error' | 'loading' | 'disconnected' | 'ready';

@Injectable({ providedIn: 'root' })
export class DockWalletStateService {
  private readonly api = inject(BlockchainApiService);
  private readonly walletSession = inject(WalletSessionService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly balance = signal<string | null>(null);
  readonly lastUpdatedAt = signal<number | null>(null);

  private reloadQueued = false;
  /** Solde plancher tant que la chaîne n’a pas rattrapé le crédit optimiste. */
  private optimisticFloor: string | null = null;
  private optimisticUntilMs = 0;

  readonly hasWallet = computed(() => {
    const wallet = this.walletSession.wallet();
    return Boolean(wallet?.address?.trim() && wallet?.privateKey?.trim());
  });
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
    return bal !== null
      ? `${formatR4v3AmountCompact(bal)} R4V3`
      : 'Solde —';
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
    this.walletSession.optimisticCredit$.subscribe((amount) =>
      this.applyOptimisticCredit(amount)
    );
  }

  /** Crédit immédiat (claim faucet / quête) avant retour getBalance. */
  applyOptimisticCredit(amount: string | number): void {
    const delta = normalizeR4v3Amount(amount);
    if (delta === '0') {
      return;
    }
    const next = addR4v3Amounts(this.balance() ?? '0', delta);
    this.balance.set(next);
    this.optimisticFloor = next;
    this.optimisticUntilMs = Date.now() + 12_000;
    this.lastUpdatedAt.set(Date.now());
    this.error.set(false);
  }

  async load(): Promise<void> {
    const address = this.address();
    if (!address) {
      this.balance.set(null);
      return;
    }

    if (this.loading()) {
      this.reloadQueued = true;
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    try {
      const response = await firstValueFrom(this.api.getBalance(address));
      const chain = normalizeR4v3Amount(response?.balance ?? '0');
      const floor = this.optimisticFloor;
      const floorActive =
        floor != null && Date.now() < this.optimisticUntilMs;
      if (floorActive && compareR4v3Amounts(chain, floor) < 0) {
        // Chaîne pas encore à jour — garde le solde optimiste.
        return;
      }
      this.optimisticFloor = null;
      this.optimisticUntilMs = 0;
      this.balance.set(chain);
      this.lastUpdatedAt.set(Date.now());
    } catch {
      if (this.balance() === null) {
        this.error.set(true);
      }
    } finally {
      this.loading.set(false);
      if (this.reloadQueued) {
        this.reloadQueued = false;
        void this.load();
      }
    }
  }

  refresh(): void {
    void this.load();
  }
}
