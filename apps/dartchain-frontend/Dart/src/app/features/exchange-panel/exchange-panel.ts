import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  EXCHANGE_LAUNCHPAD_FALLBACK_TOKENS,
  EXCHANGE_LAUNCHPAD_SWAP_TOKENS,
  EXCHANGE_AMOUNT_VALUE_PLACEHOLDER,
  EXCHANGE_NATIVE_TOKEN,
  buildLaunchpadGridSlots,
  defaultLaunchCounterToken,
  filterLaunchpadTokenList,
  isExchangeNativeToken,
  isLaunchpadSwapToken,
  tokenUnitLabel,
} from '../../core/constants/exchange-launchpad.constants';
import { coinIdForSymbol } from '../../core/constants/rate-panel-symbols';
import { BlockchainApiService } from '../../core/services/blockchain-api.service';
import { BrandCryptoSelectionService } from '../../core/services/brand-crypto-selection.service';
import { CryptoRatesService } from '../../core/services/crypto-rate.service';
import { ShowcaseLaunchStateService } from '../../core/services/showcase-launch-state.service';
import { ShowcaseNavigationService } from '../../core/services/showcase-navigation.service';
import { QuestsProgressService } from '../../core/services/quests-progress.service';
import { WalletSessionService } from '../../core/services/wallet-session.service';
import { AuthService } from '../../core/services/auth.service';
import { R4v3ThreeComponent } from '../r4v3-three/r4v3-three';

type SwapAction =
  | 'create-wallet'
  | 'login-required'
  | 'enter-amount'
  | 'insufficient'
  | 'swapping'
  | 'swap';

type AmountInputState = 'neutral' | 'valid' | 'insufficient';

const LAUNCH_TOKEN_DISPLAY: Record<string, string> = {
  R4V3: 'R4V3',
  PXD: 'Pixel DAO',
  LAB3: 'Lab #03',
  NVFI: 'NovaFi',
  ORB: 'Orbit Swap',
  CPET: 'Chain Pets',
  MRAIL: 'Meta Rail',
};

