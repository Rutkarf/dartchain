import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  AddPeerResponse,
  BlockchainApiService,
  PeerStatus,
  PeerView,
} from '../../core/services/blockchain-api.service';
import { PEER_FAVORITES_STORAGE_KEY, PEER_FILTER_OPTIONS } from './peer-panel.constants';
import { PeerFilter, PeerRowView } from './peer-panel.model';
import {
  activityPolyline,
  buildNetworkStats,
  buildPeerRowView,
  statusDisplayLabel,
  statusToneClass,
} from './peer-panel.util';

@Component({
  selector: 'app-peer-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './peer-panel.html',
  styleUrl: './peer-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeerPanelComponent implements OnInit {
  private readonly api = inject(BlockchainApiService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('peerInputRef')
  private readonly peerInputRef?: ElementRef<HTMLInputElement>;

  protected readonly filterOptions = PEER_FILTER_OPTIONS;

  protected readonly peers = signal<PeerView[]>([]);
  protected readonly peerInput = signal('ws://localhost:8080/ws/peers');
  protected readonly searchQuery = signal('');
  protected readonly activeFilter = signal<PeerFilter>('all');
  protected readonly favorites = signal<ReadonlySet<string>>(new Set());
  protected readonly statsTotal = signal<number | null>(null);
  protected readonly measuredLatencyMs = signal<number | null>(null);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly showConnectForm = signal(false);

  protected readonly normalizedPeerInput = computed(() => this.peerInput().trim());
  protected readonly peerCount = computed(() => this.peers().length);
  protected readonly connectedCount = computed(
    () => this.peers().filter((peer) => peer.status === 'CONNECTED').length
  );

  protected readonly networkStats = computed(() =>
    buildNetworkStats(this.peers(), this.statsTotal(), this.measuredLatencyMs())
  );

  protected readonly peerRows = computed(() =>
    this.peers().map((peer) => buildPeerRowView(peer, this.favorites()))
  );

  protected readonly filteredRows = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.activeFilter();

    return this.peerRows().filter((row) => {
      if (filter === 'connected' && row.status !== 'CONNECTED') {
        return false;
      }

      if (filter === 'favorites' && !row.isFavorite) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        row.nodeName.toLowerCase().includes(query) ||
        row.endpoint.toLowerCase().includes(query) ||
        row.url.toLowerCase().includes(query) ||
        row.status.toLowerCase().includes(query)
      );
    });
  });

  protected readonly canSubmit = computed(
    () =>
      this.normalizedPeerInput().length > 0 && !this.submitting() && !this.loading()
  );

  public ngOnInit(): void {
    this.favorites.set(this.loadFavorites());
    this.loadPeers();
    this.loadPeerStats();
    this.measureNetworkLatency();
  }

  @HostListener('window:naivechain-refresh')
  onGlobalRefresh(): void {
    this.loadPeers();
    this.loadPeerStats();
    this.measureNetworkLatency();
  }

  protected activityPath(row: PeerRowView): string {
    return activityPolyline(row.activityPoints);
  }

  protected statusLabel(status: PeerStatus): string {
    return statusDisplayLabel(status);
  }

  protected statusClass(status: PeerStatus): string {
    return statusToneClass(status);
  }

  protected setFilter(filter: PeerFilter): void {
    this.activeFilter.set(filter);
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  protected toggleConnectForm(): void {
    this.showConnectForm.update((visible) => !visible);
  }

  protected refreshAll(): void {
    this.loadPeers();
    this.loadPeerStats();
    this.measureNetworkLatency();
  }

  protected loadPeers(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.clearMessages();

    this.api
      .getPeers()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (peers) => {
          const safePeers = Array.isArray(peers) ? peers : [];

          const normalizedPeers = safePeers
            .filter((peer): peer is PeerView => !!peer && typeof peer.url === 'string')
            .map((peer) => ({
              url: peer.url.trim(),
              status: this.normalizePeerStatus(peer.status),
              message: (peer.message ?? '').toString(),
            }));

          const uniquePeers = normalizedPeers.filter(
            (peer, index, array) =>
              array.findIndex((candidate) => candidate.url === peer.url) === index
          );

          this.peers.set(uniquePeers);
        },
        error: (error) => {
          this.errorMessage.set(
            this.extractErrorMessage(error, 'Impossible de charger les peers.')
          );
        },
      });
  }

  protected onPeerInput(value: string): void {
    this.peerInput.set(value);
    this.clearMessages();
  }

  protected addPeer(): void {
    if (this.submitting()) {
      return;
    }

    const peer = this.normalizedPeerInput();

    if (!peer) {
      this.errorMessage.set(
        'Entre une adresse peer valide, par exemple ws://localhost:8080/ws/peers.'
      );
      return;
    }

    if (!this.isValidPeerUrl(peer)) {
      this.errorMessage.set('Le format est invalide. Utilise une URL ws:// ou wss://.');
      return;
    }

    const existingPeer = this.peers().find((item) => item.url === peer);
    if (existingPeer) {
      this.reconnectPeer(peer);
      return;
    }

    this.submitting.set(true);
    this.clearMessages();

    this.api
      .addPeer(peer)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response: AddPeerResponse) => {
          this.handlePeerActionSuccess(response, peer, 'Peer ajouté');
        },
        error: (error) => {
          this.errorMessage.set(
            this.extractErrorMessage(error, 'Impossible de connecter ce peer.')
          );
        },
      });
  }

  protected reconnectPeer(url: string): void {
    if (!url || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.clearMessages();

    this.api
      .reconnectPeer(url)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response: AddPeerResponse) => {
          this.handlePeerActionSuccess(response, url, 'Peer reconnecté');
        },
        error: (error) => {
          this.errorMessage.set(
            this.extractErrorMessage(error, 'Impossible de reconnecter ce peer.')
          );
        },
      });
  }

  protected copyPeerUrl(url: string): void {
    if (!url) {
      return;
    }

    navigator.clipboard
      .writeText(url)
      .then(() => {
        this.successMessage.set('URL peer copiée.');
      })
      .catch(() => {
        this.errorMessage.set('Copie URL impossible.');
      });
  }

  protected toggleFavorite(url: string, event: Event): void {
    event.stopPropagation();

    this.favorites.update((current) => {
      const next = new Set(current);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      this.persistFavorites(next);
      return next;
    });
  }

  protected trackPeer(_index: number, row: PeerRowView): string {
    return row.url;
  }

  private loadPeerStats(): void {
    this.api
      .getPeerStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          this.statsTotal.set(Math.max(stats.total, stats.active));
        },
        error: () => {
          this.statsTotal.set(null);
        },
      });
  }

  private measureNetworkLatency(): void {
    const startedAt = performance.now();

    this.api
      .getHealth()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.measuredLatencyMs.set(Math.round(performance.now() - startedAt));
        },
        error: () => {
          this.measuredLatencyMs.set(null);
        },
      });
  }

  private handlePeerActionSuccess(
    response: AddPeerResponse,
    peer: string,
    prefix: string
  ): void {
    const normalizedStatus = this.normalizePeerStatus(response.status);
    const statusLabel = normalizedStatus ? ` (${normalizedStatus})` : '';

    this.successMessage.set(`${prefix} : ${peer}${statusLabel}`);
    this.peerInput.set('ws://localhost:8080/ws/peers');
    this.showConnectForm.set(false);
    this.loadPeers();
    this.loadPeerStats();

    queueMicrotask(() => {
      this.peerInputRef?.nativeElement.focus();
    });
  }

  private loadFavorites(): ReadonlySet<string> {
    if (typeof localStorage === 'undefined') {
      return new Set();
    }

    try {
      const raw = localStorage.getItem(PEER_FAVORITES_STORAGE_KEY);
      if (!raw) {
        return new Set();
      }

      const parsed = JSON.parse(raw) as string[];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }

  private persistFavorites(favorites: ReadonlySet<string>): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(PEER_FAVORITES_STORAGE_KEY, JSON.stringify([...favorites]));
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  private isValidPeerUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return (url.protocol === 'ws:' || url.protocol === 'wss:') && !!url.host;
    } catch {
      return false;
    }
  }

  private normalizePeerStatus(status: unknown): PeerStatus {
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

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const payload = (error as { error?: unknown }).error;

      if (typeof payload === 'object' && payload !== null) {
        const structuredPayload = payload as { message?: string; error?: string };

        if (structuredPayload.message) {
          return structuredPayload.message;
        }

        if (structuredPayload.error) {
          return structuredPayload.error;
        }
      }

      if (typeof payload === 'string' && payload.trim()) {
        return payload;
      }
    }

    return fallback;
  }
}
