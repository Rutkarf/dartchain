import { Injectable, computed, inject } from '@angular/core';

import { PeersDataService } from './peers-data.service';
import {
  buildNetworkStats,
  buildPeerRowView,
  parsePeerEndpoint,
} from '@peers/peer-panel/peer-panel.util';

export type DockPeersPhase = 'error' | 'loading' | 'empty' | 'connected' | 'partial';

@Injectable({ providedIn: 'root' })
export class DockPeersStateService {
  private readonly peersData = inject(PeersDataService);

  readonly loading = this.peersData.loading;
  readonly peers = this.peersData.peers;

  readonly error = computed(() => this.peersData.error() === 'load');

  readonly peerCount = computed(() => this.peers().length);
  readonly connectedCount = computed(
    () => this.peers().filter((peer) => peer.status === 'CONNECTED').length
  );

  readonly networkStats = computed(() =>
    buildNetworkStats(
      this.peers(),
      this.peersData.statsTotal(),
      this.peersData.measuredLatencyMs(),
      this.peersData.serverAvgLatencyMs(),
      this.peersData.serverNetworkLoadPercent()
    )
  );

  /** Premier peer CONNECTED, sinon le premier de la liste. */
  readonly primaryPeer = computed(() => {
    const list = this.peers();
    return list.find((peer) => peer.status === 'CONNECTED') ?? list[0] ?? null;
  });

  readonly primaryPeerName = computed(() => {
    const peer = this.primaryPeer();
    if (!peer) {
      return '';
    }
    return parsePeerEndpoint(peer.url).nodeName;
  });

  /** Connexions actives vers le peer affiché (1 si CONNECTED, sinon 0). */
  readonly primaryPeerConnectedPeople = computed(() => {
    const peer = this.primaryPeer();
    if (!peer) {
      return 0;
    }
    return peer.status === 'CONNECTED' ? 1 : 0;
  });

  readonly latencyLabel = computed(() => {
    const ms = this.networkStats().avgLatencyMs;
    return ms === null ? '—' : `${ms} ms`;
  });

  readonly loadLabel = computed(() => `${this.networkStats().networkLoadPercent}%`);

  readonly phase = computed((): DockPeersPhase => {
    if (this.error()) {
      return 'error';
    }
    if (this.loading() && this.peerCount() === 0) {
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

  async load(): Promise<void> {
    this.peersData.init();
    await this.peersData.refreshAll(true);
  }

  refresh(): void {
    this.peersData.scheduleRefresh(true);
  }
}
