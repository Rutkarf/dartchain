import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { BlockchainApiService, PeerView } from './blockchain-api.service';
import { formatDockRelativeTime } from '../utils/dock-time.util';

export type DockPeersPhase = 'error' | 'loading' | 'empty' | 'connected' | 'partial';

@Injectable({ providedIn: 'root' })
export class DockPeersStateService {
  private readonly api = inject(BlockchainApiService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly peers = signal<PeerView[]>([]);
  readonly lastUpdatedAt = signal<number | null>(null);

  readonly peerCount = computed(() => this.peers().length);
  readonly connectedCount = computed(
    () => this.peers().filter((peer) => peer.status === 'CONNECTED').length
  );

  readonly phase = computed((): DockPeersPhase => {
    if (this.error()) {
      return 'error';
    }
    if (this.loading()) {
      return 'loading';
    }
    if (this.peerCount() === 0) {
      return 'empty';
    }
    if (this.connectedCount() === this.peerCount()) {
      return 'connected';
    }
    return 'partial';
  });

  readonly statusLabel = computed(() => {
    switch (this.phase()) {
      case 'error':
        return 'Erreur';
      case 'loading':
        return 'Sync…';
      case 'empty':
        return 'Aucun peer';
      case 'connected':
        return 'Réseau OK';
      default:
        return 'Partiel';
    }
  });

  readonly headline = computed(() => {
    const connected = this.connectedCount();
    const total = this.peerCount();
    if (total === 0) {
      return this.error() ? 'Peers indisponibles' : 'Ajouter un peer';
    }

    const latest = this.peers()[0];
    const endpoint = latest?.url ?? '';
    const shortEndpoint =
      endpoint.length > 28 ? `${endpoint.slice(0, 18)}…` : endpoint;

    return shortEndpoint
      ? `${connected}/${total} · ${shortEndpoint}`
      : `${connected}/${total} connectés`;
  });

  readonly progressLabel = computed(() => {
    const total = this.peerCount();
    if (total === 0) {
      return '';
    }
    return `${this.connectedCount()} actifs sur ${total}`;
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
      const response = await firstValueFrom(this.api.getPeers());
      this.peers.set(Array.isArray(response) ? response : []);
      this.lastUpdatedAt.set(Date.now());
    } catch {
      this.peers.set([]);
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  refresh(): void {
    void this.load();
  }
}
