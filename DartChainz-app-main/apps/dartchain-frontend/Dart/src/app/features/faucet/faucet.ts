import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FaucetService,
  FaucetClaimResponse,
} from '../../core/services/faucet.service';
import { QuestsProgressService } from '../../core/services/quests-progress.service';
import { AuthService } from '../../core/services/auth.service';
import { WalletSessionService } from '../../core/services/wallet-session.service';
import { BlockchainApiService } from '../../core/services/blockchain-api.service';

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

  private readonly clientId = 'angular-faucet-ui';
  private static readonly TICK_MS = 100;
  private static readonly DECIMALS = 26;
  private static readonly VISUAL_INCREMENT = 1n;

  readonly rpcName = 'DART TESTNET';
  readonly blockHeight = signal(0);
  readonly peers = signal(0);
  readonly claimAmount = signal('—');

  protected readonly walletAddress = computed(() => this.walletSession.address());
  protected readonly isReady = computed(
    () => this.auth.isAuthenticated() && !!this.walletAddress()
  );

  private wholePart = 0n;
  private decimalPart = 0n;
  private tickTimerId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private cooldownUntilEpochMs = 0;
  private cooldownTotalSeconds = 0;

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
  bump = false;

  history: Array<{
    action: string;
    date: string;
    time: string;
    amount: string;
    status: string;
  }> = [];

  ngOnInit(): void {
    this.resetDisplayToZero();
    this.loadNetworkMeta();
    this.loadState();
    this.startTicker();
  }

  ngAfterViewInit(): void {
    this.fitNumberToSingleLine();
    this.resizeObserver = new ResizeObserver(() => this.fitNumberToSingleLine());
    this.resizeObserver.observe(this.valueWrapRef.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.tickTimerId !== null) {
      window.clearInterval(this.tickTimerId);
      this.tickTimerId = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  claim(): void {
    if (this.loading || !this.eligible || !this.isReady()) {
      if (!this.auth.isAuthenticated()) {
        this.errorMessage = 'Connectez-vous pour utiliser le faucet.';
        this.auth.openDrawer('login');
      } else if (!this.walletAddress()) {
        this.errorMessage = 'Créez et liez un wallet depuis l’onglet Wallet.';
      }
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
          this.successMessage = response.message;
          this.txHash = response.txHash;
          this.claimAmount.set(response.amount);
          this.eligible = false;
          this.cooldownTotalSeconds = Math.max(response.cooldownSeconds, 1);
          this.cooldownUntilEpochMs = Date.now() + response.cooldownSeconds * 1000;
          this.syncCooldownFromTimestamp();
          this.setDisplayFromAmount(response.amount);
          this.triggerBump();
          this.prependHistoryEntry(response.claimedAt, response.amount);
          this.questProgress.recordFaucetClaim();
          this.walletSession.requestBalanceRefresh();
          this.loadNetworkMeta();
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message || 'Impossible de faire le claim faucet.';
        },
      });
  }

  private loadState(): void {
    const address = this.walletAddress();
    if (!address) {
      this.eligible = false;
      return;
    }

    this.errorMessage = '';

    this.faucetService
      .getState(address)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (state) => {
          this.claimAmount.set(state.lastClaimAmount ?? this.claimAmount());
          const apiCooldown = Math.max(0, state.cooldownSeconds || 0);
          if (apiCooldown > 0) {
            this.cooldownTotalSeconds = apiCooldown;
            this.cooldownUntilEpochMs = Date.now() + apiCooldown * 1000;
          }
          this.syncCooldownFromTimestamp();
          if (state.lastClaimAmount) {
            this.setDisplayFromAmount(state.lastClaimAmount);
          }
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message || 'Impossible de charger le faucet.';
        },
      });
  }

  private loadNetworkMeta(): void {
    this.blockchain
      .getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => this.blockHeight.set(stats.totalBlocks ?? 0),
      });

    this.blockchain
      .getPeerStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => this.peers.set(stats.active ?? stats.total ?? 0),
      });
  }

  private startTicker(): void {
    if (this.tickTimerId !== null) {
      window.clearInterval(this.tickTimerId);
    }
    this.tickTimerId = window.setInterval(() => {
      this.incrementDisplayValue();
      this.syncCooldownFromTimestamp();
      this.fitNumberToSingleLine();
    }, FaucetComponent.TICK_MS);
  }

  get claimButtonLabel(): string {
    if (!this.auth.isAuthenticated()) {
      return 'CONNEXION REQUISE';
    }
    if (!this.walletAddress()) {
      return 'WALLET REQUIS';
    }
    if (this.loading) {
      return 'CLAIMING...';
    }
    if (!this.eligible && this.cooldownSeconds > 0) {
      return this.cooldownLabel;
    }
    return 'CLAIM R4V3';
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

  get displayValue(): string {
    return `${this.wholePart.toString()},${this.decimalDigits}`;
  }

  get displayLine(): string {
    return `${this.displayValue} R4V3`;
  }

  private get decimalDigits(): string {
    return this.decimalPart.toString().padStart(FaucetComponent.DECIMALS, '0');
  }

  private incrementDisplayValue(): void {
    const max = 10n ** BigInt(FaucetComponent.DECIMALS);
    this.decimalPart += FaucetComponent.VISUAL_INCREMENT;
    if (this.decimalPart >= max) {
      this.decimalPart = 0n;
      this.wholePart += 1n;
    }
    this.triggerBump();
  }

  private setDisplayFromAmount(amount: string): void {
    const normalized = amount.trim().replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(normalized)) {
      return;
    }

    const [wholeRaw, decimalRaw = ''] = normalized.split('.');
    const paddedDecimal = `${decimalRaw}${'0'.repeat(FaucetComponent.DECIMALS)}`.slice(
      0,
      FaucetComponent.DECIMALS
    );
    this.wholePart = BigInt(wholeRaw || '0');
    this.decimalPart = BigInt(paddedDecimal || '0');
    this.fitNumberToSingleLine();
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
      this.eligible = this.isReady();
      return;
    }

    const deltaMs = this.cooldownUntilEpochMs - Date.now();
    const nextSeconds = Math.max(0, Math.ceil(deltaMs / 1000));
    this.cooldownSeconds = nextSeconds;
    this.eligible = nextSeconds === 0 && this.isReady();
    if (this.eligible) {
      this.cooldownUntilEpochMs = 0;
    }
  }

  private fitNumberToSingleLine(): void {
    if (!this.valueTextRef || !this.valueWrapRef) {
      return;
    }
    const el = this.valueTextRef.nativeElement;
    const parent = this.valueWrapRef.nativeElement;
    const available = parent.clientWidth - 1;
    if (available <= 0) {
      return;
    }

    let size = 14;
    const minSize = 5;
    el.style.fontSize = `${size}px`;
    while (el.scrollWidth > available && size > minSize) {
      size -= 0.25;
      el.style.fontSize = `${size}px`;
    }
  }

  private prependHistoryEntry(claimedAt: string, amount: string): void {
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
      ? `+ ${normalizedAmount.toFixed(4)} R4V3`
      : `+ ${amount} R4V3`;

    this.history = [
      { action: 'CLAIM', date: dateLabel, time: timeLabel, amount: amountLabel, status: 'SUCCESS' },
      ...this.history.slice(0, 9),
    ];
  }

  private resetDisplayToZero(): void {
    this.wholePart = 0n;
    this.decimalPart = 0n;
  }
}
