import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  BlockchainApiService,
  BlockchainStats,
  PeerView,
} from './blockchain-api.service';
import { formatDockRelativeTime } from '../utils/dock-time.util';

export type ShowcaseTerminalMode = 'reseau' | 'peers';

export type ShowcaseTerminalPhase =
  | 'error'
  | 'loading'
  | 'empty'
  | 'ready'
  | 'sync';

@Injectable({ providedIn: 'root' })
export class ShowcaseTerminalStateService {
  private readonly api = inject(BlockchainApiService);

  readonly mode = signal<ShowcaseTerminalMode>('reseau');
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly blocks = signal<number>(0);
  readonly peers = signal<PeerView[]>([]);
  readonly stats = signal<BlockchainStats | null>(null);
  readonly lastUpdatedAt = signal<number | null>(null);

  readonly connectedCount = computed(
    () => this.peers().filter((peer) => peer.status === 'CONNECTED').length
  );

  readonly phase = computed((): ShowcaseTerminalPhase => {
    if (this.error()) {
      return 'error';
    }
    if (this.loading()) {
      return 'loading';
    }

    if (this.mode() === 'peers') {
      return this.peers().length === 0 ? 'empty' : 'ready';
    }

    return this.blocks() > 0 || this.stats() ? 'sync' : 'empty';
  });

  readonly statusLabel = computed(() => {
    switch (this.phase()) {
      case 'error':
        return 'Erreur';
      case 'loading':
        return 'Sync…';
      case 'empty':
        return this.mode() === 'peers' ? 'Aucun peer' : 'Hors ligne';
      case 'sync':
        return 'Réseau OK';
      default:
        return this.mode() === 'peers' ? 'Peers actifs' : 'Actif';
    }
  });

  readonly headline = computed(() => {
    if (this.mode() === 'peers') {
      const total = this.peers().length;
      if (total === 0) {
        return this.error() ? 'Peers indisponibles' : 'Aucun peer connecté';
      }

      const connected = this.connectedCount();
      const latest = this.peers()[0];
      const endpoint = latest?.url ?? '';
      const shortEndpoint =
        endpoint.length > 24 ? `${endpoint.slice(0, 16)}…` : endpoint;

      return shortEndpoint
        ? `${connected}/${total} connectés · ${shortEndpoint}`
        : `${connected}/${total} peers connectés`;
    }

    const chainStats = this.stats();
    const blockCount = chainStats?.totalBlocks ?? this.blocks();
    if (blockCount > 0) {
      return `${blockCount} blocs indexés · sync réseau`;
    }

    return this.error() ? 'Réseau indisponible' : 'Synchronisation en cours';
  });

  readonly progressLabel = computed(() => {
    if (this.mode() === 'peers') {
      const total = this.peers().length;
      if (total === 0) {
        return '';
      }
      return `${this.connectedCount()} actifs sur ${total}`;
    }

    const chainStats = this.stats();
    if (chainStats?.latestHash) {
      const shortHash =
        chainStats.latestHash.length > 12
          ? `${chainStats.latestHash.slice(0, 6)}…`
          : chainStats.latestHash;
      return `Tip ${shortHash}`;
    }

    return this.peers().length > 0
      ? `${this.connectedCount()}/${this.peers().length} peers`
      : '';
  });

  readonly updatedAgeLabel = computed(() =>
    formatDockRelativeTime(this.lastUpdatedAt())
  );

  setMode(mode: ShowcaseTerminalMode): void {
    this.mode.set(mode);
  }

  async load(mode?: ShowcaseTerminalMode): Promise<void> {
    if (mode) {
      this.mode.set(mode);
    }

    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    try {
      const [blocksRes, peersRes, statsRes] = await Promise.all([
        firstValueFrom(this.api.getBlocks()).catch(() => []),
        firstValueFrom(this.api.getPeers()).catch(() => []),
        firstValueFrom(this.api.getStats()).catch(() => null),
      ]);

      const blocks = Array.isArray(blocksRes) ? blocksRes : [];
      this.blocks.set(blocks.length);
      this.peers.set(Array.isArray(peersRes) ? peersRes : []);
      this.stats.set(statsRes);
      this.lastUpdatedAt.set(Date.now());
    } catch {
      this.blocks.set(0);
      this.peers.set([]);
      this.stats.set(null);
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  refresh(): void {
    void this.load();
  }
}
