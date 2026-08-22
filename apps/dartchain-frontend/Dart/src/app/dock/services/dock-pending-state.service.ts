import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  BlockchainApiService,
  PendingTransaction,
} from '@blockchain/services/blockchain-api.service';
import { AuthService } from '@auth/services/auth.service';
import { formatDockRelativeTime, shortDockHash } from '@core/utils/dock-time.util';

export type DockPendingPhase = 'error' | 'loading' | 'empty' | 'ready' | 'busy';

@Injectable({ providedIn: 'root' })
export class DockPendingStateService {
  private static readonly MIN_REFRESH_GAP_MS = 3_000;
  private static readonly RATE_LIMIT_BACKOFF_MS = 60_000;

  private readonly api = inject(BlockchainApiService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly transactions = signal<PendingTransaction[]>([]);
  readonly lastUpdatedAt = signal<number | null>(null);
  readonly mining = signal(false);

  private lastFetchMs = 0;
  private rateLimitedUntil = 0;

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
        return this.mining() ? 'Minage…' : 'Sync…';
      case 'empty':
        return 'Vide';
      default:
        return 'En attente';
    }
  });

  /** Première tx à miner (plus récente). */
  readonly nextTransaction = computed(() => this.transactions()[0] ?? null);

  readonly nextHash = computed(() => {
    const first = this.nextTransaction();
    if (!first) {
      return '';
    }
    return (first.hash ?? first.id ?? '').trim();
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

  readonly canMine = computed(
    () => this.count() > 0 && !this.loading() && !this.mining()
  );

  async load(force = false): Promise<void> {
    if (this.loading()) {
      return;
    }

    if (this.isRateLimited()) {
      this.error.set(true);
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastFetchMs < DockPendingStateService.MIN_REFRESH_GAP_MS) {
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
      this.lastFetchMs = Date.now();
    } catch (error) {
      this.handleRateLimit(error);
      if (!this.isRateLimited()) {
        this.transactions.set([]);
        this.error.set(true);
      }
    } finally {
      this.loading.set(false);
    }
  }

  refresh(force = false): void {
    void this.load(force);
  }

  /** Mine toutes les txs pending (même logique que le dock mempool). */
  async mineAll(): Promise<boolean> {
    if (!this.canMine()) {
      return false;
    }

    if (!this.auth.promptLogin()) {
      return false;
    }

    this.mining.set(true);
    let ok = true;

    for (const tx of this.transactions()) {
      if (!tx.id) {
        continue;
      }

      try {
        await firstValueFrom(this.api.minePendingTransaction({ id: tx.id }));
      } catch {
        ok = false;
        break;
      }
    }

    this.mining.set(false);
    await this.load(true);
    return ok;
  }

  private isRateLimited(): boolean {
    return Date.now() < this.rateLimitedUntil;
  }

  private handleRateLimit(error: unknown): void {
    const status = (error as { status?: number })?.status;
    if (status === 429) {
      this.rateLimitedUntil = Date.now() + DockPendingStateService.RATE_LIMIT_BACKOFF_MS;
      this.error.set(true);
    }
  }
}
