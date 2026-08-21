import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Block } from '../models/block.model';
import {
  BlockchainApiService,
  BlockchainStats,
} from './blockchain-api.service';
import { formatDockRelativeTime } from '../utils/dock-time.util';

export type DockChainPhase = 'error' | 'loading' | 'empty' | 'synced';

@Injectable({ providedIn: 'root' })
export class DockChainStateService {
  private static readonly MIN_REFRESH_GAP_MS = 3_000;
  private static readonly RATE_LIMIT_BACKOFF_MS = 60_000;

  private readonly api = inject(BlockchainApiService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly blocks = signal<Block[]>([]);
  readonly stats = signal<BlockchainStats | null>(null);
  readonly lastUpdatedAt = signal<number | null>(null);

  private lastFetchMs = 0;
  private rateLimitedUntil = 0;

  readonly latestBlock = computed(() => this.blocks()[0] ?? null);
  readonly blockCount = computed(() => this.blocks().length);

  readonly phase = computed((): DockChainPhase => {
    if (this.error()) {
      return 'error';
    }
    if (this.loading()) {
      return 'loading';
    }
    if (this.blockCount() === 0) {
      return 'empty';
    }
    return 'synced';
  });

  readonly statusLabel = computed(() => {
    switch (this.phase()) {
      case 'error':
        return 'Erreur';
      case 'loading':
        return 'Sync…';
      case 'empty':
        return 'Vide';
      default:
        return 'Synchronisé';
    }
  });

  readonly headline = computed(() => {
    const tip = this.latestBlock();
    if (!tip) {
      return this.error() ? 'Chaîne indisponible' : 'Aucun bloc';
    }

    const hash = (tip.hash ?? '').trim();
    return `TIP #${tip.index} · ${hash || '—'}`;
  });

  /** Ancien libellé « N blocs » — non affiché dans la barre (doublon du badge). */
  readonly progressLabel = computed(() => '');

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
    if (!force && now - this.lastFetchMs < DockChainStateService.MIN_REFRESH_GAP_MS) {
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    try {
      const [blocksRes, statsRes] = await Promise.all([
        firstValueFrom(this.api.getBlocks()),
        firstValueFrom(this.api.getStats()).catch(() => null),
      ]);

      const blocks = Array.isArray(blocksRes) ? blocksRes : [];
      this.blocks.set(
        [...blocks].sort((a, b) => (b.index ?? 0) - (a.index ?? 0))
      );
      this.stats.set(statsRes);
      this.lastUpdatedAt.set(Date.now());
      this.lastFetchMs = Date.now();
    } catch (error) {
      this.handleRateLimit(error);
      if (!this.isRateLimited()) {
        this.blocks.set([]);
        this.stats.set(null);
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
      this.rateLimitedUntil = Date.now() + DockChainStateService.RATE_LIMIT_BACKOFF_MS;
      this.error.set(true);
    }
  }
}