@Component({
  selector: 'app-exchange-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, R4v3ThreeComponent],
  templateUrl: './exchange-panel.html',
  styleUrls: ['./exchange-panel.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.exchange-panel--collapsed]': 'exchangeCollapsed()',
  },
})
export class ExchangePanelComponent implements AfterViewInit {
  private readonly api = inject(BlockchainApiService);
  private readonly auth = inject(AuthService);
  private readonly walletSession = inject(WalletSessionService);
  private readonly brandCrypto = inject(BrandCryptoSelectionService);
  private readonly cryptoRates = inject(CryptoRatesService);
  private readonly launchState = inject(ShowcaseLaunchStateService);
  private readonly nav = inject(ShowcaseNavigationService);
  private readonly questProgress = inject(QuestsProgressService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly fb = inject(FormBuilder);

  readonly exchangeCollapsed = input(false, { transform: booleanAttribute });

  readonly launchpadTokens = signal<string[]>([...EXCHANGE_LAUNCHPAD_FALLBACK_TOKENS]);

  protected readonly fromToken = signal<string>(EXCHANGE_NATIVE_TOKEN);
  protected readonly toToken = signal<string>(defaultLaunchCounterToken());
  protected readonly fromBalance = signal(0);
  protected readonly toBalance = signal(0);
  protected readonly rate = signal(1);
  protected readonly testnet = signal(true);
  protected readonly loadingPanel = signal(false);
  protected readonly swapping = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly showStatus = signal(false);
  protected readonly showSuccessToast = signal(false);

  protected readonly amountValue = signal('');
  protected readonly change24hLabel = signal('—');
  protected readonly change24hPositive = signal(true);
  protected readonly unitUsdPriceFetched = signal<number | null>(null);
  protected readonly unitUsdPriceFetchedIsFrom = signal(true);
  protected readonly quoteDetailsExpanded = signal(false);
  protected readonly pairFlipping = signal(false);
  protected readonly estimatePulse = signal(false);
  protected readonly brokenTokenLogos = signal<ReadonlySet<string>>(new Set());
  protected readonly tokenGridOpen = signal(false);
  protected readonly tokenMenuOpen = signal(false);
  protected readonly funnelIntroPulse = signal(false);
  protected readonly validFlash = signal(false);
  protected readonly socialProofIndex = signal(0);

  private estimatePulseTimer: ReturnType<typeof setTimeout> | null = null;
  private pairFlipTimer: ReturnType<typeof setTimeout> | null = null;
  private validFlashTimer: ReturnType<typeof setTimeout> | null = null;
  private funnelIntroTimer: ReturnType<typeof setTimeout> | null = null;
  private socialProofTimer: ReturnType<typeof setInterval> | null = null;
  private funnelIntroPlayed = false;
  private lastAmountInputState: AmountInputState = 'neutral';

  protected readonly launchpadSwapTokens = signal<string[]>([
    ...EXCHANGE_LAUNCHPAD_SWAP_TOKENS,
  ]);

  protected readonly launchGridSlots = computed(() =>
    buildLaunchpadGridSlots(this.launchpadSwapTokens())
  );

  protected readonly nativeTokenLabel = EXCHANGE_NATIVE_TOKEN;

  protected readonly nativeFrom = computed(() => isExchangeNativeToken(this.fromToken()));

  protected readonly counterLaunchToken = computed(() => this.toToken());

  protected amountInputId(): string {
    return this.exchangeCollapsed() ? 'exchange-collapsed-amount-input' : 'exchange-amount-input';
  }

  protected swapCtaVisibleLabel(): string {
    if (this.exchangeCollapsed()) {
      return this.swapButtonLabelCompact();
    }

    switch (this.swapAction()) {
      case 'create-wallet':
        return 'Créer wallet';
      case 'login-required':
        return 'Se connecter';
      case 'enter-amount':
        return 'Convertir';
      case 'insufficient':
        return this.fromBalance() <= 0 ? 'Obtenir R4V3' : 'Insuffisant';
      case 'swapping':
        return 'Conv…';
      default:
        return 'Convertir';
    }
  }

  protected isLaunchChipActive(symbol: string): boolean {
    return this.toToken() === symbol;
  }

  protected readonly unitUsdPriceTo = computed(() => {
    const usdFetched = this.unitUsdPriceFetched();
    if (usdFetched == null) {
      return null;
    }

    const fetchedIsFrom = this.unitUsdPriceFetchedIsFrom();
    if (!fetchedIsFrom) {
      return usdFetched;
    }

    const r = this.rate();
    if (!Number.isFinite(r) || r <= 0) {
      return null;
    }

    return usdFetched / r;
  });

  protected readonly amountForm = this.fb.nonNullable.group({
    amount: ['', [Validators.required]],
  });

  protected readonly walletAddress = computed(() => this.walletSession.address());
  protected readonly hasWallet = computed(() => !!this.walletAddress());

  protected readonly parsedAmount = computed(() => {
    const raw = this.amountValue().trim().replace(',', '.');
    if (!raw) {
      return 0;
    }

    const value = Number.parseFloat(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  });

  protected readonly estimatedTo = computed(() => {
    const amount = this.parsedAmount();
    if (amount <= 0) {
      return 0;
    }

    return amount * this.rate();
  });

  protected readonly formattedEstimatedTo = computed(() =>
    this.formatBalance(this.estimatedTo())
  );

  protected readonly estimateFiatLine = computed(() => {
    if (this.parsedAmount() <= 0) {
      return null;
    }

    const unitUsd = this.unitUsdPriceTo();
    if (unitUsd == null) {
      return null;
    }

    const total = this.estimatedTo() * unitUsd;
    if (!Number.isFinite(total) || total <= 0) {
      return null;
    }

    return `${this.formatUsd(total, 2)} CHF`;
  });

  protected readonly showInlineEstimate = computed(
    () => this.parsedAmount() > 0 && !this.exchangeCollapsed()
  );

  protected readonly showQuickAmounts = computed(
    () =>
      !this.exchangeCollapsed() &&
      this.auth.isAuthenticated() &&
      this.hasWallet() &&
      this.fromBalance() > 0
  );

  protected readonly showFooter = computed(() => !this.exchangeCollapsed());

  protected readonly conversionProgress = computed(() => {
    if (!this.auth.isAuthenticated()) {
      return 33;
    }

    if (!this.hasWallet()) {
      return 66;
    }

    return 100;
  });

  protected readonly showConversionProgress = computed(
    () => this.showFooter() && this.conversionProgress() < 100
  );

  protected readonly conversionStepLabel = computed(() => {
    if (!this.auth.isAuthenticated()) {
      return 'Compte';
    }

    if (!this.hasWallet()) {
      return 'Wallet';
    }

    return 'Convertir';
  });

  protected readonly trustLine = computed(
    () => 'Slippage max 0,5 % · Frais réseau 0 %'
  );

  protected readonly socialProofLines = computed(() => {
    const lines: string[] = [];

    if (this.rateLine()) {
      lines.push(`${this.rateLine()} · Taux garanti 30 s`);
    }

    const change = this.change24hLabel();
    if (change !== '—' && change !== 'LaunchLab') {
      lines.push(`${this.toToken()} ${change} · 24 h`);
    }

    lines.push(this.trustLine());
    lines.push('Flux LaunchLab actif');

    return lines;
  });

  protected readonly socialProofLine = computed(() => {
    const lines = this.socialProofLines();
    if (!lines.length) {
      return '';
    }

    return lines[this.socialProofIndex() % lines.length];
  });

  protected readonly footerMetaLine = computed(() => {
    switch (this.swapAction()) {
      case 'create-wallet':
        return 'Wallet requis pour convertir · ~30 s';
      case 'login-required':
        return 'Connectez-vous pour valider la conversion';
      default:
        break;
    }

    if (this.parsedAmount() > 0) {
      const estimate = this.compactEstimateLabel();
      const fiat = this.estimateFiatLine();
      if (estimate && fiat) {
        return `${estimate} · ${fiat}`;
      }
      if (estimate) {
        return estimate;
      }
    }

    if (this.rateLine()) {
      return `${this.rateLine()} · Taux garanti 30 s`;
    }

    return this.socialProofLine();
  });

  protected readonly rateLine = computed(() => {
    const r = this.rate();
    if (!Number.isFinite(r) || r <= 0) {
      return '';
    }

    return `1 ${this.displayTokenSymbol(this.fromToken())} = ${this.formatRateCompact(r)} ${this.toToken()}`;
  });

  protected readonly hasQuoteDetails = computed(
    () => !!this.rateLine() || this.unitUsdPriceTo() != null
  );

  protected readonly quoteDetailsTitle = computed(() => {
    const parts: string[] = [];
    if (this.rateLine()) {
      parts.push(this.rateLine());
    }
    if (this.unitUsdPriceTo() != null) {
      parts.push(this.prixSubline());
    }
    return parts.join(' · ');
  });

  protected readonly maxButtonTitle = computed(
    () =>
      `Utiliser le solde maximum (${this.formatBalance(this.fromBalance())} ${this.amountUnitDisplay(this.fromToken())})`
  );

  protected readonly amountInputState = computed((): AmountInputState => {
    if (!this.hasWallet() || !this.auth.isAuthenticated()) {
      return 'neutral';
    }

    const amount = this.parsedAmount();
    if (amount <= 0) {
      return 'neutral';
    }

    if (amount > this.fromBalance() + 1e-9) {
      return 'insufficient';
    }

    return 'valid';
  });

  protected readonly canFlipPair = computed(() => {
    const from = this.fromToken().trim().toUpperCase();
    const to = this.toToken().trim().toUpperCase();
    return (
      (isExchangeNativeToken(from) && isLaunchpadSwapToken(to)) ||
      (isLaunchpadSwapToken(from) && isExchangeNativeToken(to))
    );
  });

  protected readonly amountPlaceholder = '0';
  protected readonly amountInputHint = EXCHANGE_AMOUNT_VALUE_PLACEHOLDER;

  protected readonly compactEstimateLabel = computed(() => {
    if (this.parsedAmount() <= 0) {
      return '';
    }

    return `≈ ${this.formattedEstimatedTo()} ${this.toToken()}`;
  });

  protected readonly amountInputTitle = computed(() => {
    const current = this.amountValue().trim();
    if (current) {
      return `${current} ${this.amountUnitDisplay(this.fromToken())}`;
    }

    return `Ex. ${this.amountInputHint} ${this.amountUnitDisplay(this.fromToken())}`;
  });

  protected readonly pairSubtitle = computed(
    () =>
      `${this.tokenDisplayName(this.fromToken())} / ${this.tokenDisplayName(this.toToken())}`
  );

  protected readonly soldeSubline = computed(() => {
    const usd = this.unitUsdPriceFrom();
    const balance = this.fromBalance();
    if (usd == null) {
      return 'LaunchLab testnet';
    }

    const totalUsd = balance * usd;
    if (!Number.isFinite(totalUsd)) {
      return '—';
    }

    return `${this.formatUsd(totalUsd, 2)} CHF`;
  });

  protected readonly prixSubline = computed(() => {
    const usd = this.unitUsdPriceTo();
    if (usd == null) {
      return 'LaunchLab testnet';
    }

    return `${this.formatUsd(usd, 4)} CHF`;
  });

  protected readonly unitUsdPriceFrom = computed(() => {
    const usdFetched = this.unitUsdPriceFetched();
    if (usdFetched == null) {
      return null;
    }

    if (this.unitUsdPriceFetchedIsFrom()) {
      return usdFetched;
    }

    const r = this.rate();
    if (!Number.isFinite(r) || r <= 0) {
      return null;
    }

    return usdFetched * r;
  });

  protected readonly swapAction = computed((): SwapAction => {
    if (this.swapping()) {
      return 'swapping';
    }

    if (!this.hasWallet()) {
      return 'create-wallet';
    }

    if (!this.auth.isAuthenticated()) {
      return 'login-required';
    }

    const amount = this.parsedAmount();
    if (amount <= 0) {
      return 'enter-amount';
    }

    if (amount > this.fromBalance() + 1e-9) {
      return 'insufficient';
    }

    return 'swap';
  });

  protected readonly swapButtonLabel = computed(() => {
    switch (this.swapAction()) {
      case 'create-wallet':
        return 'Créer un wallet';
      case 'login-required':
        return 'Se connecter';
      case 'enter-amount':
        return 'Convertir →';
      case 'insufficient':
        return this.fromBalance() <= 0 ? 'Obtenir R4V3' : 'Solde insuffisant';
      case 'swapping':
        return 'Conversion…';
      default: {
        const amountIn = this.formatBalance(this.parsedAmount());
        const amountOut = this.formattedEstimatedTo();
        const fromUnit = this.amountUnitDisplay(this.fromToken());
        const toSymbol = this.toToken();
        return `Convertir ${amountIn} ${fromUnit} → ${amountOut} ${toSymbol}`;
      }
    }
  });

  protected readonly swapButtonLabelCompact = computed(() => {
    switch (this.swapAction()) {
      case 'create-wallet':
        return 'Créer';
      case 'login-required':
        return 'Connexion';
      case 'enter-amount':
        return 'Convertir';
      case 'insufficient':
        return this.fromBalance() <= 0 ? 'R4V3' : 'Insuffisant';
      case 'swapping':
        return '…';
      default: {
        const amountOut = this.formattedEstimatedTo();
        return `→ ${amountOut}`;
      }
    }
  });

  protected readonly swapCtaHint = computed(() => {
    switch (this.swapAction()) {
      case 'create-wallet':
        return 'Wallet requis pour convertir vos tokens en actifs LaunchLab.';
      case 'login-required':
        return 'Connectez-vous pour valider la conversion.';
      case 'enter-amount':
        return 'Saisissez un montant pour voir ce que vous recevrez.';
      case 'insufficient':
        return this.fromBalance() <= 0
          ? 'Obtenez des R4V3 sur le faucet testnet.'
          : 'Réduisez le montant ou rechargez votre solde.';
      default:
        return '';
    }
  });

  protected readonly isFunnelCta = computed(() => {
    const action = this.swapAction();
    return (
      action === 'create-wallet' ||
      action === 'login-required' ||
      (action === 'insufficient' && this.fromBalance() <= 0)
    );
  });

  protected readonly swapButtonDisabled = computed(() => {
    const action = this.swapAction();
    if (action === 'insufficient' && this.fromBalance() <= 0) {
      return this.loadingPanel() || this.swapping();
    }
    return (
      this.loadingPanel() ||
      action === 'enter-amount' ||
      action === 'insufficient' ||
      action === 'swapping'
    );
  });

  constructor() {
    this.launchState.loadProjects();

    this.destroyRef.onDestroy(() => {
      if (this.estimatePulseTimer != null) {
        clearTimeout(this.estimatePulseTimer);
      }
      if (this.pairFlipTimer != null) {
        clearTimeout(this.pairFlipTimer);
      }
      if (this.validFlashTimer != null) {
        clearTimeout(this.validFlashTimer);
      }
      if (this.funnelIntroTimer != null) {
        clearTimeout(this.funnelIntroTimer);
      }
      if (this.socialProofTimer != null) {
        clearInterval(this.socialProofTimer);
      }
    });

    this.socialProofTimer = setInterval(() => {
      this.socialProofIndex.update((index) => index + 1);
    }, 8000);

    effect(() => {
      const state = this.amountInputState();
      if (state === 'valid' && this.lastAmountInputState !== 'valid') {
        this.triggerValidFlash();
      }

      this.lastAmountInputState = state;
    });

    effect(() => {
      this.walletSession.address();
      this.fromToken();
      this.toToken();
      this.fetchExchangePanel();
    });

    effect(() => {
      const requested = this.brandCrypto.exchangeFromToken();
      if (!requested) {
        return;
      }

      this.applyFromToken(requested);
      this.brandCrypto.exchangeFromToken.set(null);
    });

    effect(() => {
      const trade = this.brandCrypto.exchangeTradeRequest();
      if (!trade) {
        return;
      }

      this.applyTradePair(trade.from, trade.to);
      this.brandCrypto.exchangeTradeRequest.set(null);
    });

    effect((onCleanup) => {
      const from = this.fromToken();
      const to = this.toToken();

      const fromCoinId = coinIdForSymbol(from);
      const toCoinId = coinIdForSymbol(to);
      const useFrom = !!fromCoinId;
      const coinId = useFrom ? fromCoinId : toCoinId;

      if (!coinId) {
        this.change24hLabel.set('LaunchLab');
        this.change24hPositive.set(true);
        this.unitUsdPriceFetched.set(null);
        this.unitUsdPriceFetchedIsFrom.set(true);
        return;
      }

      this.unitUsdPriceFetchedIsFrom.set(useFrom);
      const token = useFrom ? from : to;

      const sub = this.cryptoRates
        .getMarketChart(token, '24h', 'usd', coinId)
        .subscribe((data) => {
          if (!data) {
            this.change24hLabel.set('—');
            this.unitUsdPriceFetched.set(null);
            return;
          }

          const sign = data.positive ? '+' : '';
          this.change24hLabel.set(`${sign}${data.changePercent.toFixed(2)}%`);
          this.change24hPositive.set(data.positive);
          this.unitUsdPriceFetched.set(this.parseUsdPrice(data.currentPrice));
        });

      onCleanup(() => sub.unsubscribe());
    });
  }

  ngAfterViewInit(): void {
    if (this.isFunnelCta() && !this.funnelIntroPlayed) {
      this.funnelIntroPlayed = true;
      requestAnimationFrame(() => this.triggerFunnelIntroPulse());
    }
  }

  protected tokenUnitLabel(symbol: string): string {
    return tokenUnitLabel(symbol);
  }

  protected amountUnitDisplay(symbol: string): string {
    return isExchangeNativeToken(symbol) ? EXCHANGE_NATIVE_TOKEN : symbol.trim().toUpperCase();
  }

  protected displayTokenSymbol(symbol: string): string {
    return isExchangeNativeToken(symbol) ? EXCHANGE_NATIVE_TOKEN : symbol.trim().toUpperCase();
  }

  protected pairDirectionLabel(): string {
    return `${this.displayTokenSymbol(this.fromToken())} → ${this.toToken()}`;
  }

  protected nativeRowMeta(): string {
    if (isExchangeNativeToken(this.fromToken())) {
      return `${this.formatBalance(this.fromBalance())} dispo`;
    }
    if (isExchangeNativeToken(this.toToken())) {
      return `${this.formatBalance(this.toBalance())} dispo`;
    }
    return 'Natif';
  }

  protected tokenRowMeta(symbol: string): string {
    if (this.fromToken() === symbol) {
      return `${this.formatBalance(this.fromBalance())} dispo`;
    }
    if (this.nativeFrom() && this.toToken() === symbol) {
      const r = this.rate();
      if (Number.isFinite(r) && r > 0) {
        return `1 R4V3 = ${this.formatRateCompact(r)}`;
      }
    }
    return this.tokenDisplayName(symbol);
  }

  protected formatUnitPrice(): string {
    const r = this.rate();
    if (!Number.isFinite(r) || r <= 0) {
      return '—';
    }

    if (r >= 1) {
      return this.formatBalance(r);
    }

    return r.toLocaleString('fr-FR', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    });
  }

  protected tokenIconText(symbol: string): string {
    switch (symbol) {
      case 'PXD':
        return 'P';
      case 'LAB3':
        return '3';
      case 'NVFI':
        return 'N';
      case 'ORB':
        return 'O';
      case 'CPET':
        return 'C';
      case 'MRAIL':
        return 'M';
      case 'R4V3':
        return 'R';
      default:
        return symbol.slice(0, 1).toUpperCase() || '?';
    }
  }

  protected tokenLogoUrl(symbol: string): string | null {
    const normalized = symbol.trim().toUpperCase();
    if (this.brokenTokenLogos().has(normalized)) {
      return null;
    }

    if (isExchangeNativeToken(normalized)) {
      return null;
    }

    const fromLaunch = this.launchState
      .projects()
      .find((project) => project.symbol.trim().toUpperCase() === normalized);

    const logoUrl = fromLaunch?.logoUrl?.trim();
    return logoUrl ? logoUrl : null;
  }

  protected onTokenLogoError(symbol: string): void {
    const normalized = symbol.trim().toUpperCase();
    this.brokenTokenLogos.update((current) => {
      if (current.has(normalized)) {
        return current;
      }

      const next = new Set(current);
      next.add(normalized);
      return next;
    });
  }

  protected toggleQuoteDetails(): void {
    this.quoteDetailsExpanded.update((expanded) => !expanded);
  }

  protected toggleTokenGrid(event?: Event): void {
    event?.stopPropagation();
    this.closeTokenMenu();
    this.tokenGridOpen.update((open) => !open);
  }

  protected closeTokenGrid(): void {
    this.tokenGridOpen.set(false);
  }

  protected toggleTokenMenu(event?: Event): void {
    event?.stopPropagation();
    this.closeTokenGrid();
    this.tokenMenuOpen.update((open) => !open);
  }

  protected closeTokenMenu(): void {
    this.tokenMenuOpen.set(false);
  }

  protected selectLaunchFromMenu(symbol: string): void {
    this.selectLaunchChip(symbol);
    this.closeTokenMenu();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.tokenGridOpen() && !this.tokenMenuOpen()) {
      return;
    }

    const target = event.target as Node | null;
    if (target && this.host.nativeElement.contains(target)) {
      return;
    }

    this.closeTokenGrid();
    this.closeTokenMenu();
  }

