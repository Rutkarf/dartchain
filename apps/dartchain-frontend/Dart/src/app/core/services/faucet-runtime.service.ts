import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, map, of } from 'rxjs';

import {
  formatDisplayAmount,
  isWalletValidForFaucet,
  maxClaimSmallestUnits,
  parseAmountToSmallestUnits,
  smallestUnitsToAmount,
} from '../../features/faucet/faucet.util';
import { LocaleKey } from '../i18n/locale.messages';
import { LocaleService } from '../i18n/locale.service';
import { ProductConfigService } from '../config/product-config.service';
import { AuthService } from './auth.service';
import { BlockchainApiService } from './blockchain-api.service';
import { ChainConfigService } from './chain-config.service';
import {
  FaucetClaimResponse,
  FaucetConfigResponse,
  FaucetService,
} from './faucet.service';
import { QuestsProgressService } from './quests-progress.service';
import { WalletSessionService } from './wallet-session.service';
import { formatR4v3Amount } from '../utils/r4v3-amount.util';

export interface FaucetHistoryRow {
  action: string;
  date: string;
  time: string;
  amount: string;
  status: string;
  txHash?: string;
}

export type FaucetLedTone = 'ready' | 'cooldown' | 'offline' | 'disabled';

@Injectable({ providedIn: 'root' })
export class FaucetRuntimeService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly faucetService = inject(FaucetService);
  private readonly questProgress = inject(QuestsProgressService);
  private readonly auth = inject(AuthService);
  private readonly walletSession = inject(WalletSessionService);
  private readonly blockchain = inject(BlockchainApiService);
  private readonly chainConfig = inject(ChainConfigService);
  private readonly product = inject(ProductConfigService);
  private readonly locale = inject(LocaleService);

  private readonly clientId = 'angular-faucet-ui';
  private static readonly COOLDOWN_TICK_MS = 100;
  private static readonly VISUAL_TICK_MS = 1000;
  private static readonly DECIMALS = 26;
  private static readonly VISUAL_INCREMENT = 1n;
  private static readonly META_REFRESH_MS = 15_000;
  private static readonly RETRY_BASE_MS = 2_000;
  private static readonly RETRY_MAX_MS = 30_000;

  readonly blockHeight = signal<number | null>(null);
  readonly peers = signal<number | null>(null);
  readonly peersConnected = signal<number | null>(null);
  readonly peersTotal = signal<number | null>(null);
  readonly networkOnline = signal(false);
  readonly faucetConfig = signal<FaucetConfigResponse | null>(null);
  readonly nextEligibleAtIso = signal<string | null>(null);
  readonly walletBalance = signal<string | null>(null);
  readonly claimAmount = signal('—');
  readonly toastMessage = signal('');
  readonly toastKind = signal<'success' | 'info' | 'error'>('success');
  readonly offlineMode = signal(false);
  readonly faucetDisabled = signal(false);
  readonly atMaxClaim = signal(false);
  readonly bump = signal(false);
  readonly history = signal<FaucetHistoryRow[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly txHash = signal('');
  readonly eligible = signal(false);
  readonly cooldownSeconds = signal(0);
  readonly wholePart = signal(0n);
  readonly decimalPart = signal(0n);

  readonly walletAddress = computed(() => this.walletSession.address());
  readonly walletValid = computed(() => {
    const address = this.walletAddress();
    if (!address) {
      return false;
    }
    return isWalletValidForFaucet(address, this.faucetConfig()?.walletPrefix ?? 'R4V3');
  });
  readonly isReady = computed(
    () => this.auth.isAuthenticated() && !!this.walletAddress()
  );
  readonly networkLabel = computed(() => {
    const config = this.chainConfig.config();
    const name = config?.networkName?.trim();
    if (name && name !== 'DartChain Native') {
      return name;
    }
    if (name === 'DartChain Native') {
      return 'R4V3 Testnet';
    }
    return this.networkOnline() ? 'R4V3 Testnet' : this.locale.t('faucet.networkUnknown');
  });
  readonly peersLabel = computed(() => {
    const value = this.peers();
    return value == null ? '—' : String(value);
  });
  readonly blockHeightLabel = computed(() => {
    const value = this.blockHeight();
    return value == null ? '—' : `#${value.toLocaleString()}`;
  });
  readonly nativeTokenLabel = computed(
    () => this.faucetConfig()?.nativeToken?.trim() || 'R4V3'
  );
  readonly wholePartDisplay = computed(() => this.wholePart().toString());
  readonly decimalDigits = computed(() =>
    this.decimalPart().toString().padStart(FaucetRuntimeService.DECIMALS, '0')
  );
  readonly displayLine = computed(
    () => `${this.nativeTokenLabel()} ${this.wholePartDisplay()},${this.decimalDigits()} m4t3r`
  );
  readonly ledTone = computed((): FaucetLedTone => {
    if (this.faucetDisabled()) {
      return 'disabled';
    }
    if (this.offlineMode() || !this.networkOnline()) {
      return 'offline';
    }
    if (this.isReady() && this.eligible()) {
      return 'ready';
    }
    return 'cooldown';
  });
  readonly shortWalletAddress = computed(() => {
    const address = this.walletAddress();
    if (!address) {
      return '';
    }
    return address.length > 16
      ? `${address.slice(0, 8)}…${address.slice(-6)}`
      : address;
  });
  readonly cooldownProgress = computed(() => {
    if (this.eligible() || this.cooldownSeconds() <= 0 || this.cooldownTotalSeconds <= 0) {
      return 0;
    }
    return this.cooldownSeconds() / this.cooldownTotalSeconds;
  });
  readonly cooldownLabel = computed(() => {
    const total = Math.max(0, this.cooldownSeconds());
    const h = Math.floor(total / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((total % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const s = Math.floor(total % 60)
      .toString()
      .padStart(2, '0');
    return `${h}:${m}:${s}`;
  });
  readonly claimButtonLabel = computed(() => {
    if (!this.auth.isAuthenticated()) {
      return this.locale.t('faucet.loginRequired');
    }
    if (!this.walletAddress()) {
      return this.locale.t('faucet.walletRequired');
    }
    if (this.faucetDisabled()) {
      return this.locale.t('faucet.disabled');
    }
    if (!this.walletValid()) {
      return this.locale.t('faucet.error.walletInvalid');
    }
    if (this.loading()) {
      return this.locale.t('faucet.claiming');
    }
    if (!this.eligible() && this.cooldownSeconds() > 0) {
      return this.cooldownLabel();
    }
    return this.locale.t('faucet.claim');
  });
  readonly claimDisabled = computed(() => {
    if (this.faucetDisabled()) {
      return true;
    }
    if (this.loading()) {
      return true;
    }
    if (!this.isReady()) {
      return false;
    }
    if (!this.walletValid()) {
      return true;
    }
    return !this.eligible();
  });
  readonly claimSuccessActive = computed(() => {
    const hash = this.txHash().trim();
    if (!hash) {
      return false;
    }

    return !this.eligible();
  });
  readonly formattedWalletBalanceLine = computed(() => {
    const balance = this.walletBalance();
    if (!balance) {
      return '';
    }

    return `${this.nativeTokenLabel()} ${formatR4v3Amount(balance)} m4t3r`;
  });

  private started = false;
  private tickTimerId: number | null = null;
  private visualTimerId: number | null = null;
  private metaRefreshTimerId: number | null = null;
  private cooldownUntilEpochMs = 0;
  private cooldownTotalSeconds = 0;
  private maxClaimUnits = maxClaimSmallestUnits('1');
  private retryAttempt = 0;
  private retryTimerId: number | null = null;
  private toastTimerId: number | null = null;

  constructor() {
    effect(() => {
      this.auth.isAuthenticated();
      this.walletSession.address();
      if (!this.started) {
        return;
      }
      untracked(() => {
        this.loadState();
        this.loadNetworkMeta();
        this.loadClaimsHistory();
      });
    });
  }

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    // Feature vedette : le faucet reste toujours actif (dev / staging / prod).
    this.faucetDisabled.set(false);

    void this.chainConfig.load().catch(() => undefined);
    this.loadConfig();
    this.resetDisplayToZero();
    this.loadNetworkMeta();
    this.loadState();
    this.loadClaimsHistory();
    this.startTicker();
    this.startMetaRefresh();

    this.blockchain
      .connectLiveUpdates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        if (message.type === 'stats') {
          this.blockHeight.set(message.data.totalBlocks ?? 0);
          this.networkOnline.set(true);
        }
      });

    this.destroyRef.onDestroy(() => {
      if (this.tickTimerId !== null) {
        window.clearInterval(this.tickTimerId);
      }
      if (this.visualTimerId !== null) {
        window.clearInterval(this.visualTimerId);
      }
      if (this.metaRefreshTimerId !== null) {
        window.clearInterval(this.metaRefreshTimerId);
      }
      if (this.retryTimerId !== null) {
        window.clearTimeout(this.retryTimerId);
      }
      if (this.toastTimerId !== null) {
        window.clearTimeout(this.toastTimerId);
      }
    });
  }

  refreshPanel(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.loadConfig();
    this.loadState();
    this.loadNetworkMeta();
    this.loadClaimsHistory();
    this.refreshWalletBalance();
  }

  retryConnection(): void {
    this.retryAttempt = 0;
    this.offlineMode.set(false);
    this.refreshPanel();
  }

  claim(): void {
    if (this.loading()) {
      return;
    }

    if (!this.isReady()) {
      if (!this.auth.isAuthenticated()) {
        this.errorMessage.set(this.t('faucet.error.loginRequired'));
        this.auth.openDrawer('login');
      } else if (!this.walletAddress()) {
        this.errorMessage.set(this.t('faucet.error.walletRequired'));
      }
      return;
    }

    if (!this.walletValid()) {
      this.errorMessage.set(this.t('faucet.error.walletInvalid'));
      this.showToast(this.t('faucet.error.walletInvalid'), 'error');
      return;
    }

    if (this.faucetDisabled()) {
      this.errorMessage.set(this.t('faucet.error.featureDisabled'));
      return;
    }

    if (!this.eligible()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.txHash.set('');

    this.faucetService
      .claim(
        {
          walletAddress: this.walletAddress(),
          amount: this.resolveClaimAmount(),
          clientId: this.clientId,
        },
        this.auth.authHeaders()
      )
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response: FaucetClaimResponse) => {
          this.markOnline();
          this.successMessage.set(this.t('faucet.claimSuccess'));
          this.txHash.set(response.txHash);
          this.claimAmount.set(response.amount);
          this.nextEligibleAtIso.set(response.nextEligibleAt);
          this.eligible.set(false);
          this.cooldownTotalSeconds = Math.max(
            response.cooldownSeconds,
            this.faucetConfig()?.cooldownSeconds ?? 1
          );
          this.cooldownUntilEpochMs = Date.now() + response.cooldownSeconds * 1000;
          this.syncCooldownFromTimestamp();
          this.restartVisualCounterAfterClaim();
          this.triggerBump();
          this.prependHistoryEntry(response.claimedAt, response.amount, response.txHash);
          void this.questProgress.recordFaucetClaim();
          this.walletSession.requestBalanceRefresh();
          this.refreshWalletBalance(true);
          this.loadNetworkMeta();
          this.loadClaimsHistory();
          this.showToast(this.t('faucet.claimSuccess'), 'success');
        },
        error: (error: HttpErrorResponse) => {
          this.handleApiError(error, 'faucet.error.claimFailed');
        },
      });
  }

  copyTxHash(): void {
    const hash = this.txHash().trim();
    if (!hash) {
      return;
    }

    void navigator.clipboard?.writeText(hash).then(
      () => this.successMessage.set(this.t('faucet.txCopied')),
      () => this.errorMessage.set(this.t('faucet.txCopyFailed'))
    );
  }

  exportHistoryJson(): void {
    const rows = this.history();
    if (rows.length === 0) {
      return;
    }

    const payload = rows.map((row) => ({
      action: row.action,
      date: row.date,
      time: row.time,
      amount: row.amount,
      status: row.status,
      txHash: row.txHash ?? null,
    }));

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `faucet-claims-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.showToast(this.t('faucet.exportHistory'), 'info');
  }

  t(key: LocaleKey, params?: Record<string, string>): string {
    let message = this.locale.t(key);
    if (!params) {
      return message;
    }

    for (const [name, value] of Object.entries(params)) {
      message = message.replace(`{${name}}`, value);
    }

    return message;
  }

  private loadConfig(): void {
    this.faucetService
      .getConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.markOnline();
          this.faucetConfig.set(config);
          this.maxClaimUnits = maxClaimSmallestUnits(config.maxClaimAmount ?? '1');
        },
        error: (error: HttpErrorResponse) => {
          if (this.handleFeatureDisabled(error)) {
            return;
          }
          this.markOffline(() => this.loadConfig());
          this.errorMessage.set(this.t('faucet.error.loadConfigFailed'));
        },
      });
  }

  private refreshWalletBalance(updateSuccessMessage = false): void {
    const address = this.walletAddress();
    if (!address) {
      this.walletBalance.set(null);
      return;
    }

    this.blockchain
      .getBalance(address)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const balance = `${response.balance ?? 0}`;
          this.walletBalance.set(balance);
          if (updateSuccessMessage) {
            this.successMessage.set(this.t('faucet.claimSuccess'));
          }
        },
        error: () => {
          if (updateSuccessMessage && this.claimSuccessActive()) {
            this.successMessage.set(this.t('faucet.claimSuccess'));
          }
        },
      });
  }

  private loadState(): void {
    const address = this.walletAddress();
    if (!address) {
      this.eligible.set(false);
      this.cooldownSeconds.set(0);
      this.cooldownUntilEpochMs = 0;
      return;
    }

    this.errorMessage.set('');

    this.faucetService
      .getState(address)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (state) => {
          this.markOnline();
          this.nextEligibleAtIso.set(state.nextEligibleAt);
          const apiCooldown = Math.max(0, state.cooldownSeconds || 0);
          if (apiCooldown > 0) {
            this.cooldownTotalSeconds = Math.max(
              apiCooldown,
              state.configCooldownSeconds || apiCooldown
            );
            this.cooldownUntilEpochMs = Date.now() + apiCooldown * 1000;
          } else {
            this.cooldownUntilEpochMs = 0;
            this.cooldownSeconds.set(0);
            this.nextEligibleAtIso.set(null);
          }
          this.syncCooldownFromTimestamp();
          this.eligible.set(
            state.eligible && this.cooldownSeconds() === 0 && this.isReady()
          );
          if (state.lastClaimAmount) {
            this.claimAmount.set(state.lastClaimAmount);
          }
          this.refreshWalletBalance();
        },
        error: (error: HttpErrorResponse) => {
          if (this.handleFeatureDisabled(error)) {
            return;
          }
          this.markOffline(() => this.loadState());
          this.errorMessage.set(error?.error?.message || this.t('faucet.error.loadFailed'));
        },
      });
  }

  private loadNetworkMeta(): void {
    this.blockchain
      .getStats()
      .pipe(
        catchError(() => this.blockchain.getLegacyStats()),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (stats) => {
          if (stats) {
            this.blockHeight.set(stats.totalBlocks ?? 0);
            this.networkOnline.set(true);
            this.markOnline();
          } else if (this.blockHeight() == null) {
            this.blockHeight.set(0);
            this.networkOnline.set(false);
            this.markOffline(() => this.loadNetworkMeta());
          }
        },
      });

    this.blockchain
      .getPeerStats()
      .pipe(
        catchError(() =>
          this.blockchain.getPeers().pipe(
            catchError(() => of([])),
            map((peerList) => {
              const connected = peerList.filter((peer) => peer.status === 'CONNECTED').length;
              return {
                active: connected,
                total: peerList.length,
              };
            })
          )
        ),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (stats) => {
          if (stats) {
            const connected = stats.active ?? 0;
            const total = stats.total ?? connected;
            const displayPeers =
              connected > 0 ? connected : total > 0 ? total : this.networkOnline() ? 1 : 0;
            this.peersConnected.set(connected);
            this.peersTotal.set(total);
            this.peers.set(displayPeers);
            this.networkOnline.set(true);
          } else if (this.peers() == null) {
            this.peersConnected.set(0);
            this.peersTotal.set(0);
            this.peers.set(this.networkOnline() ? 1 : 0);
          }
        },
      });
  }

  private startMetaRefresh(): void {
    if (this.metaRefreshTimerId !== null) {
      window.clearInterval(this.metaRefreshTimerId);
    }

    this.metaRefreshTimerId = window.setInterval(() => {
      this.loadNetworkMeta();
    }, FaucetRuntimeService.META_REFRESH_MS);
  }

  private startTicker(): void {
    if (this.tickTimerId !== null) {
      window.clearInterval(this.tickTimerId);
    }
    if (this.visualTimerId !== null) {
      window.clearInterval(this.visualTimerId);
    }

    this.tickTimerId = window.setInterval(() => {
      this.syncCooldownFromTimestamp();
    }, FaucetRuntimeService.COOLDOWN_TICK_MS);

    this.visualTimerId = window.setInterval(() => {
      this.incrementDisplayValue();
    }, FaucetRuntimeService.VISUAL_TICK_MS);
  }

  private resolveClaimAmount(): string {
    const units = this.currentSmallestUnits();
    const capped = units > this.maxClaimUnits ? this.maxClaimUnits : units;
    return smallestUnitsToAmount(capped);
  }

  private currentSmallestUnits(): bigint {
    const scale = 10n ** BigInt(FaucetRuntimeService.DECIMALS);
    return this.wholePart() * scale + this.decimalPart();
  }

  private setFromSmallestUnits(units: bigint): void {
    const formatted = formatDisplayAmount(units);
    this.wholePart.set(formatted.whole);
    this.decimalPart.set(formatted.decimal);
    this.atMaxClaim.set(units >= this.maxClaimUnits);
  }

  private incrementDisplayValue(): void {
    const current = this.currentSmallestUnits();
    if (current >= this.maxClaimUnits) {
      this.setFromSmallestUnits(this.maxClaimUnits);
      return;
    }

    const next = current + FaucetRuntimeService.VISUAL_INCREMENT;
    this.setFromSmallestUnits(next > this.maxClaimUnits ? this.maxClaimUnits : next);
    this.triggerBump();
  }

  private restartVisualCounterAfterClaim(): void {
    this.wholePart.set(0n);
    this.decimalPart.set(0n);
    this.atMaxClaim.set(false);
  }

  private triggerBump(): void {
    this.bump.set(false);
    requestAnimationFrame(() => {
      this.bump.set(true);
      window.setTimeout(() => this.bump.set(false), 220);
    });
  }

  private syncCooldownFromTimestamp(): void {
    if (this.cooldownUntilEpochMs <= 0) {
      this.cooldownSeconds.set(0);
      return;
    }

    const deltaMs = this.cooldownUntilEpochMs - Date.now();
    const nextSeconds = Math.max(0, Math.ceil(deltaMs / 1000));
    const wasCooling = this.cooldownSeconds() > 0;
    this.cooldownSeconds.set(nextSeconds);

    if (nextSeconds === 0) {
      this.cooldownUntilEpochMs = 0;
      if (wasCooling && this.isReady()) {
        this.loadStateQuietEligible();
      }
    } else {
      this.eligible.set(false);
    }
  }

  private loadStateQuietEligible(): void {
    const address = this.walletAddress();
    if (!address) {
      return;
    }

    this.faucetService
      .getState(address)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (state) => {
          this.eligible.set(state.eligible && this.isReady());
        },
      });
  }

  private loadClaimsHistory(): void {
    if (!this.auth.isAuthenticated()) {
      this.history.set([]);
      return;
    }

    const wallet = this.walletAddress();

    this.faucetService
      .getClaims(this.auth.authHeaders(), wallet ?? undefined, 0, 200)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (claims) => {
          this.markOnline();
          this.history.set(
            (Array.isArray(claims) ? claims : []).map((claim) => this.toHistoryRow(claim))
          );
        },
        error: (error: HttpErrorResponse) => {
          if (!this.handleFeatureDisabled(error)) {
            this.markOffline(() => this.loadClaimsHistory());
          }
        },
      });
  }

  private toHistoryRow(claim: {
    amount: string | number;
    claimedAt: number;
    txHash?: string | null;
  }): FaucetHistoryRow {
    const claimedAtMs =
      claim.claimedAt > 1_000_000_000_000 ? claim.claimedAt : claim.claimedAt * 1000;
    const date = new Date(claimedAtMs);
    const dateLabel = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;
    const timeLabel = `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;

    const amountValue =
      typeof claim.amount === 'number' ? claim.amount : Number.parseFloat(`${claim.amount}`);
    const amountLabel = Number.isFinite(amountValue)
      ? `+ ${amountValue.toFixed(FaucetRuntimeService.DECIMALS)} m4t3r`
      : `+ ${claim.amount} m4t3r`;

    return {
      action: 'CLAIM',
      date: dateLabel,
      time: timeLabel,
      amount: amountLabel,
      status: claim.txHash ? 'SUCCESS' : 'PENDING',
      txHash: claim.txHash ?? undefined,
    };
  }

  private prependHistoryEntry(claimedAt: string, amount: string, txHash?: string): void {
    const date = new Date(claimedAt);
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const dateLabel = `${safeDate.getDate().toString().padStart(2, '0')}/${(safeDate.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${safeDate.getFullYear().toString().slice(-2)}`;
    const timeLabel = `${safeDate.getHours().toString().padStart(2, '0')}:${safeDate
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${safeDate.getSeconds().toString().padStart(2, '0')}`;

    const normalizedAmount = Number.parseFloat(amount);
    const amountLabel = Number.isFinite(normalizedAmount)
      ? `+ ${normalizedAmount.toFixed(FaucetRuntimeService.DECIMALS)} m4t3r`
      : `+ ${amount} m4t3r`;

    this.history.update((rows) => [
      {
        action: 'CLAIM',
        date: dateLabel,
        time: timeLabel,
        amount: amountLabel,
        status: 'SUCCESS',
        txHash,
      },
      ...rows,
    ]);
  }

  private resetDisplayToZero(): void {
    this.wholePart.set(0n);
    this.decimalPart.set(0n);
    this.atMaxClaim.set(false);
  }

  private showToast(message: string, kind: 'success' | 'info' | 'error'): void {
    this.toastMessage.set(message);
    this.toastKind.set(kind);
    if (this.toastTimerId !== null) {
      window.clearTimeout(this.toastTimerId);
    }
    this.toastTimerId = window.setTimeout(() => this.toastMessage.set(''), 2400);
  }

  private handleApiError(error: HttpErrorResponse, fallbackKey: LocaleKey): void {
    if (this.handleFeatureDisabled(error)) {
      return;
    }

    if (error.status === 429) {
      this.errorMessage.set(this.t('faucet.error.rateLimited'));
      this.showToast(this.t('faucet.error.rateLimited'), 'error');
      return;
    }

    this.errorMessage.set(error?.error?.message || this.t(fallbackKey));
    if (error.status === 0) {
      this.markOffline();
    }
  }

  private handleFeatureDisabled(error: HttpErrorResponse): boolean {
    // Ne jamais désactiver le faucet côté UI : un 403 vient plutôt d’un auth/ACL
    // ponctuel, pas d’un flag produit. On remonte une erreur actionnable.
    if (error.status === 403) {
      this.faucetDisabled.set(false);
      const message =
        typeof error.error?.message === 'string' && error.error.message.trim()
          ? error.error.message
          : this.t('faucet.error.loginRequired');
      this.errorMessage.set(message);
      this.showToast(message, 'error');
      return true;
    }
    return false;
  }

  private markOnline(): void {
    this.offlineMode.set(false);
    this.retryAttempt = 0;
    if (this.retryTimerId !== null) {
      window.clearTimeout(this.retryTimerId);
      this.retryTimerId = null;
    }
  }

  private markOffline(retryAction?: () => void): void {
    if (this.faucetDisabled()) {
      return;
    }

    this.offlineMode.set(true);
    if (!retryAction) {
      return;
    }

    if (this.retryTimerId !== null) {
      window.clearTimeout(this.retryTimerId);
    }

    const delay = Math.min(
      FaucetRuntimeService.RETRY_MAX_MS,
      FaucetRuntimeService.RETRY_BASE_MS * 2 ** this.retryAttempt
    );
    this.retryAttempt += 1;
    this.retryTimerId = window.setTimeout(() => {
      retryAction();
    }, delay);
  }
}
