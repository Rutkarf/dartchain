import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';

import { ChartRange } from '../../core/models/showcase.model';
import { BrandCryptoSelectionService } from '../../core/services/brand-crypto-selection.service';
import { BlockchainApiService } from '../../core/services/blockchain-api.service';
import { MarketDataService } from '../../core/services/market-data.service';
import { AuthService } from '../../core/services/auth.service';
import { WalletSessionService } from '../../core/services/wallet-session.service';
import {
  EXCHANGE_LAUNCHPAD_FALLBACK_TOKENS,
  EXCHANGE_NATIVE_TOKEN,
  filterLaunchpadTokenList,
} from '../../core/constants/exchange-launchpad.constants';
import {
  buildOhlcFromPriceSeries,
  layoutCandlesForSvg,
  CandleSvgLayout,
} from '../showcase-chart/chart-display.util';
import {
  MARKET_ASSETS,
  MARKET_DEFAULT_ALERT_THRESHOLD,
  MARKET_TIMEFRAMES,
  MarketAssetConfig,
  MarketFilter,
} from './market-panel.constants';
import {
  MarketAssetRow,
  MarketQuickTradeContext,
  MarketRecentTrade,
} from './market-panel.model';
import { MarketPanelService } from './market-panel.service';

@Component({
  selector: 'app-market-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './market-panel.html',
  styleUrls: ['./market-panel.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketPanelComponent implements OnDestroy {
  private readonly marketService = inject(MarketPanelService);
  private readonly marketData = inject(MarketDataService);
  private readonly brandCrypto = inject(BrandCryptoSelectionService);
  private readonly api = inject(BlockchainApiService);
  private readonly auth = inject(AuthService);
  private readonly walletSession = inject(WalletSessionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly timeframes = MARKET_TIMEFRAMES;
  protected readonly filterOptions: ReadonlyArray<{ id: MarketFilter; label: string }> = [
    { id: 'all', label: 'TOUS' },
    { id: 'r4v3', label: 'R4V3' },
    { id: 'fav', label: 'FAV' },
  ];
  protected readonly quickPercents = [10, 25, 50, 100] as const;

  protected readonly featuredAsset = signal<MarketAssetConfig>(MARKET_ASSETS[0]);
  protected readonly chartRange = signal<ChartRange>('24h');
  protected readonly filter = signal<MarketFilter>('all');
  protected readonly searchQuery = signal('');
  protected readonly favorites = signal<Set<string>>(new Set());
  protected readonly showFavoritesOnly = signal(false);
  protected readonly tradeHint = signal<string | null>(null);
  protected readonly availableTokens = signal<string[]>([...EXCHANGE_LAUNCHPAD_FALLBACK_TOKENS]);
  protected readonly quickTrade = signal<MarketQuickTradeContext | null>(null);
  protected readonly quickTradeLoading = signal(false);
  protected readonly quickTradeSubmitting = signal(false);
  protected readonly historyExpanded = signal(false);
  protected readonly focusedRowIndex = signal(0);

  protected readonly rows = this.marketData.rows;
  protected readonly featuredChart = this.marketData.featuredChart;
  protected readonly loadingRows = this.marketData.loadingRows;
  protected readonly loadingChart = this.marketData.loadingChart;
  protected readonly marketError = this.marketData.error;
  protected readonly recentTrades = this.marketData.recentTrades;
  protected readonly alertNotifications = this.marketData.alertNotifications;

  protected readonly tradableAssets = computed(() => {
    const allowed = new Set(this.availableTokens().map((token) => token.toUpperCase()));
    return MARKET_ASSETS.filter((config) => allowed.has(config.exchangeToken.toUpperCase()));
  });

  protected readonly filteredRows = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const activeFilter = this.filter();

    return this.rows().filter((row) => {
      if (!this.tradableAssets().some((asset) => asset.exchangeToken === row.config.exchangeToken)) {
        return false;
      }

      if (activeFilter === 'r4v3' && !row.config.native) {
        return false;
      }

      if (activeFilter === 'fav' && !row.favorite) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        row.config.displaySymbol.toLowerCase().includes(query) ||
        row.config.name.toLowerCase().includes(query) ||
        row.config.exchangeToken.toLowerCase().includes(query) ||
        (row.config.unitLabel?.toLowerCase().includes(query) ?? false)
      );
    });
  });

  protected readonly featuredCandles = computed((): CandleSvgLayout[] => {
    const chart = this.featuredChart();
    if (!chart?.prices?.length) {
      return [];
    }

    const ohlc = buildOhlcFromPriceSeries(chart.prices);
    return layoutCandlesForSvg(ohlc, 100, 36);
  });

  protected readonly featuredChangeLabel = computed(() => {
    const chart = this.featuredChart();
    if (!chart) {
      return '—';
    }

    const sign = chart.positive ? '+' : '';
    return `${sign}${chart.changePercent.toFixed(2)}%`;
  });

  protected readonly errorBanner = computed(() => {
    const error = this.marketError();
    if (error) {
      return error;
    }

    const alerts = this.alertNotifications();
    if (alerts.length) {
      return `Alerte : ${alerts.join(' · ')}`;
    }

    return null;
  });

  constructor() {
    this.favorites.set(this.marketService.readFavorites());
    this.marketData.init();
    this.loadAvailableTokens();
    this.syncMarketDataContext();
    void this.marketData.refreshAll(true);

    effect(() => {
      this.favorites();
      this.walletSession.address();
      this.featuredAsset();
      this.chartRange();
      this.syncMarketDataContext();
      this.marketData.scheduleRefresh(true);
    });

    effect(() => {
      const pair = this.brandCrypto.activeExchangePair();
      if (!pair) {
        return;
      }

      const token =
        pair.from === EXCHANGE_NATIVE_TOKEN
          ? pair.to
          : pair.to === EXCHANGE_NATIVE_TOKEN
            ? pair.from
            : pair.to;

      const config = MARKET_ASSETS.find(
        (asset) => asset.exchangeToken.toUpperCase() === token.toUpperCase()
      );
      if (config && config.exchangeToken !== this.featuredAsset().exchangeToken) {
        this.featuredAsset.set(config);
      }
    });

    this.destroyRef.onDestroy(() => this.marketData.destroy());
  }

  ngOnDestroy(): void {
    this.marketData.destroy();
  }

  protected pairLabel(config: MarketAssetConfig): string {
    if (config.native && config.unitLabel) {
      return `${config.displaySymbol} / ${config.unitLabel}`;
    }

    return `${config.displaySymbol} / EUR`;
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.focusedRowIndex.set(0);
  }

  protected setFilter(next: MarketFilter): void {
    this.filter.set(next);
    this.focusedRowIndex.set(0);
  }

  protected setChartRange(range: ChartRange): void {
    this.chartRange.set(range);
  }

  protected selectFeatured(row: MarketAssetRow): void {
    this.featuredAsset.set(row.config);
    this.brandCrypto.select(row.config.native ? 'R4V3' : row.config.exchangeToken, row.config.coinId);
    this.publishHubPairForAsset(row.config);
  }

  protected selectFeaturedConfig(config: MarketAssetConfig): void {
    this.featuredAsset.set(config);
    this.brandCrypto.select(config.native ? 'R4V3' : config.exchangeToken, config.coinId);
    this.publishHubPairForAsset(config);
  }

  protected toggleFavorite(row: MarketAssetRow, event: MouseEvent): void {
    event.stopPropagation();

    const next = new Set(this.favorites());
    const key = row.config.exchangeToken;
    const wasFavorite = next.has(key);

    if (wasFavorite) {
      next.delete(key);
      this.marketData.togglePriceAlert(key, false);
    } else {
      next.add(key);
      this.marketData.togglePriceAlert(key, true, MARKET_DEFAULT_ALERT_THRESHOLD);
    }

    this.favorites.set(next);
    this.marketService.writeFavorites(next);
    this.rows.update((current) =>
      current.map((entry) =>
        entry.config.exchangeToken === key ? { ...entry, favorite: next.has(key) } : entry
      )
    );
  }

  protected togglePriceAlert(row: MarketAssetRow, event: MouseEvent): void {
    event.stopPropagation();
    if (!row.favorite) {
      return;
    }

    const enabled = !this.marketData.isAlertEnabled(row.config.exchangeToken);
    this.marketData.togglePriceAlert(row.config.exchangeToken, enabled, MARKET_DEFAULT_ALERT_THRESHOLD);
    this.showTradeHint(
      enabled
        ? `Alerte ±${MARKET_DEFAULT_ALERT_THRESHOLD}% sur ${row.config.displaySymbol}`
        : `Alerte désactivée pour ${row.config.displaySymbol}`
    );
  }

  protected isAlertEnabled(row: MarketAssetRow): boolean {
    return row.favorite && this.marketData.isAlertEnabled(row.config.exchangeToken);
  }

  protected toggleFavoritesShortcut(): void {
    this.showFavoritesOnly.update((value) => !value);
    this.filter.set(this.showFavoritesOnly() ? 'fav' : 'all');
  }

  protected onBuy(row: MarketAssetRow, event: MouseEvent): void {
    event.stopPropagation();
    void this.openQuickTrade(row, 'buy');
  }

  protected onSell(row: MarketAssetRow, event: MouseEvent): void {
    event.stopPropagation();
    void this.openQuickTrade(row, 'sell');
  }

  protected openNativeSwap(event: MouseEvent): void {
    event.stopPropagation();
    const guard = this.ensureTradeReady(EXCHANGE_NATIVE_TOKEN);
    if (guard) {
      this.showTradeHint(guard);
      return;
    }

    this.brandCrypto.requestExchangeTrade(EXCHANGE_NATIVE_TOKEN, 'PXD');
    this.brandCrypto.select('R4V3');
    this.showTradeHint('Swap R4V3 → token LaunchLab');
    this.scrollToSwap();
  }

  protected formatChange(row: MarketAssetRow): string {
    const sign = row.positive ? '+' : '';
    return `${sign}${row.changePercent.toFixed(2)}%`;
  }

  protected isFeatured(row: MarketAssetRow): boolean {
    return row.config.exchangeToken === this.featuredAsset().exchangeToken;
  }

  protected isTimeframeActive(range: ChartRange): boolean {
    return this.chartRange() === range;
  }

  protected listSummary(): string {
    if (this.historyExpanded()) {
      return `${this.recentTrades().length} trade(s) récent(s)`;
    }

    const count = this.filteredRows().length;
    const total = this.tradableAssets().length;
    const countdown = this.marketData.rateLimitCountdownLabel();
    if (countdown) {
      return countdown;
    }

    if (count === total) {
      return `${count} actifs LaunchLab · R4V3 / m4t3r`;
    }

    return `${count}/${total} actifs affichés`;
  }

  protected refreshMarket(): void {
    this.marketData.clearAlertNotifications();
    this.loadAvailableTokens();
    void this.marketData.refreshAll(true);
  }

  protected dismissErrorBanner(): void {
    this.marketData.error.set(null);
    this.marketData.clearAlertNotifications();
  }

  protected toggleHistory(): void {
    this.historyExpanded.update((value) => !value);
  }

  protected closeQuickTrade(): void {
    this.quickTrade.set(null);
    this.quickTradeSubmitting.set(false);
  }

  protected async applyQuickPercent(percent: number): Promise<void> {
    const context = this.quickTrade();
    if (!context || context.fromBalance <= 0) {
      return;
    }

    const amount = (context.fromBalance * percent) / 100;
    this.quickTrade.set({ ...context, amountPreset: amount });
  }

  protected async confirmQuickTrade(): Promise<void> {
    const context = this.quickTrade();
    const address = this.walletSession.address();
    if (!context || !address || context.amountPreset <= 0) {
      return;
    }

    this.quickTradeSubmitting.set(true);
    this.api
      .swapExchangeTokens({
        fromToken: context.fromToken,
        toToken: context.toToken,
        amount: context.amountPreset,
        walletAddress: address,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
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
          this.walletSession.requestBalanceRefresh();
          this.showTradeHint(`Swap OK : ${response.amountOut} ${response.toToken}`);
          this.closeQuickTrade();
          void this.marketData.refreshAll(true);
        },
        error: () => {
          this.showTradeHint('Swap impossible — vérifiez solde et connexion');
          this.quickTradeSubmitting.set(false);
        },
      });
  }

  protected formatTrade(trade: MarketRecentTrade): string {
    return `${trade.amountIn} ${trade.fromToken} → ${trade.amountOut} ${trade.toToken}`;
  }

  protected formatTradeTime(trade: MarketRecentTrade): string {
    return new Date(trade.at).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected rowTabIndex(index: number): number {
    return index === this.focusedRowIndex() ? 0 : -1;
  }

  @HostListener('keydown', ['$event'])
  protected onPanelKeydown(event: KeyboardEvent): void {
    if (this.quickTrade()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeQuickTrade();
      }
      return;
    }

    const rows = this.filteredRows();
    if (!rows.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusedRowIndex.update((value) => Math.min(value + 1, rows.length - 1));
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusedRowIndex.update((value) => Math.max(value - 1, 0));
    }

    if (event.key === 'Enter') {
      const row = rows[this.focusedRowIndex()];
      if (row) {
        event.preventDefault();
        this.selectFeatured(row);
      }
    }
  }

  private syncMarketDataContext(): void {
    this.marketData.configureContext(
      this.favorites(),
      this.walletSession.address(),
      this.featuredAsset(),
      this.chartRange()
    );
  }

  private loadAvailableTokens(): void {
    this.api
      .getExchangePanel({ fromToken: EXCHANGE_NATIVE_TOKEN, toToken: 'PXD' })
      .pipe(
        map((panel) => filterLaunchpadTokenList(panel.availableTokens ?? [])),
        catchError(() => of([...EXCHANGE_LAUNCHPAD_FALLBACK_TOKENS])),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((tokens) => {
        this.availableTokens.set(tokens.length ? tokens : [...EXCHANGE_LAUNCHPAD_FALLBACK_TOKENS]);
      });
  }

  private async openQuickTrade(row: MarketAssetRow, side: 'buy' | 'sell'): Promise<void> {
    if (row.config.native) {
      this.openNativeSwap({ stopPropagation: () => undefined } as MouseEvent);
      return;
    }

    const fromToken = side === 'buy' ? EXCHANGE_NATIVE_TOKEN : row.config.exchangeToken;
    const toToken = side === 'buy' ? row.config.exchangeToken : EXCHANGE_NATIVE_TOKEN;
    const guard = this.ensureTradeReady(fromToken);
    if (guard) {
      this.showTradeHint(guard);
      return;
    }

    this.quickTradeLoading.set(true);
    this.api
      .getExchangePanel({
        walletAddress: this.walletSession.address(),
        fromToken,
        toToken,
      })
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((panel) => {
        this.quickTradeLoading.set(false);
        if (!panel) {
          this.showTradeHint('Impossible de charger la paire');
          return;
        }

        this.quickTrade.set({
          config: row.config,
          side,
          fromToken,
          toToken,
          fromBalance: panel.fromBalance,
          rate: panel.rate,
          amountPreset: 0,
        });
      });
  }

  private ensureTradeReady(fromToken: string): string | null {
    if (!this.walletSession.address()) {
      window.dispatchEvent(new CustomEvent('dock-open-panel', { detail: { panel: 'wallet' } }));
      return 'Créez un wallet pour trader';
    }

    if (!this.auth.isAuthenticated()) {
      this.auth.openDrawer('login');
      return 'Connexion requise pour trader';
    }

    return null;
  }

  private publishHubPairForAsset(config: MarketAssetConfig): void {
    if (config.native) {
      this.brandCrypto.publishActiveExchangePair(EXCHANGE_NATIVE_TOKEN, 'PXD');
      return;
    }

    this.brandCrypto.publishActiveExchangePair(EXCHANGE_NATIVE_TOKEN, config.exchangeToken);
  }

  private showTradeHint(message: string): void {
    this.tradeHint.set(message);
    window.setTimeout(() => this.tradeHint.set(null), 2600);
  }

  private scrollToSwap(): void {
    globalThis.document.querySelector('.app-market-card--swap')?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
    window.dispatchEvent(new CustomEvent('exchange-panel-focus'));
  }
}