  @HostListener('document:keydown.escape')
  protected onEscapeKey(): void {
    if (this.tokenGridOpen()) {
      this.closeTokenGrid();
    }
    if (this.tokenMenuOpen()) {
      this.closeTokenMenu();
    }
    if (this.quoteDetailsExpanded()) {
      this.quoteDetailsExpanded.set(false);
    }
  }

  protected selectLaunchChipFromGrid(symbol: string): void {
    this.selectLaunchChip(symbol);
    this.closeTokenGrid();
  }

  protected flipPair(): void {
    if (!this.canFlipPair() || this.loadingPanel() || this.swapping()) {
      return;
    }

    const from = this.fromToken().trim().toUpperCase();
    const to = this.toToken().trim().toUpperCase();
    this.setSwapPair(to, from);

    this.closeTokenGrid();
    this.pairFlipping.set(true);
    if (this.pairFlipTimer != null) {
      clearTimeout(this.pairFlipTimer);
    }
    this.pairFlipTimer = setTimeout(() => {
      this.pairFlipping.set(false);
      this.pairFlipTimer = null;
    }, 180);
  }

  protected selectLaunchChip(symbol: string): void {
    const normalized = symbol.trim().toUpperCase();
    if (!isLaunchpadSwapToken(normalized)) {
      return;
    }

    this.setSwapPair(EXCHANGE_NATIVE_TOKEN, normalized);
    this.closeTokenGrid();
    this.closeTokenMenu();
  }

