import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import {
  BlockchainApiService,
  PeerStatsResponse,
  PeerView,
} from './blockchain-api.service';
import { PEER_AUTO_REFRESH_MS } from '../../features/peer-panel/peer-panel.constants';

export type PeersDataErrorCode = 'load' | 'stats' | 'rate-limit' | null;

@Injectable({ providedIn: 'root' })
export class PeersDataService {
  private static readonly REFRESH_DEBOUNCE_MS = 500;
  private static readonly RATE_LIMIT_BACKOFF_MS = 60_000;
  private static readonly MIN_REFRESH_GAP_MS = 2_000;

  private readonly api = inject(BlockchainApiService);

  readonly peers = signal<PeerView[]>([]);
  readonly statsTotal = signal<number | null>(null);
  readonly measuredLatencyMs = signal<number | null>(null);
  readonly serverAvgLatencyMs = signal<number | null>(null);
  readonly serverNetworkLoadPercent = signal<number | null>(null);
  readonly loading = signal(false);
  readonly error = signal<PeersDataErrorCode>(null);
  readonly rateLimitedUntil = signal(0);

  private refreshTimerId: number | null = null;
  private pollTimerId: number | null = null;
  private refreshInflight: Promise<void> | null = null;
  private lastFetchMs = 0;
  private started = false;
  private wsStarted = false;

  private readonly onExternalRefresh = (): void => {
    this.scheduleRefresh(true);
  };

  init(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    window.addEventListener('dartchain-refresh-dock', this.onExternalRefresh);
    this.startLiveUpdates();

    this.pollTimerId = window.setInterval(() => {
      void this.refreshAll(false);
    }, PEER_AUTO_REFRESH_MS);

    void this.refreshAll(true);
  }

  destroy(): void {
    window.removeEventListener('dartchain-refresh-dock', this.onExternalRefresh);

    if (this.pollTimerId !== null) {
      window.clearInterval(this.pollTimerId);
      this.pollTimerId = null;
    }

    if (this.refreshTimerId !== null) {
      window.clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }

  scheduleRefresh(force = false): void {
    if (this.refreshTimerId !== null) {
      window.clearTimeout(this.refreshTimerId);
    }

    this.refreshTimerId = window.setTimeout(() => {
      this.refreshTimerId = null;
      void this.refreshAll(force);
    }, PeersDataService.REFRESH_DEBOUNCE_MS);
  }

  async refreshAll(force = false): Promise<void> {
    if (this.isRateLimited()) {
      this.error.set('rate-limit');
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastFetchMs < PeersDataService.MIN_REFRESH_GAP_MS) {
      return;
    }

    if (this.refreshInflight && !force) {
      return this.refreshInflight;
    }

    this.loading.set(true);
    this.refreshInflight = (async () => {
      const errors: PeersDataErrorCode[] = [];

      try {
        await this.refreshPeers(force).catch((error) => {
          this.handleRateLimit(error);
          if (!this.isRateLimited()) {
            errors.push('load');
          }
        });

        await Promise.all([
          this.refreshStats(force).catch((error) => {
            this.handleRateLimit(error);
            if (!this.isRateLimited()) {
              errors.push('stats');
            }
          }),
          this.measureNetworkLatency(force),
        ]);

        this.lastFetchMs = Date.now();

        if (this.isRateLimited()) {
          this.error.set('rate-limit');
          return;
        }

        if (errors.length === 0) {
          this.error.set(null);
        } else if (errors.includes('load')) {
          this.error.set('load');
        } else {
          this.error.set('stats');
        }
      } finally {
        this.loading.set(false);
        this.refreshInflight = null;
      }
    })();

    return this.refreshInflight;
  }

  rateLimitCountdownLabel(): string | null {
    const until = this.rateLimitedUntil();
    if (until <= Date.now()) {
      return null;
    }

    const seconds = Math.ceil((until - Date.now()) / 1000);
    return `${seconds}s`;
  }

  applyPeersFromLiveUpdate(rawPeers: unknown): void {
    if (!Array.isArray(rawPeers)) {
      return;
    }

    const normalized = rawPeers
      .filter((peer): peer is PeerView => !!peer && typeof (peer as PeerView).url === 'string')
      .map((peer) => this.normalizePeer(peer));

    this.peers.set(this.deduplicatePeers(normalized));
    this.lastFetchMs = Date.now();
  }

  private startLiveUpdates(): void {
    if (this.wsStarted) {
      return;
    }

    this.wsStarted = true;
    this.api.connectLiveUpdates().subscribe({
      next: (message) => {
        if (message.type === 'peers' && Array.isArray(message.data)) {
          this.applyPeersFromLiveUpdate(message.data);
        }

        if (message.type === 'snapshot' && Array.isArray(message.data.peers)) {
          this.applyPeersFromLiveUpdate(message.data.peers);
        }
      },
    });
  }

  private async refreshPeers(force: boolean): Promise<void> {
    if (this.isRateLimited() && !force) {
      return;
    }

    const peers = await firstValueFrom(this.api.getPeers());
    const safePeers = Array.isArray(peers) ? peers : [];
    this.peers.set(this.deduplicatePeers(safePeers.map((peer) => this.normalizePeer(peer))));
  }

  private async refreshStats(force: boolean): Promise<void> {
    if (this.isRateLimited() && !force) {
      return;
    }

    try {
      const stats = await firstValueFrom(this.api.getPeerStats());
      this.applyStats(stats);
    } catch {
      this.statsTotal.set(null);
      this.serverAvgLatencyMs.set(null);
      this.serverNetworkLoadPercent.set(null);
      throw new Error('stats');
    }
  }

  private async measureNetworkLatency(force: boolean): Promise<void> {
    if (this.isRateLimited() && !force) {
      return;
    }

    const startedAt = performance.now();

    try {
      await firstValueFrom(this.api.getHealth());
      this.measuredLatencyMs.set(Math.round(performance.now() - startedAt));
    } catch {
      this.measuredLatencyMs.set(null);
    }
  }

  private applyStats(stats: PeerStatsResponse): void {
    this.statsTotal.set(Math.max(stats.total, stats.active));
    this.serverAvgLatencyMs.set(stats.avgLatencyMs ?? null);
    this.serverNetworkLoadPercent.set(stats.networkLoadPercent ?? null);
  }

  private normalizePeer(peer: PeerView): PeerView {
    return {
      url: peer.url.trim(),
      status: this.normalizePeerStatus(peer.status),
      message: (peer.message ?? '').toString(),
      latencyMs: peer.latencyMs,
      syncPercent: peer.syncPercent,
      activityPoints: peer.activityPoints,
      chainHeight: peer.chainHeight,
      localChainHeight: peer.localChainHeight,
      lastSyncAt: peer.lastSyncAt,
    };
  }

  private deduplicatePeers(peers: PeerView[]): PeerView[] {
    return peers.filter(
      (peer, index, array) => array.findIndex((candidate) => candidate.url === peer.url) === index
    );
  }

  private normalizePeerStatus(status: unknown): PeerView['status'] {
    switch (status) {
      case 'CONNECTING':
      case 'CONNECTED':
      case 'DISCONNECTED':
      case 'ERROR':
        return status;
      default:
        return 'DISCONNECTED';
    }
  }

  private isRateLimited(): boolean {
    return Date.now() < this.rateLimitedUntil();
  }

  private handleRateLimit(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 429) {
      this.rateLimitedUntil.set(Date.now() + PeersDataService.RATE_LIMIT_BACKOFF_MS);
      this.error.set('rate-limit');
    }
  }
}
