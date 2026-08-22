import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Block } from '@blockchain/models/block.model';
import { BlockchainApiService } from '@blockchain/services/blockchain-api.service';
import { formatDockRelativeTime, shortDockHash } from '@core/utils/dock-time.util';

export type DockBlockPhase = 'error' | 'loading' | 'ready';

@Injectable({ providedIn: 'root' })
export class DockBlockStateService {
  private static readonly MIN_REFRESH_GAP_MS = 3_000;
  private static readonly RATE_LIMIT_BACKOFF_MS = 60_000;

  private readonly api = inject(BlockchainApiService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly latestBlock = signal<Block | null>(null);
  readonly lastUpdatedAt = signal<number | null>(null);

  private lastFetchMs = 0;
  private rateLimitedUntil = 0;

  readonly phase = computed((): DockBlockPhase => {
    if (this.error()) {
      return 'error';
    }
    if (this.loading()) {
      return 'loading';
    }
    return 'ready';
  });

  readonly statusLabel = computed(() => {
    switch (this.phase()) {
      case 'error':
        return 'Erreur';
      case 'loading':
        return 'Sync…';
      default:
        return this.latestBlock() ? 'Validé' : 'Prêt';
    }
  });

  readonly blockHeight = computed(() => this.latestBlock()?.index ?? null);

  readonly headline = computed(() => {
    const block = this.latestBlock();
    if (!block) {
      return this.error() ? 'Tip indisponible' : 'Composer une transaction';
    }

    return `#${block.index} · ${shortDockHash(block.hash)}`;
  });

  readonly progressLabel = computed(() => {
    const block = this.latestBlock();
    if (!block) {
      return '';
    }

    const txCount = Array.isArray(block.transactions)
      ? block.transactions.length
      : 0;

    return `${txCount} tx dans le dernier bloc`;
  });

  /** Nombre de txs du tip, pour la barre mempool compacte. */
  readonly tipTxCount = computed(() => {
    const block = this.latestBlock();
    if (!block || !Array.isArray(block.transactions)) {
      return null;
    }
    return block.transactions.length;
  });

  readonly tipTxLabel = computed(() => {
    const n = this.tipTxCount();
    return n === null ? '' : `${n}tx`;
  });

  readonly updatedAgeLabel = computed(() =>
    formatDockRelativeTime(this.lastUpdatedAt())
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
    if (!force && now - this.lastFetchMs < DockBlockStateService.MIN_REFRESH_GAP_MS) {
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    try {
      const response = await firstValueFrom(this.api.getBlocks());
      const blocks = Array.isArray(response) ? response : [];
      const sorted = [...blocks].sort((a, b) => (b.index ?? 0) - (a.index ?? 0));
      this.latestBlock.set(sorted[0] ?? null);
      this.lastUpdatedAt.set(Date.now());
      this.lastFetchMs = Date.now();
    } catch (error) {
      this.handleRateLimit(error);
      if (!this.isRateLimited()) {
        this.latestBlock.set(null);
        this.error.set(true);
      }
    } finally {
      this.loading.set(false);
    }
  }

  refresh(force = false): void {
    void this.load(force);
  }

  private isRateLimited(): boolean {
    return Date.now() < this.rateLimitedUntil;
  }

  private handleRateLimit(error: unknown): void {
    const status = (error as { status?: number })?.status;
    if (status === 429) {
      this.rateLimitedUntil = Date.now() + DockBlockStateService.RATE_LIMIT_BACKOFF_MS;
      this.error.set(true);
    }
  }
}