  @HostListener('window:exchange-panel-focus')
  onExternalFocusRequest(): void {
    this.host.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    this.host.nativeElement.classList.add('is-quest-focus');
    window.setTimeout(() => {
      this.host.nativeElement.classList.remove('is-quest-focus');
    }, 1800);
  }

  protected onAmountInput(): void {
    this.amountValue.set(this.amountForm.controls.amount.value);
    this.markInteraction();
    this.clearMessages();
    this.showSuccessToast.set(false);
    this.triggerEstimatePulse();
  }

  protected onAmountEnter(event: Event): void {
    event.preventDefault();
    this.onSwapClick();
  }

  protected setMaxAmount(): void {
    const balance = this.fromBalance();
    if (balance <= 0) {
      return;
    }

    this.amountForm.patchValue({ amount: this.formatAmount(balance) });
    this.amountValue.set(this.formatAmount(balance));
    this.markInteraction();
    this.triggerEstimatePulse();
  }

  protected onSwapClick(): void {
    this.markInteraction();

    if (this.swapAction() === 'create-wallet') {
      this.openWalletDock();
      return;
    }

    if (this.swapAction() === 'login-required') {
      this.errorMessage.set('Connectez-vous pour swapper.');
      this.showStatus.set(true);
      this.auth.openDrawer('login');
      return;
    }

    if (this.swapAction() === 'insufficient' && this.fromBalance() <= 0) {
      this.openFaucetDock();
      return;
    }

    if (this.swapAction() !== 'swap') {
      return;
    }

    this.executeSwap();
  }

