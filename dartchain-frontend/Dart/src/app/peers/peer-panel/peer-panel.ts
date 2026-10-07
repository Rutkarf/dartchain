import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import {
  AddPeerResponse,
  BlockchainApiService,
  PeerStatus,
} from '@blockchain/services/blockchain-api.service';
import { AuthService } from '@auth/services/auth.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { PeersDataService } from '@peers/services/peers-data.service';
import {
  DOCK_REFRESH_EVENT,
  refreshEventMatchesTab,
} from '../../core/constants/panel-refresh.constants';
import { PeerDetailDrawerComponent } from '../peer-detail-drawer/peer-detail-drawer';
import {
  PEER_FAVORITES_STORAGE_KEY,
} from './peer-panel.constants';
import { PeerRowView } from './peer-panel.model';
import {
  buildNetworkStats,
  buildPeerRowView,
  statusToneClass,
} from './peer-panel.util';

@Component({
  selector: 'app-peer-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, PeerDetailDrawerComponent],
  templateUrl: './peer-panel.html',
  styleUrl: './peer-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeerPanelComponent implements OnDestroy {
  private readonly api = inject(BlockchainApiService);
  private readonly auth = inject(AuthService);
  private readonly peersData = inject(PeersDataService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly locale = inject(LocaleService);

  @ViewChild('peerInputRef')
  private readonly peerInputRef?: ElementRef<HTMLInputElement>;

  protected readonly peerInput = signal('ws://localhost:8080/ws/peers');
  protected readonly searchQuery = signal('');
  protected readonly favoritesOnly = signal(false);
  protected readonly favorites = signal<ReadonlySet<string>>(new Set());
  protected readonly submitting = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly actionErrorMessage = signal<string | null>(null);
  protected readonly selectedPeer = signal<PeerRowView | null>(null);
  protected readonly detailOpen = signal(false);

  protected readonly loading = this.peersData.loading;
  protected readonly peers = this.peersData.peers;

  protected readonly filteredRows = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const favoritesOnly = this.favoritesOnly();

    return this.peerRows().filter((row) => {
      if (favoritesOnly && !row.isFavorite) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        row.nodeName.toLowerCase().includes(query) ||
        row.endpoint.toLowerCase().includes(query) ||
        row.url.toLowerCase().includes(query) ||
        row.status.toLowerCase().includes(query) ||
        row.message.toLowerCase().includes(query)
      );
    });
  });

  protected readonly normalizedPeerInput = computed(() => this.peerInput().trim());
  protected readonly peerCount = computed(() => this.peers().length);
  protected readonly connectedCount = computed(
    () => this.peers().filter((peer) => peer.status === 'CONNECTED').length
  );

  protected readonly networkStats = computed(() =>
    buildNetworkStats(
      this.peers(),
      this.peersData.statsTotal(),
      this.peersData.measuredLatencyMs(),
      this.peersData.serverAvgLatencyMs(),
      this.peersData.serverNetworkLoadPercent()
    )
  );

  protected readonly peerRows = computed(() =>
    this.peers().map((peer) => buildPeerRowView(peer, this.favorites()))
  );

  protected readonly connectButtonLabel = computed(() => {
    if (this.submitting()) {
      return '…';
    }

    if (!this.auth.isAuthenticated()) {
      return this.locale.t('peers.loginRequired');
    }

    return this.locale.t('peers.connect');
  });

  protected readonly listSummary = computed(() =>
    this.locale
      .t('peers.summary')
      .replace('{connected}', String(this.connectedCount()))
      .replace('{total}', String(this.peerCount()))
  );

  protected readonly errorBanner = computed(() => {
    const actionError = this.actionErrorMessage();
    if (actionError) {
      return actionError;
    }

    const code = this.peersData.error();
    if (!code) {
      return null;
    }

    if (code === 'rate-limit') {
      const seconds = this.peersData.rateLimitCountdownLabel() ?? '60';
      return this.locale.t('peers.errorRateLimit').replace('{seconds}', seconds);
    }

    if (code === 'stats') {
      return this.locale.t('peers.errorStats');
    }

    return this.locale.t('peers.errorLoad');
  });

  constructor() {
    this.favorites.set(this.loadFavorites());
    this.peersData.init();
    this.peersData.resumePolling();
    this.destroyRef.onDestroy(() => {
      this.peersData.pausePolling();
      this.peersData.destroy();
    });
  }

  ngOnDestroy(): void {
    this.peersData.pausePolling();
    this.peersData.destroy();
  }

  @HostListener(`window:${DOCK_REFRESH_EVENT}`, ['$event'])
  onGlobalRefresh(event: Event): void {
    if (refreshEventMatchesTab(event, 'peers')) {
      this.peersData.scheduleRefresh(true);
    }
  }

  protected statusLabel(status: PeerStatus): string {
    switch (status) {
      case 'CONNECTED':
        return this.locale.t('peers.statusConnected');
      case 'CONNECTING':
        return this.locale.t('peers.statusConnecting');
      case 'DISCONNECTED':
        return this.locale.t('peers.statusDisconnected');
      case 'ERROR':
        return this.locale.t('peers.statusError');
    }
  }

  protected statusClass(status: PeerStatus): string {
    return statusToneClass(status);
  }

  protected toggleFavoritesFilter(): void {
    this.favoritesOnly.update((value) => !value);
  }

  protected focusConnectInput(): void {
    this.peerInputRef?.nativeElement.focus();
    this.peerInputRef?.nativeElement.select();
  }

  protected onConnectSubmit(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    const liveValue = this.peerInputRef?.nativeElement?.value?.trim() ?? '';
    if (liveValue) {
      this.peerInput.set(liveValue);
    }

    this.addPeer();
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  protected dismissError(): void {
    this.actionErrorMessage.set(null);
    if (this.peersData.error()) {
      void this.peersData.refreshAll(true);
    }
  }

  protected refreshAll(): void {
    void this.peersData.refreshAll(true);
  }

  protected openPeerDetail(row: PeerRowView): void {
    this.selectedPeer.set(row);
    this.detailOpen.set(true);
  }

  protected closePeerDetail(): void {
    this.detailOpen.set(false);
    this.selectedPeer.set(null);
  }

  protected onPeerInput(value: string): void {
    this.peerInput.set(value);
    this.clearActionError();
  }

  protected addPeer(): void {
    if (this.submitting()) {
      return;
    }

    if (!this.auth.promptLogin()) {
      this.actionErrorMessage.set(this.locale.t('peers.errorLoginAdd'));
      return;
    }

    const peer = this.normalizedPeerInput();

    if (!peer) {
      this.actionErrorMessage.set(this.locale.t('peers.errorInvalidUrl'));
      this.focusConnectInput();
      return;
    }

    if (!this.isValidPeerUrl(peer)) {
      this.actionErrorMessage.set(this.locale.t('peers.errorInvalidFormat'));
      this.focusConnectInput();
      return;
    }

    const existingPeer = this.peers().find((item) => item.url === peer);
    if (existingPeer) {
      void this.runReconnect(peer);
      return;
    }

    void this.runAddPeer(peer);
  }

  protected reconnectPeer(url: string, event?: Event): void {
    event?.stopPropagation();

    if (!url || this.submitting()) {
      return;
    }

    if (!this.auth.promptLogin()) {
      this.actionErrorMessage.set(this.locale.t('peers.errorLoginReconnect'));
      return;
    }

    void this.runReconnect(url);
  }

  protected disconnectPeer(url: string, event?: Event): void {
    event?.stopPropagation();

    if (!url || this.submitting()) {
      return;
    }

    if (!this.auth.promptLogin()) {
      this.actionErrorMessage.set(this.locale.t('peers.errorLoginDisconnect'));
      return;
    }

    void this.runDisconnect(url);
  }

  protected copyPeerUrl(url: string, event?: Event): void {
    event?.stopPropagation();

    if (!url) {
      return;
    }

    navigator.clipboard
      .writeText(url)
      .then(() => {
        this.successMessage.set(this.locale.t('peers.successCopied'));
      })
      .catch(() => {
        this.actionErrorMessage.set(this.locale.t('peers.errorCopy'));
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

  protected favoriteLabel(isFavorite: boolean): string {
    return isFavorite ? this.locale.t('peers.favRemove') : this.locale.t('peers.favAdd');
  }

  private async runAddPeer(peer: string): Promise<void> {
    this.submitting.set(true);
    this.clearActionError();
    this.successMessage.set(null);

    try {
      const response = await firstValueFrom(this.api.addPeer(peer));
      this.handlePeerActionSuccess(response, peer, this.locale.t('peers.successAdded'));
    } catch (error) {
      const message = this.extractErrorMessage(error, this.locale.t('peers.errorConnect'));
      if (/already exists/i.test(message)) {
        await this.runReconnect(peer);
        return;
      }
      this.actionErrorMessage.set(message);
    } finally {
      this.submitting.set(false);
    }
  }

  private async runReconnect(url: string): Promise<void> {
    this.submitting.set(true);
    this.clearActionError();
    this.successMessage.set(null);

    try {
      const response = await firstValueFrom(this.api.reconnectPeer(url));
      this.handlePeerActionSuccess(response, url, this.locale.t('peers.successReconnected'));
    } catch (error) {
      this.actionErrorMessage.set(
        this.extractErrorMessage(error, this.locale.t('peers.errorReconnect'))
      );
    } finally {
      this.submitting.set(false);
    }
  }

  private async runDisconnect(url: string): Promise<void> {
    this.submitting.set(true);
    this.clearActionError();
    this.successMessage.set(null);

    try {
      const response = await firstValueFrom(this.api.disconnectPeer(url));
      this.handlePeerActionSuccess(
        response,
        url,
        this.locale.t('peers.successDisconnected')
      );
      if (this.selectedPeer()?.url === url) {
        this.closePeerDetail();
      }
    } catch (error) {
      this.actionErrorMessage.set(
        this.extractErrorMessage(error, this.locale.t('peers.errorDisconnect'))
      );
    } finally {
      this.submitting.set(false);
    }
  }

  private handlePeerActionSuccess(
    response: AddPeerResponse,
    peer: string,
    prefix: string
  ): void {
    const normalizedStatus = this.normalizePeerStatus(response.status);
    const statusLabel = normalizedStatus ? ` (${this.statusLabel(normalizedStatus)})` : '';

    this.successMessage.set(`${prefix} : ${peer}${statusLabel}`);
    this.peerInput.set(peer);
    void this.peersData.refreshAll(true);

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

  private clearActionError(): void {
    this.actionErrorMessage.set(null);
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
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

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
