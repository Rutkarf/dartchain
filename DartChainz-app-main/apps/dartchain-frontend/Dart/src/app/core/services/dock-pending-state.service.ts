import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  BlockchainApiService,
  PendingTransaction,
} from './blockchain-api.service';
import { formatDockRelativeTime, shortDockHash } from '../utils/dock-time.util';

export type DockPendingPhase = 'error' | 'loading' | 'empty' | 'ready' | 'busy';

@Injectable({ providedIn: 'root' })
export class DockPendingStateService {
  private readonly api = inject(BlockchainApiService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly transactions = signal<PendingTransaction[]>([]);
  readonly lastUpdatedAt = signal<number | null>(null);
  readonly mining = signal(false);

  readonly count = computed(() => this.transactions().length);

  readonly phase = computed((): DockPendingPhase => {
    if (this.error()) {
      return 'error';
    }
    if (this.loading() || this.mining()) {
      return 'busy';
    }
    if (this.count() === 0) {
      return 'empty';
    }
    return 'ready';
  });

  readonly statusLabel = computed(() => {
    switch (this.phase()) {
      case 'error':
        return 'Erreur';
      case 'loading':
      case 'busy':
        return 'Sync…';
      case 'empty':
        return 'Vide';
      default:
        return 'En attente';
    }
  });

  readonly headline = computed(() => {
    const items = this.transactions();
    if (items.length === 0) {
      return this.error() ? 'Chargement impossible' : 'Aucune transaction en attente';
    }

    const first = items[0];
    const hash = first.hash ?? first.id ?? '';
    const amount = first.amount;
    const amountLabel =
      amount !== null && amount !== undefined ? ` · ${amount} R4V3` : '';

    return `${shortDockHash(hash)}${amountLabel}`;
  });

  readonly progressLabel = computed(() => {
    const n = this.count();
    if (n === 0) {
      return '';
    }
    return `${n} tx en file`;
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
      const response = await firstValueFrom(this.api.getPendingTransactions());
      const items = Array.isArray(response) ? response : [];
      this.transactions.set(
        [...items].sort((a, b) => {
          const ta = typeof a.createdAt === 'number' ? a.createdAt : a.timestamp ?? 0;
          const tb = typeof b.createdAt === 'number' ? b.createdAt : b.timestamp ?? 0;
          return tb - ta;
        })
      );
      this.lastUpdatedAt.set(Date.now());
    } catch {
      this.transactions.set([]);
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  refresh(): void {
    void this.load();
  }
}