  protected dismissSuccessToast(): void {
    this.showSuccessToast.set(false);
  }

  protected formatBalance(value: number): string {
    if (!Number.isFinite(value)) {
      return '0';
    }

    if (value === 0) {
      return '0';
    }

    const abs = Math.abs(value);

    if (abs >= 1) {
      return value.toLocaleString('fr-FR', {
        maximumFractionDigits: 4,
      });
    }

    if (abs >= 0.0001) {
      return value.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      });
    }

    return value.toLocaleString('fr-FR', {
      notation: 'scientific',
      maximumSignificantDigits: 4,
    });
  }

  private applyFromToken(symbol: string): void {
    const normalized = symbol.trim().toUpperCase();
    if (isLaunchpadSwapToken(normalized)) {
      this.setSwapPair(EXCHANGE_NATIVE_TOKEN, normalized);
      return;
    }

    this.setSwapPair(
      EXCHANGE_NATIVE_TOKEN,
      defaultLaunchCounterToken(this.launchpadSwapTokens())
    );
  }

  private applyTradePair(from: string, to: string): void {
    const fromNorm = from.trim().toUpperCase();
    const toNorm = to.trim().toUpperCase();

    if (isExchangeNativeToken(fromNorm) && isLaunchpadSwapToken(toNorm)) {
      this.setSwapPair(fromNorm, toNorm);
      return;
    }

    if (isLaunchpadSwapToken(fromNorm) && isExchangeNativeToken(toNorm)) {
      this.setSwapPair(EXCHANGE_NATIVE_TOKEN, fromNorm);
      return;
    }

    this.setSwapPair(EXCHANGE_NATIVE_TOKEN, defaultLaunchCounterToken(this.launchpadSwapTokens()));
  }

  private setSwapPair(from: string, to: string): void {
    const fromNorm = from.trim().toUpperCase();
    const toNorm = to.trim().toUpperCase();
    this.fromToken.set(fromNorm);
    this.toToken.set(toNorm);
    this.brandCrypto.publishActiveExchangePair(fromNorm, toNorm);
    this.markInteraction();
    this.clearMessages();
    this.quoteDetailsExpanded.set(false);
    this.fetchExchangePanel();
  }

  private enforceNativeOutPair(launchSymbol: string): void {
    this.setSwapPair(EXCHANGE_NATIVE_TOKEN, launchSymbol);
  }

  private isValidLaunchpadPair(from: string, to: string): boolean {
    return (
      isExchangeNativeToken(from) &&
      isLaunchpadSwapToken(to) &&
      from !== to
    );
  }

  private executeSwap(): void {
    this.clearMessages();

    const address = this.walletAddress();
    if (!address) {
      return;
    }

    const amount = this.parsedAmount();
    if (amount <= 0 || amount > this.fromBalance()) {
      return;
    }

    this.swapping.set(true);

    this.api
      .swapExchangeTokens({
        fromToken: this.fromToken(),
        toToken: this.toToken(),
        amount,
        walletAddress: address,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.fromBalance.set(response.fromBalance);
          this.toBalance.set(response.toBalance);
          this.rate.set(response.rate);
          this.successMessage.set(
            response.message ||
              `Reçu ${this.formatAmount(response.amountOut)} ${response.toToken}`
          );
          this.showStatus.set(true);
          this.showSuccessToast.set(true);
          this.amountForm.reset({ amount: '' });
          this.amountValue.set('');
          this.swapping.set(false);

          this.walletSession.requestBalanceRefresh();
          window.dispatchEvent(new CustomEvent('naivechain-refresh'));
          window.dispatchEvent(
            new CustomEvent('market-swap-complete', {
              detail: {
                fromToken: response.fromToken,
                toToken: response.toToken,
                amountIn: response.amountIn,
                amountOut: response.amountOut,
              },
            })
          );
          this.brandCrypto.selectSwapPair(response.fromToken, response.toToken);
          void this.questProgress.recordSwap(response.fromToken, response.toToken);
        },
        error: (error: unknown) => {
          const message = this.resolveErrorMessage(error, 'Swap impossible.');
          this.errorMessage.set(message);
          if (message.includes('Connectez-vous')) {
            this.auth.openDrawer('login');
          }
          this.showStatus.set(true);
          this.swapping.set(false);
        },
      });
  }

  private fetchExchangePanel(): void {
    this.loadingPanel.set(true);

    const params: {
      walletAddress?: string;
      fromToken: string;
      toToken: string;
    } = {
      fromToken: this.fromToken(),
      toToken: this.toToken(),
    };

    const address = this.walletAddress();
    if (address) {
      params.walletAddress = address;
    }

    this.api
      .getExchangePanel(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (Array.isArray(data.availableTokens) && data.availableTokens.length > 0) {
            this.launchpadTokens.set(filterLaunchpadTokenList(data.availableTokens));
            this.launchpadSwapTokens.set(
              filterLaunchpadTokenList(data.availableTokens).filter(
                (token) => !isExchangeNativeToken(token)
              )
            );
          }
          this.fromBalance.set(data.fromBalance);
          this.toBalance.set(data.toBalance);
          this.rate.set(data.rate);
          this.testnet.set(data.testnet ?? true);
          this.loadingPanel.set(false);
        },
        error: () => {
          this.errorMessage.set('Impossible de charger le panneau d’échange.');
          this.showStatus.set(true);
          this.loadingPanel.set(false);
        },
      });
  }

  private formatAmount(value: number): string {
    const rounded = Math.round(value * 1e8) / 1e8;
    return rounded.toString().replace('.', ',');
  }

  private formatRate(value: number): string {
    if (value >= 1000) {
      return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    }
    if (value >= 1) {
      return value.toLocaleString('fr-FR', { maximumFractionDigits: 4 });
    }
    return value.toLocaleString('fr-FR', { maximumFractionDigits: 8 });
  }

  private formatRateCompact(value: number): string {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}M`;
    }
    if (value >= 10_000) {
      return `${Math.round(value).toLocaleString('fr-FR')}`;
    }
    return this.formatRate(value);
  }

  private markInteraction(): void {
    if (!this.showStatus()) {
      this.showStatus.set(false);
    }
  }

  protected clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
      if (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized')) {
        return 'Connectez-vous pour swapper.';
      }
      return error.message;
    }

    return fallback;
  }

  protected tokenDisplayName(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();
    const fromLaunch = this.launchState
      .projects()
      .find((project) => project.symbol.toUpperCase() === normalized);
    if (fromLaunch) {
      return fromLaunch.name;
    }

    return LAUNCH_TOKEN_DISPLAY[normalized] ?? normalized;
  }

  private formatUsd(value: number, fractionDigits = 2): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  }

  private parseUsdPrice(raw: string): number | null {
    const normalized = raw.replace(/[^\d.,-]/g, '').replace(',', '.');
    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) ? value : null;
  }

  private triggerEstimatePulse(): void {
    this.estimatePulse.set(false);

    if (this.estimatePulseTimer != null) {
      clearTimeout(this.estimatePulseTimer);
    }

    queueMicrotask(() => {
      this.estimatePulse.set(true);
      this.estimatePulseTimer = setTimeout(() => {
        this.estimatePulse.set(false);
        this.estimatePulseTimer = null;
      }, 180);
    });
  }

  private triggerValidFlash(): void {
    this.validFlash.set(false);

    if (this.validFlashTimer != null) {
      clearTimeout(this.validFlashTimer);
    }

    queueMicrotask(() => {
      this.validFlash.set(true);
      this.validFlashTimer = setTimeout(() => {
        this.validFlash.set(false);
        this.validFlashTimer = null;
      }, 300);
    });
  }

  private openWalletDock(): void {
    window.dispatchEvent(
      new CustomEvent('dock-open-panel', { detail: { panel: 'wallet' } })
    );
    this.nav.dispatchNewsAction('OPEN_WALLET');
  }

  private openFaucetDock(): void {
    window.dispatchEvent(
      new CustomEvent('dock-open-panel', { detail: { panel: 'faucet' } })
    );
    this.nav.dispatchNewsAction('OPEN_FAUCET');
  }

  private triggerFunnelIntroPulse(): void {
    this.funnelIntroPulse.set(false);

    if (this.funnelIntroTimer != null) {
      clearTimeout(this.funnelIntroTimer);
    }

    queueMicrotask(() => {
      this.funnelIntroPulse.set(true);
      this.funnelIntroTimer = setTimeout(() => {
        this.funnelIntroPulse.set(false);
        this.funnelIntroTimer = null;
      }, 900);
    });
  }
}
