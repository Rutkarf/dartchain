import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Block } from '../models/block.model';
import { BlockchainApiService } from './blockchain-api.service';
import { formatDockRelativeTime, shortDockHash } from '../utils/dock-time.util';

export type DockBlockPhase = 'error' | 'loading' | 'ready';

@Injectable({ providedIn: 'root' })
export class DockBlockStateService {
  private readonly api = inject(BlockchainApiService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly latestBlock = signal<Block | null>(null);
  readonly lastUpdatedAt = signal<number | null>(null);

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
      const response = await firstValueFrom(this.api.getBlocks());
      const blocks = Array.isArray(response) ? response : [];
      const sorted = [...blocks].sort((a, b) => (b.index ?? 0) - (a.index ?? 0));
      this.latestBlock.set(sorted[0] ?? null);
      this.lastUpdatedAt.set(Date.now());
    } catch {
      this.latestBlock.set(null);
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  refresh(): void {
    void this.load();
  }
}
