import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Block } from '../models/block.model';
import {
  BlockchainApiService,
  BlockchainStats,
} from './blockchain-api.service';
import { sortBlocksDescending } from '@explorer/chain-graph/chain-explorer.util';

export interface ChainExplorerQuery {
  wallet?: string;
  fromIndex?: number | null;
  toIndex?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ChainDataService {
  private static readonly REFRESH_DEBOUNCE_MS = 500;
  private static readonly RATE_LIMIT_BACKOFF_MS = 60_000;
  private static readonly MIN_REFRESH_GAP_MS = 2_000;

  private readonly api = inject(BlockchainApiService);

  readonly blocks = signal<Block[]>([]);
  readonly stats = signal<BlockchainStats | null>(null);
  readonly chainValid = signal<boolean | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly rateLimitedUntil = signal(0);
  readonly usingServerFilter = signal(false);

  private refreshTimerId: number | null = null;
  private blocksInflight: Promise<void> | null = null;
  private lastFetchMs = 0;
  private wsStarted = false;
  private cachedFullBlocks: Block[] = [];

  init(): void {
    if (this.wsStarted) {
      return;
    }

    this.wsStarted = true;
    this.api.connectLiveUpdates().subscribe({
      next: (message) => {
        if (message.type === 'blocks' && Array.isArray(message.data) && message.data.length) {
          this.applyBlocks(message.data);
        }

        if (message.type === 'snapshot' && message.data.blocks?.length) {
          this.applyBlocks(message.data.blocks);
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
    }, ChainDataService.REFRESH_DEBOUNCE_MS);
  }

  async refreshAll(force = false, query?: ChainExplorerQuery): Promise<void> {
    await Promise.all([
      this.refreshBlocks(force, query),
      this.refreshStats(force),
      this.refreshValidity(force),
    ]);
  }

  async refreshBlocks(force = false, query?: ChainExplorerQuery): Promise<void> {
    if (this.isRateLimited()) {
      this.error.set('Trop de requêtes — pause d’1 minute.');
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastFetchMs < ChainDataService.MIN_REFRESH_GAP_MS) {
      return;
    }

    if (this.blocksInflight && !force) {
      return this.blocksInflight;
    }

    const hasServerQuery =
      !!query?.wallet?.trim() ||
      query?.fromIndex != null ||
      query?.toIndex != null;

    this.loading.set(true);
    this.blocksInflight = (async () => {
      try {
        if (hasServerQuery) {
          const response = await firstValueFrom(
            this.api.filterExplorerBlocks({
              wallet: query?.wallet?.trim() || undefined,
              from: query?.fromIndex ?? undefined,
              to: query?.toIndex ?? undefined,
              limit: 200,
            })
          );
          this.blocks.set(sortBlocksDescending(response.blocks ?? []));
          this.usingServerFilter.set(true);
        } else {
          const response = await firstValueFrom(this.api.getBlocks());
          const nextBlocks = sortBlocksDescending(Array.isArray(response) ? response : []);
          this.cachedFullBlocks = nextBlocks;
          this.blocks.set(nextBlocks);
          this.usingServerFilter.set(false);
        }

        this.error.set(null);
        this.lastFetchMs = Date.now();
      } catch (err) {
        this.handleRateLimit(err);
        if (!this.isRateLimited()) {
          this.error.set('Impossible de charger la blockchain.');
        }
      } finally {
        this.loading.set(false);
        this.blocksInflight = null;
      }
    })();

    return this.blocksInflight;
  }

  async refreshStats(force = false): Promise<void> {
    if (this.isRateLimited() && !force) {
      return;
    }

    try {
      const response = await firstValueFrom(this.api.getStats());
      this.stats.set(response);
    } catch {
      this.stats.set(null);
    }
  }

  async refreshValidity(force = false): Promise<void> {
    if (this.isRateLimited() && !force) {
      return;
    }

    try {
      const valid = await firstValueFrom(this.api.isChainValid());
      this.chainValid.set(valid);
    } catch {
      this.chainValid.set(null);
    }
  }

  isRateLimited(): boolean {
    return Date.now() < this.rateLimitedUntil();
  }

  private applyBlocks(data: Block[]): void {
    const sorted = sortBlocksDescending(data);
    this.blocks.set(sorted);
    if (!this.usingServerFilter()) {
      this.cachedFullBlocks = sorted;
    }
    this.lastFetchMs = Date.now();
  }

  private handleRateLimit(error: unknown): void {
    const status = (error as { status?: number })?.status;
    if (status === 429) {
      this.rateLimitedUntil.set(Date.now() + ChainDataService.RATE_LIMIT_BACKOFF_MS);
      this.error.set('Trop de requêtes — nouvel essai dans 1 minute.');
    }
  }
}
