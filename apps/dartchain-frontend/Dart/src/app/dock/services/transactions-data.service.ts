import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Block } from '@blockchain/models/block.model';
import {
  BlockchainApiService,
  PendingTransaction,
} from '@blockchain/services/blockchain-api.service';
import { TransactionsDockService } from './transactions-dock.service';

@Injectable({ providedIn: 'root' })
export class TransactionsDataService {
  private static readonly REFRESH_DEBOUNCE_MS = 500;
  private static readonly RATE_LIMIT_BACKOFF_MS = 60_000;
  private static readonly MIN_REFRESH_GAP_MS = 2_000;

  private readonly api = inject(BlockchainApiService);
  private readonly dock = inject(TransactionsDockService);

  readonly pending = signal<PendingTransaction[]>([]);
  readonly latestBlock = signal<Block | null>(null);
  readonly pendingLoading = signal(false);
  readonly tipLoading = signal(false);
  readonly pendingError = signal<string | null>(null);
  readonly tipError = signal<string | null>(null);
  readonly rateLimitedUntil = signal(0);

  private pendingInflight: Promise<void> | null = null;
  private tipInflight: Promise<void> | null = null;
  private refreshTimerId: number | null = null;
  private lastPendingFetchMs = 0;
  private lastTipFetchMs = 0;
  private wsStarted = false;

  init(): void {
    if (this.wsStarted) {
      return;
    }

    this.wsStarted = true;
    this.api.connectLiveUpdates().subscribe({
      next: (message) => {
        if (message.type === 'pending-transactions') {
          this.applyPending(message.data);
        }

        if (message.type === 'snapshot') {
          this.applyPending(message.data.pendingTransactions);
          if (message.data.blocks?.length) {
            const sorted = [...message.data.blocks].sort((a, b) => b.index - a.index);
            this.latestBlock.set(sorted[0] ?? null);
          }
        }

        if (message.type === 'blocks' && message.data.length > 0) {
          const sorted = [...message.data].sort((a, b) => b.index - a.index);
          this.latestBlock.set(sorted[0] ?? null);
        }
      },
    });

    void this.refreshAll(true);
  }

  scheduleRefresh(force = false): void {
    if (this.refreshTimerId !== null) {
      window.clearTimeout(this.refreshTimerId);
    }

    this.refreshTimerId = window.setTimeout(() => {
      this.refreshTimerId = null;
      void this.refreshAll(force);
    }, TransactionsDataService.REFRESH_DEBOUNCE_MS);
  }

  async refreshAll(force = false): Promise<void> {
    await Promise.all([this.refreshPending(force), this.refreshTip(force)]);
  }

  async refreshPending(force = false): Promise<void> {
    if (this.isRateLimited()) {
      this.pendingError.set('Trop de requêtes — pause d’1 minute.');
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastPendingFetchMs < TransactionsDataService.MIN_REFRESH_GAP_MS) {
      return;
    }

    if (this.pendingInflight && !force) {
      return this.pendingInflight;
    }

    this.pendingLoading.set(true);
    this.pendingInflight = (async () => {
      try {
        const response = await firstValueFrom(this.api.getPendingTransactions());
        this.applyPending(response);
        this.pendingError.set(null);
        this.lastPendingFetchMs = Date.now();
      } catch (error) {
        this.handleRateLimit(error);
        if (!this.isRateLimited()) {
          this.pendingError.set('Impossible de charger le mempool.');
        }
      } finally {
        this.pendingLoading.set(false);
        this.pendingInflight = null;
      }
    })();

    return this.pendingInflight;
  }

  async refreshTip(force = false): Promise<void> {
    if (this.isRateLimited()) {
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastTipFetchMs < TransactionsDataService.MIN_REFRESH_GAP_MS) {
      return;
    }

    if (this.tipInflight && !force) {
      return this.tipInflight;
    }

    this.tipLoading.set(true);
    this.tipInflight = (async () => {
      try {
        const block = await firstValueFrom(this.api.getLatestBlock());
        this.latestBlock.set(block ?? null);
        this.tipError.set(null);
        this.lastTipFetchMs = Date.now();
      } catch (error) {
        this.handleRateLimit(error);
        if (!this.isRateLimited()) {
          this.tipError.set(null);
        }
      } finally {
        this.tipLoading.set(false);
        this.tipInflight = null;
      }
    })();

    return this.tipInflight;
  }

  isRateLimited(): boolean {
    return Date.now() < this.rateLimitedUntil();
  }

  private applyPending(data: PendingTransaction[] | null | undefined): void {
    const items = Array.isArray(data) ? data : [];
    this.pending.set(items);
    this.dock.setPendingCount(items.length);
    this.lastPendingFetchMs = Date.now();
  }

  private handleRateLimit(error: unknown): void {
    const status = (error as { status?: number })?.status;
    if (status === 429) {
      this.rateLimitedUntil.set(Date.now() + TransactionsDataService.RATE_LIMIT_BACKOFF_MS);
      this.pendingError.set('Trop de requêtes — nouvel essai dans 1 minute.');
    }
  }
}
