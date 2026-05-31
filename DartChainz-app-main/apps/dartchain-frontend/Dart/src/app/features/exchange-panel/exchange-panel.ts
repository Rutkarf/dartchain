import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { coinIdForSymbol } from '../../core/constants/rate-panel-symbols';
import { BlockchainApiService } from '../../core/services/blockchain-api.service';
import {
  BrandCryptoSelectionService,
  EXCHANGE_FROM_TOKENS,
  ExchangeFromToken,
} from '../../core/services/brand-crypto-selection.service';
import { CryptoRatesService } from '../../core/services/crypto-rate.service';
import { ShowcaseNavigationService } from '../../core/services/showcase-navigation.service';
import { QuestsProgressService } from '../../core/services/quests-progress.service';
import { WalletSessionService } from '../../core/services/wallet-session.service';

type SwapAction = 'create-wallet' | 'enter-amount' | 'insufficient' | 'swapping' | 'swap';

const TOKEN_DISPLAY_NAMES: Record<ExchangeFromToken, string> = {
  R4V3: 'R4V3',
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  DOGE: 'Dogecoin',
  SHIB: 'Shiba Inu',
  XRP: 'Ripple',
  DOT: 'Polkadot',
  USDT: 'Tether',
  AVAX: 'Avalanche',
};

