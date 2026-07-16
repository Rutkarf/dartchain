import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import {
  FaucetService,
  FaucetClaimResponse,
  FaucetConfigResponse,
} from '../../core/services/faucet.service';
import { QuestsProgressService } from '../../core/services/quests-progress.service';
import { AuthService } from '../../core/services/auth.service';
import { WalletSessionService } from '../../core/services/wallet-session.service';
import { BlockchainApiService } from '../../core/services/blockchain-api.service';
import { ChainConfigService } from '../../core/services/chain-config.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { LocaleKey } from '../../core/i18n/locale.messages';
import { ProductConfigService } from '../../core/config/product-config.service';
import {
  formatDisplayAmount,
  isWalletValidForFaucet,
  maxClaimSmallestUnits,
  parseAmountToSmallestUnits,
  smallestUnitsToAmount,
} from './faucet.util';

@Component({
  selector: 'app-faucet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faucet.html',
  styleUrls: ['./faucet.css'],
})
export class FaucetComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly faucetService = inject(FaucetService);
  private readonly questProgress = inject(QuestsProgressService);
  private readonly auth = inject(AuthService);
  private readonly walletSession = inject(WalletSessionService);
  private readonly blockchain = inject(BlockchainApiService);
  private readonly chainConfig = inject(ChainConfigService);
  private readonly product = inject(ProductConfigService);
  protected readonly locale = inject(LocaleService);

  private readonly clientId = 'angular-faucet-ui';
  private static readonly COOLDOWN_TICK_MS = 100;
  private static readonly VISUAL_TICK_MS = 1000;
  private static readonly DECIMALS = 26;
  /** +1 m4t3r (plus petite unité) par seconde. */
  private static readonly VISUAL_INCREMENT = 1n;
  private static readonly HISTORY_PAGE_SIZE = 5;
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
  readonly historyExpanded = signal(false);
  readonly valueFitScale = signal(1);
  readonly toastMessage = signal('');
  readonly toastKind = signal<'success' | 'info' | 'error'>('success');
  readonly offlineMode = signal(false);
  readonly faucetDisabled = signal(false);
  readonly historyVisibleCount = signal(FaucetComponent.HISTORY_PAGE_SIZE);
  readonly atMaxClaim = signal(false);

  protected readonly walletAddress = computed(() => this.walletSession.address());
  protected readonly walletValid = computed(() => {
    const address = this.walletAddress();
    if (!address) {
      return false;
    }
    return isWalletValidForFaucet(address, this.faucetConfig()?.walletPrefix ?? 'R4V3');
  });
  protected readonly isReady = computed(
    () => this.auth.isAuthenticated() && !!this.walletAddress()
  );
  protected readonly networkLabel = computed(() => {
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
  protected readonly peersLabel = computed(() => {
    const value = this.peers();
    if (value == null) {
      return '—';
    }
    return String(value);
  });
  protected readonly peersDetailLabel = computed(() => {
    const connected = this.peersConnected();
    const total = this.peersTotal();
    if (connected == null || total == null) {
      return '';
    }
    if (total <= connected) {
      return this.t('faucet.peersConnectedOnly', { count: String(connected) });
    }
    return this.t('faucet.peersConnectedTotal', {
      connected: String(connected),
      total: String(total),
    });
  });
  protected readonly blockHeightLabel = computed(() => {
    const value = this.blockHeight();
    return value == null ? '—' : `# ${value.toLocaleString()}`;
  });
  protected readonly nextEligibleLabel = computed(() => {
    const iso = this.nextEligibleAtIso();
    if (!iso) {
      return this.t('faucet.nextEligibleAtEmpty');
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return this.t('faucet.nextEligibleAtEmpty');
    }
    return this.t('faucet.nextEligibleAt', {
      datetime: date.toLocaleString(this.locale.locale()),
    });
  });
  protected readonly configuredClaimAmount = computed(() => {
    const configAmount = this.faucetConfig()?.defaultClaimAmount;
    if (configAmount) {
      return configAmount;
    }
    const cached = this.claimAmount();
    return cached !== '—' ? cached : null;
  });
  protected readonly shortWalletAddress = computed(() => {
    const address = this.walletAddress();
    if (!address) {
      return '';
    }
    return address.length > 16
      ? `${address.slice(0, 8)}…${address.slice(-6)}`
      : address;
  });
  protected readonly nativeTokenLabel = computed(
    () => this.faucetConfig()?.nativeToken?.trim() || 'R4V3'
  );
  protected readonly hasMoreHistory = computed(
    () => this.history.length > this.historyVisibleCount()
  );

  private wholePart = 0n;
  private decimalPart = 0n;
  private tickTimerId: number | null = null;
  private visualTimerId: number | null = null;
  private metaRefreshTimerId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private cooldownUntilEpochMs = 0;
  private cooldownTotalSeconds = 0;
  private visualBaseAmount: string | null = null;
  private maxClaimUnits = maxClaimSmallestUnits('1');
  private retryAttempt = 0;
  private retryTimerId: number | null = null;
  private toastTimerId: number | null = null;

  @ViewChild('valueText', { static: true })
  valueTextRef!: ElementRef<HTMLElement>;
  @ViewChild('valueWrap', { static: true })
  valueWrapRef!: ElementRef<HTMLElement>;

  eligible = false;
  cooldownSeconds = 0;
  loading = false;
  errorMessage = '';
  successMessage = '';
  txHash = '';

  history: Array<{
    action: string;
    date: string;
    time: string;
    amount: string;
    status: string;
    txHash?: string;
  }> = [];

  bump = false;

  constructor() {
    effect(() => {
      this.auth.isAuthenticated();
      this.walletSession.address();
      untracked(() => {
        this.loadState();
        this.loadNetworkMeta();
        this.loadClaimsHistory();
      });
    });
  }

  ngOnInit(): void {
    if (!this.product.faucetEnabled) {
      this.faucetDisabled.set(true);
    }

    void this.chainConfig.load().catch(() => undefined);
    this.loadConfig();
    this.resetDisplayToZero();
    this.loadNetworkMeta();
    this.loadState();
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
  }

  ngAfterViewInit(): void {
    this.fitValueToContainer();
    this.resizeObserver = new ResizeObserver(() => this.fitValueToContainer());
    this.resizeObserver.observe(this.valueWrapRef.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.tickTimerId !== null) {
      window.clearInterval(this.tickTimerId);
      this.tickTimerId = null;
    }
    if (this.visualTimerId !== null) {
      window.clearInterval(this.visualTimerId);
      this.visualTimerId = null;
    }
    if (this.metaRefreshTimerId !== null) {
      window.clearInterval(this.metaRefreshTimerId);
      this.metaRefreshTimerId = null;
    }
    this.blockchain.disconnectLiveUpdates();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.retryTimerId !== null) {
      window.clearTimeout(this.retryTimerId);
      this.retryTimerId = null;
    }
    if (this.toastTimerId !== null) {
      window.clearTimeout(this.toastTimerId);
      this.toastTimerId = null;
    }
  }

  protected refreshPanel(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.loadConfig();
    this.loadState();
    this.loadNetworkMeta();
    this.loadClaimsHistory();
    this.refreshWalletBalance();
  }

  protected openTxInExplorer(txHash?: string): void {
    const hash = (txHash ?? this.txHash).trim();
    if (!hash) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent('explorer-search-query', {
        detail: { query: hash },
      })
    );
  }

  protected openBlockInExplorer(): void {
    const height = this.blockHeight();
    if (height == null || height <= 0) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent('explorer-search-query', {
        detail: { query: String(height) },
      })
    );
  }

  protected retryConnection(): void {
    this.retryAttempt = 0;
    this.offlineMode.set(false);
    this.refreshPanel();
  }

  protected loadMoreHistory(): void {
    this.historyVisibleCount.update(
      (count) => count + FaucetComponent.HISTORY_PAGE_SIZE
    );
  }

  protected exportHistoryJson(): void {
    if (this.history.length === 0) {
      return;
    }

    const payload = this.history.map((row) => ({
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

  protected t(key: LocaleKey, params?: Record<string, string>): string {
    let message = this.locale.t(key);
    if (!params) {
      return message;
    }

    for (const [name, value] of Object.entries(params)) {
      message = message.replace(`{${name}}`, value);
    }

    return message;
  }

  protected toggleHistoryExpanded(): void {
    this.historyExpanded.update((value) => !value);
  }

  protected visibleHistory(): typeof this.history {
    const limit = this.historyExpanded()
      ? this.historyVisibleCount()
      : Math.min(FaucetComponent.HISTORY_PAGE_SIZE, this.historyVisibleCount());
    return this.history.slice(0, limit);
  }

  protected claimDisabled(): boolean {
    if (this.faucetDisabled()) {
      return true;
    }
    if (this.loading) {
      return true;
    }
    if (!this.isReady()) {
      return false;
    }
    if (!this.walletValid()) {
      return true;
    }
    return !this.eligible;
  }

  claim(): void {
    if (this.loading) {
      return;
    }

    if (!this.isReady()) {
      if (!this.auth.isAuthenticated()) {
        this.errorMessage = this.t('faucet.error.loginRequired');
        this.auth.openDrawer('login');
      } else if (!this.walletAddress()) {
        this.errorMessage = this.t('faucet.error.walletRequired');
      }
      return;
    }

    if (!this.walletValid()) {
      this.errorMessage = this.t('faucet.error.walletInvalid');
      this.showToast(this.t('faucet.error.walletInvalid'), 'error');
      return;
    }

    if (this.faucetDisabled()) {
      this.errorMessage = this.t('faucet.error.featureDisabled');
      return;
    }

    if (!this.eligible) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.txHash = '';

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
        finalize(() => {
          this.loading = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response: FaucetClaimResponse) => {
          this.markOnline();
          this.successMessage = this.t('faucet.claimSuccess');
          this.txHash = response.txHash;
          this.claimAmount.set(response.amount);
          this.nextEligibleAtIso.set(response.nextEligibleAt);
          this.eligible = false;
          this.cooldownTotalSeconds = Math.max(
            response.cooldownSeconds,
            this.faucetConfig()?.cooldownSeconds ?? 1
          );
          this.cooldownUntilEpochMs = Date.now() + response.cooldownSeconds * 1000;
          this.syncCooldownFromTimestamp();
          this.rebaseVisualCounter(response.amount);
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

  protected copyTxHash(): void {
    if (!this.txHash) {
      return;
    }

    void navigator.clipboard?.writeText(this.txHash).then(
      () => {
        this.successMessage = this.t('faucet.txCopied');
      },
      () => {
        this.errorMessage = this.t('faucet.txCopyFailed');
      }
    );
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
          this.seedVisualCounter(config.defaultClaimAmount);
        },
        error: (error: HttpErrorResponse) => {
          if (this.handleFeatureDisabled(error)) {
            return;
          }
          this.markOffline(() => this.loadConfig());
          this.errorMessage = this.t('faucet.error.loadConfigFailed');
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
            this.successMessage = `${this.t('faucet.claimSuccess')} ${this.t(
              'faucet.claimSuccessBalance',
              { balance }
            )}`;
          }
        },
        error: () => {
          if (updateSuccessMessage) {
            this.successMessage = this.t('faucet.claimSuccess');
          }
        },
      });
  }

  private loadState(): void {
    const address = this.walletAddress();
    if (!address) {
      this.eligible = false;
      this.cooldownSeconds = 0;
      this.cooldownUntilEpochMs = 0;
      return;
    }

    this.errorMessage = '';

    this.faucetService
      .getState(address)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (state) => {
          this.markOnline();
          this.seedVisualCounter(state.defaultClaimAmount);
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
            this.cooldownSeconds = 0;
            this.nextEligibleAtIso.set(null);
          }
          this.syncCooldownFromTimestamp();
          this.eligible = state.eligible && this.cooldownSeconds === 0 && this.isReady();
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
          this.errorMessage =
            error?.error?.message || this.t('faucet.error.loadFailed');
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
    }, FaucetComponent.META_REFRESH_MS);
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
    }, FaucetComponent.COOLDOWN_TICK_MS);

    this.visualTimerId = window.setInterval(() => {
      this.incrementDisplayValue();
      this.fitValueToContainer();
    }, FaucetComponent.VISUAL_TICK_MS);
  }

  get claimButtonLabel(): string {
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
    if (this.loading) {
      return this.locale.t('faucet.claiming');
    }
    if (!this.eligible && this.cooldownSeconds > 0) {
      return this.cooldownLabel;
    }
    return this.locale.t('faucet.claim');
  }

  get cooldownProgress(): number {
    if (this.eligible || this.cooldownSeconds <= 0 || this.cooldownTotalSeconds <= 0) {
      return 0;
    }
    return this.cooldownSeconds / this.cooldownTotalSeconds;
  }

  get cooldownLabel(): string {
    const total = Math.max(0, this.cooldownSeconds);
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
  }

  get wholePartDisplay(): string {
    return this.wholePart.toString();
  }

  get displayLine(): string {
    return `${this.wholePartDisplay} ${this.nativeTokenLabel()}, ${this.decimalDigits} m4t3r`;
  }

  private formatAmountForDisplay(amount: string): string {
    const normalized = amount.trim().replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(normalized)) {
      return amount;
    }

    const [wholeRaw, decimalRaw = ''] = normalized.split('.');
    const paddedDecimal = `${decimalRaw}${'0'.repeat(FaucetComponent.DECIMALS)}`.slice(
      0,
      FaucetComponent.DECIMALS
    );
    return `${wholeRaw},${paddedDecimal}`;
  }

  private resolveClaimAmount(): string {
    const units = this.currentSmallestUnits();
    const capped = units > this.maxClaimUnits ? this.maxClaimUnits : units;
    return smallestUnitsToAmount(capped);
  }

  private currentDisplayAmount(): string {
    return this.resolveClaimAmount();
  }

  private currentSmallestUnits(): bigint {
    const scale = 10n ** BigInt(FaucetComponent.DECIMALS);
    return this.wholePart * scale + this.decimalPart;
  }

  private setFromSmallestUnits(units: bigint): void {
    const formatted = formatDisplayAmount(units);
    this.wholePart = formatted.whole;
    this.decimalPart = formatted.decimal;
    this.atMaxClaim.set(units >= this.maxClaimUnits);
  }

  protected get decimalDigits(): string {
    return this.decimalPart.toString().padStart(FaucetComponent.DECIMALS, '0');
  }

  private incrementDisplayValue(): void {
    const current = this.currentSmallestUnits();
    if (current >= this.maxClaimUnits) {
      this.setFromSmallestUnits(this.maxClaimUnits);
      return;
    }

    const next = current + FaucetComponent.VISUAL_INCREMENT;
    this.setFromSmallestUnits(next > this.maxClaimUnits ? this.maxClaimUnits : next);
    this.triggerBump();
  }

  /** Re-seed après claim sans bloquer la montée visuelle. */
  private rebaseVisualCounter(amount: string): void {
    const normalized = amount.trim().replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(normalized)) {
      return;
    }

    this.visualBaseAmount = normalized;
    this.setDisplayFromAmount(normalized);
  }

  private seedVisualCounter(amount: string | null | undefined): void {
    if (!amount?.trim()) {
      return;
    }

    const normalized = amount.trim().replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(normalized)) {
      return;
    }

    if (this.visualBaseAmount === normalized) {
      return;
    }

    this.visualBaseAmount = normalized;
    this.setDisplayFromAmount(normalized);
  }

  private setDisplayFromAmount(amount: string): void {
    const units = parseAmountToSmallestUnits(amount);
    if (units == null) {
      return;
    }

    const capped = units > this.maxClaimUnits ? this.maxClaimUnits : units;
    this.setFromSmallestUnits(capped);
    this.fitValueToContainer();
  }

  private triggerBump(): void {
    this.bump = false;
    requestAnimationFrame(() => {
      this.bump = true;
      setTimeout(() => {
        this.bump = false;
      }, 220);
    });
  }

  private syncCooldownFromTimestamp(): void {
    if (this.cooldownUntilEpochMs <= 0) {
      this.cooldownSeconds = 0;
      return;
    }

    const deltaMs = this.cooldownUntilEpochMs - Date.now();
    const nextSeconds = Math.max(0, Math.ceil(deltaMs / 1000));
    const wasCooling = this.cooldownSeconds > 0;
    this.cooldownSeconds = nextSeconds;

    if (nextSeconds === 0) {
      this.cooldownUntilEpochMs = 0;
      if (wasCooling && this.isReady()) {
        this.loadStateQuietEligible();
      }
    } else {
      this.eligible = false;
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
          this.eligible = state.eligible && this.isReady();
        },
      });
  }

  private fitValueToContainer(): void {
    if (!this.valueTextRef || !this.valueWrapRef) {
      return;
    }

    const el = this.valueTextRef.nativeElement;
    const wrap = this.valueWrapRef.nativeElement;
    const fit = el.parentElement as HTMLElement | null;
    if (!fit) {
      return;
    }

    fit.style.transform = 'scale(1)';
    this.valueFitScale.set(1);

    const available = wrap.clientWidth;
    const needed = Math.max(fit.scrollWidth, el.scrollWidth);
    if (available <= 0 || needed <= 0) {
      return;
    }

    if (needed > available) {
      const scale = Math.max(0.28, available / needed);
      this.valueFitScale.set(scale);
    }
  }

  private loadClaimsHistory(): void {
    if (!this.auth.isAuthenticated()) {
      this.history = [];
      return;
    }

    const wallet = this.walletAddress();

    this.faucetService
      .getClaims(this.auth.authHeaders(), wallet ?? undefined, 0, 200)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (claims) => {
          this.markOnline();
          this.history = (Array.isArray(claims) ? claims : []).map((claim) =>
            this.toHistoryRow(claim)
          );
          this.historyVisibleCount.set(
            Math.max(FaucetComponent.HISTORY_PAGE_SIZE, this.historyVisibleCount())
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
  }): {
    action: string;
    date: string;
    time: string;
    amount: string;
    status: string;
    txHash?: string;
  } {
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
      ? `+ ${amountValue.toFixed(FaucetComponent.DECIMALS)} m4t3r`
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
      ? `+ ${normalizedAmount.toFixed(FaucetComponent.DECIMALS)} m4t3r`
      : `+ ${amount} m4t3r`;

    this.history = [
      {
        action: 'CLAIM',
        date: dateLabel,
        time: timeLabel,
        amount: amountLabel,
        status: 'SUCCESS',
        txHash,
      },
      ...this.history.slice(0, 9),
    ];
  }

  private resetDisplayToZero(): void {
    this.visualBaseAmount = null;
    this.wholePart = 0n;
    this.decimalPart = 0n;
    this.atMaxClaim.set(false);
    const configured = this.faucetConfig()?.defaultClaimAmount;
    if (configured) {
      this.seedVisualCounter(configured);
    }
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
      this.errorMessage = this.t('faucet.error.rateLimited');
      this.showToast(this.t('faucet.error.rateLimited'), 'error');
      return;
    }

    this.errorMessage = error?.error?.message || this.t(fallbackKey);
    if (error.status === 0) {
      this.markOffline();
    }
  }

  private handleFeatureDisabled(error: HttpErrorResponse): boolean {
    if (error.status === 403) {
      this.faucetDisabled.set(true);
      this.errorMessage = this.t('faucet.error.featureDisabled');
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
      FaucetComponent.RETRY_MAX_MS,
      FaucetComponent.RETRY_BASE_MS * 2 ** this.retryAttempt
    );
    this.retryAttempt += 1;
    this.retryTimerId = window.setTimeout(() => {
      retryAction();
    }, delay);
  }
}