@Component({
  selector: 'app-exchange-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './exchange-panel.html',
  styleUrls: ['./exchange-panel.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExchangePanelComponent {
  private readonly api = inject(BlockchainApiService);
  private readonly walletSession = inject(WalletSessionService);
  private readonly brandCrypto = inject(BrandCryptoSelectionService);
  private readonly cryptoRates = inject(CryptoRatesService);
  private readonly nav = inject(ShowcaseNavigationService);
  private readonly questProgress = inject(QuestsProgressService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly fb = inject(FormBuilder);

  readonly fromTokenOptions = EXCHANGE_FROM_TOKENS;

  protected readonly fromToken = signal<ExchangeFromToken>('BTC');
  protected readonly toToken = signal<ExchangeFromToken>('R4V3');
  protected readonly fromBalance = signal(0);
  protected readonly toBalance = signal(0);
  protected readonly rate = signal(1);
  protected readonly testnet = signal(true);
  protected readonly fromMenuOpen = signal(false);
  protected readonly loadingPanel = signal(false);
  protected readonly swapping = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly showStatus = signal(false);
  protected readonly showSuccessToast = signal(false);

  protected readonly amountValue = signal('');
  protected readonly change24hLabel = signal('—');
  protected readonly change24hPositive = signal(true);
  // CoinGecko ne fournit pas de prix/variation USD pour `R4V3`.
  // On récupère donc le prix USD du token qui a un coinId (souvent BTC/ETH/SOL/...), puis on dérive celui de `toToken` via `rate`.
  protected readonly unitUsdPriceFetched = signal<number | null>(null);
  protected readonly unitUsdPriceFetchedIsFrom = signal(true);

  protected readonly unitUsdPriceTo = computed(() => {
    const usdFetched = this.unitUsdPriceFetched();
    if (usdFetched == null) {
      return null;
    }

    const fetchedIsFrom = this.unitUsdPriceFetchedIsFrom();
    if (!fetchedIsFrom) {
      // Le token fetché est le toToken.
      return usdFetched;
    }

    // Cas standard : fetch depuis fromToken.
    // 1 fromToken = rate toToken => USD(toToken) = USD(fromToken) / rate
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

  protected readonly rateLine = computed(() => {
    const r = this.rate();
    if (!Number.isFinite(r) || r <= 0) {
      return '';
    }

    return `1 ${this.fromToken()} = ${this.formatRateCompact(r)} ${this.toToken()}`;
  });

  protected readonly amountPlaceholder = computed(() => {
    if (this.amountValue().trim()) {
      return '0';
    }

    return this.rateLine() || '0';
  });

  protected readonly pairSubtitle = computed(
    () =>
      `${this.tokenDisplayName(this.fromToken())} / ${this.tokenDisplayName(this.toToken())}`
  );

  protected readonly soldeSubline = computed(() => {
    const usd = this.unitUsdPriceTo();
    const balance = this.toBalance();
    if (usd == null) {
      return '—';
    }

    const totalUsd = balance * usd;
    if (!Number.isFinite(totalUsd)) {
      return '—';
    }

    return `$${this.formatUsd(totalUsd, 2)} USD`;
  });

  protected readonly prixSubline = computed(() => {
    const usd = this.unitUsdPriceTo();
    if (usd == null) {
      return '—';
    }

    return `$${this.formatUsd(usd, 4)} USD`;
  });

  protected readonly swapAction = computed((): SwapAction => {
    if (this.swapping()) {
      return 'swapping';
    }

    if (!this.hasWallet()) {
      return 'create-wallet';
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
        return 'Wallet';
      case 'enter-amount':
        return 'Montant';
      case 'insufficient':
        return 'Solde insuf.';
      case 'swapping':
        return 'Swap…';
      default:
        return 'Swap';
    }
  });

  protected readonly swapButtonDisabled = computed(() => {
    const action = this.swapAction();
    return (
      this.loadingPanel() ||
      action === 'enter-amount' ||
      action === 'insufficient' ||
      action === 'swapping'
    );
  });

  constructor() {
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

      this.fromToken.set(trade.from);
      this.toToken.set(trade.to);
      this.brandCrypto.exchangeTradeRequest.set(null);
    });

    effect((onCleanup) => {
      const from = this.fromToken();
      const to = this.toToken();

      const fromCoinId = coinIdForSymbol(from);
      const toCoinId = coinIdForSymbol(to);

      // Préférence : fromToken si possible, sinon toToken.
      // Cela évite d’afficher `—` quand `toToken` est `R4V3` (sans coinId).
      const useFrom = !!fromCoinId;
      const coinId = useFrom ? fromCoinId : toCoinId;

      if (!coinId) {
        this.change24hLabel.set('—');
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

  protected tokenIconText(symbol: ExchangeFromToken): string {
    switch (symbol) {
      case 'BTC':
        return '₿';
      case 'ETH':
        return 'Ξ';
      case 'SOL':
        return 'S';
      case 'DOGE':
        return 'D';
      case 'SHIB':
        return 'S';
      case 'XRP':
        return 'X';
      case 'DOT':
        return '●';
      case 'USDT':
        return '₮';
      case 'AVAX':
        return 'A';
      default:
        return 'R';
    }
  }

  protected toggleFromMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.fromMenuOpen.update((open) => !open);
  }

  protected selectFromToken(symbol: ExchangeFromToken): void {
    this.applyFromToken(symbol);
    this.fromMenuOpen.set(false);
    this.markInteraction();
    this.clearMessages();
  }

  protected flipPair(): void {
    const from = this.fromToken();
    const to = this.toToken();
    this.fromToken.set(to);
    this.toToken.set(from);
    this.markInteraction();
    this.clearMessages();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    if (!this.fromMenuOpen()) {
      return;
    }
    if (this.host.nativeElement.contains(ev.target as Node)) {
      return;
    }
    this.fromMenuOpen.set(false);
  }

  protected onAmountInput(): void {
    this.amountValue.set(this.amountForm.controls.amount.value);
    this.markInteraction();
    this.clearMessages();
    this.showSuccessToast.set(false);
  }

  protected setMaxAmount(): void {
    const balance = this.fromBalance();
    if (balance <= 0) {
      return;
    }

    this.amountForm.patchValue({ amount: this.formatAmount(balance) });
    this.amountValue.set(this.formatAmount(balance));
    this.markInteraction();
  }

  protected onSwapClick(): void {
    this.markInteraction();

    if (this.swapAction() === 'create-wallet') {
      this.nav.dispatchNewsAction('OPEN_WALLET');
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
    if (value >= 1) {
      return value.toLocaleString('fr-FR', {
        maximumFractionDigits: 4,
      });
    }

    return value.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  }

  private applyFromToken(symbol: ExchangeFromToken): void {
    this.fromToken.set(symbol);
    this.toToken.set(symbol === 'R4V3' ? 'BTC' : 'R4V3');
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
          this.brandCrypto.selectSwapPair(response.fromToken, response.toToken);
          this.questProgress.recordSwap();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.resolveErrorMessage(error, 'Swap impossible.'));
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
    return rounded.toString();
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
      return error.message;
    }

    return fallback;
  }

  private tokenDisplayName(symbol: ExchangeFromToken): string {
    return TOKEN_DISPLAY_NAMES[symbol] ?? symbol;
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
}
