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

import { ChartRange } from '@showcase/models/showcase.model';
import { BrandCryptoSelectionService } from '@navbar/services/brand-crypto-selection.service';
import { BlockchainApiService } from '@blockchain/services/blockchain-api.service';
import { MarketDataService } from '@showcase/services/market-data.service';
import { AuthService } from '@auth/services/auth.service';
import { WalletSessionService } from '@wallet/services/wallet-session.service';
import {
  EXCHANGE_LAUNCHPAD_FALLBACK_TOKENS,
  EXCHANGE_NATIVE_TOKEN,
  filterLaunchpadTokenList,
} from '@core/constants/exchange-launchpad.constants';
import {
  MARKET_ASSETS,
  MARKET_CATEGORY_RAIL,
  MARKET_FILTER_OPTIONS,
  MarketAssetConfig,
  MarketFilter,
  MarketSortMode,
  isMarketFilter,
  marketOfferKindLabel,
} from './market-panel.constants';
import {
  MarketAssetRow,
  MarketRecentTrade,
} from './market-panel.model';
import { MarketPanelService } from './market-panel.service';
import { MarketTokenDrawerComponent } from './market-token-drawer';
import { MarketCarousel3dComponent } from './market-carousel-3d';
import {
  DOCK_REFRESH_EVENT,
  SHOWCASE_REFRESH_EVENT,
  refreshEventMatchesTab,
} from '@core/constants/panel-refresh.constants';

type StatusBannerTone = 'error' | 'warn' | 'info';

@Component({
  selector: 'app-market-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MarketTokenDrawerComponent, MarketCarousel3dComponent],
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

  protected readonly filterOptions = MARKET_FILTER_OPTIONS;
  protected readonly categoryRail = MARKET_CATEGORY_RAIL;
  protected readonly sortOptions: ReadonlyArray<{ id: MarketSortMode; label: string }> = [
    { id: 'fav', label: '★' },
    { id: 'change', label: 'Δ%' },
    { id: 'price', label: '€' },
    { id: 'name', label: 'A-Z' },
  ];

  protected readonly featuredAsset = signal<MarketAssetConfig>(MARKET_ASSETS[0]);
  protected readonly chartRange = signal<ChartRange>('24h');
  protected readonly filter = signal<MarketFilter>('all');
  protected readonly sortMode = signal<MarketSortMode>('fav');
  protected readonly searchQuery = signal('');
  protected readonly favorites = signal<Set<string>>(new Set());
  protected readonly alertThreshold = signal<number>(5);
  protected readonly tradeHint = signal<string | null>(null);
  protected readonly availableTokens = signal<string[]>([...EXCHANGE_LAUNCHPAD_FALLBACK_TOKENS]);
  protected readonly historyExpanded = signal(false);
  protected readonly historyFilterFeatured = signal(false);
  protected readonly focusedRowIndex = signal(0);
  protected readonly drawerRow = signal<MarketAssetRow | null>(null);
  protected readonly liveFilter = signal(false);

  protected readonly rows = this.marketData.rows;
  protected readonly featuredChart = this.marketData.featuredChart;
  protected readonly loadingRows = this.marketData.loadingRows;
  protected readonly loadingChart = this.marketData.loadingChart;
  protected readonly marketError = this.marketData.error;
  protected readonly recentTrades = this.marketData.recentTrades;
  protected readonly alertNotifications = this.marketData.alertNotifications;
  protected readonly lastUpdatedAt = this.marketData.lastUpdatedAt;

  protected readonly tradableAssets = computed(() => {
    const allowed = new Set(this.availableTokens().map((token) => token.toUpperCase()));
    return MARKET_ASSETS.filter((config) => allowed.has(config.exchangeToken.toUpperCase()));
  });

  protected readonly filteredRows = computed(() =>
    this.rowsForCategory(this.filter(), this.searchQuery().trim())
  );

  /** Une lane 3D par catégorie du rail (swipe vertical). */
  protected readonly carouselLanes = computed(() => {
    const query = this.searchQuery().trim();
    return this.categoryRail.map((category) => ({
      category,
      items: this.rowsForCategory(category.id, query),
    }));
  });

  protected readonly featuredDrop = computed(() => {
    const rows = this.sortedRows();
    const nft = rows.find((row) => row.config.offerKind === 'nft');
    if (nft) {
      return nft;
    }
    return rows.find((row) => row.config.native) ?? rows[0] ?? null;
  });

  protected readonly gridRows = computed(() => {
    const featured = this.featuredDrop();
    const rows = this.sortedRows();
    if (!featured || this.filter() !== 'all') {
      return rows;
    }
    return rows.filter(
      (row) => row.config.exchangeToken !== featured.config.exchangeToken
    );
  });

  protected readonly sortedRows = computed(() => {
    const rows = [...this.filteredRows()];
    const pinned = rows.filter((row) => row.config.native);
    const others = rows
      .filter((row) => !row.config.native)
      .sort((left, right) => right.createdAtMs - left.createdAtMs);

    return [...pinned, ...others];
  });

  protected readonly skeletonCount = computed(() =>
    Math.max(3, Math.min(this.tradableAssets().length, 5))
  );

  protected readonly skeletonSlots = computed(() =>
    Array.from({ length: this.skeletonCount() }, (_, index) => index)
  );

  protected readonly sortModeLabel = computed(
    () => this.sortOptions.find((option) => option.id === this.sortMode())?.label ?? '★'
  );

  protected readonly searchPlaceholder = computed(() => {
    const count = this.filteredRows().length;
    return `${count} résultat${count > 1 ? 's' : ''}`;
  });

  protected readonly statusBanner = computed((): { message: string; tone: StatusBannerTone } | null => {
    const error = this.marketError();
    if (error) {
      return { message: error, tone: 'error' };
    }

    const alerts = this.alertNotifications();
    if (alerts.length) {
      return { message: `Alerte : ${alerts.join(' · ')}`, tone: 'warn' };
    }

    const hint = this.tradeHint();
    if (hint) {
      return { message: hint, tone: 'info' };
    }

    return null;
  });

  protected readonly emptyStateMessage = computed(() => {
    switch (this.filter()) {
      case 'nft':
      case 'drop':
        return 'Aucun drop NFT pour le moment';
      case 'service':
        return 'Aucun service numérique disponible';
      case 'asset':
        return 'Aucun actif listé';
      case 'fav':
        return 'Aucun favori — étoilez un produit';
      case 'live':
        return 'Aucun token live pour le moment';
      default:
        break;
    }

    if (this.searchQuery().trim()) {
      return 'Aucun produit ne correspond à la recherche';
    }

    return 'Aucun produit disponible';
  });

  protected readonly resultCountLabel = computed(() => {
    const count = this.filteredRows().length;
    return `${count} résultat${count > 1 ? 's' : ''}`;
  });

  protected readonly filteredTrades = computed(() => {
    let trades = this.recentTrades();
    if (this.historyFilterFeatured()) {
      const token = this.featuredAsset().exchangeToken;
      trades = trades.filter(
        (trade) => trade.fromToken === token || trade.toToken === token
      );
    }

    return trades;
  });

  constructor() {
    this.restoreSession();
    this.favorites.set(this.marketService.readFavorites());
    this.marketData.init();
    this.marketData.resumePolling();
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
      this.persistSession({
        featuredToken: this.featuredAsset().exchangeToken,
        chartRange: this.chartRange(),
        filter: this.filter(),
        sort: this.sortMode(),
        historyExpanded: this.historyExpanded(),
        alertThreshold: this.alertThreshold(),
        searchQuery: this.searchQuery(),
        liveFilter: this.liveFilter(),
      });
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

    effect(() => {
      const drawer = this.drawerRow();
      if (!drawer) {
        return;
      }

      const updated = this.rows().find(
        (entry) => entry.config.exchangeToken === drawer.config.exchangeToken
      );
      if (updated && updated !== drawer) {
        this.drawerRow.set(updated);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.marketData.pausePolling();
      this.marketData.destroy();
    });
  }

  ngOnDestroy(): void {
    this.marketData.pausePolling();
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
    this.liveFilter.set(next === 'live');
    this.focusedRowIndex.set(0);
  }

  protected onCarouselCategoryChange(next: MarketFilter): void {
    this.setFilter(next);
  }

  protected onCarouselItemFocus(row: MarketAssetRow | null): void {
    if (!row) {
      return;
    }
    const index = this.sortedRows().findIndex(
      (entry) => entry.config.exchangeToken === row.config.exchangeToken
    );
    if (index >= 0) {
      this.focusedRowIndex.set(index);
    }
  }

  protected setSortMode(next: MarketSortMode): void {
    this.sortMode.set(next);
    this.focusedRowIndex.set(0);
  }

  protected cycleSort(): void {
    const order = this.sortOptions.map((option) => option.id);
    const current = this.sortMode();
    const index = order.indexOf(current);
    this.setSortMode(order[(index + 1) % order.length] ?? 'fav');
  }

  protected offerKindLabel(row: MarketAssetRow): string {
    return marketOfferKindLabel(row.config.offerKind);
  }

  protected stockLabel(row: MarketAssetRow): string {
    return row.config.stockLabel;
  }

  protected productPitch(row: MarketAssetRow): string {
    return row.metrics.description || row.config.shortPitch;
  }

  protected primaryCtaLabel(row: MarketAssetRow): string {
    if (row.config.offerKind === 'nft') {
      return 'Acheter';
    }
    if (row.config.offerKind === 'service') {
      return 'Commander';
    }
    return row.config.native ? 'Échanger' : 'Acheter';
  }

  protected isFilterActive(id: MarketFilter): boolean {
    return this.filter() === id;
  }

  protected openTokenDrawer(row: MarketAssetRow): void {
    this.selectFeatured(row);
    this.drawerRow.set(row);
    this.focusedRowIndex.set(this.sortedRows().findIndex(
      (entry) => entry.config.exchangeToken === row.config.exchangeToken
    ));
  }

  protected openFeaturedDrop(): void {
    const drop = this.featuredDrop();
    if (drop) {
      this.openTokenDrawer(drop);
    }
  }

  protected closeTokenDrawer(): void {
    this.drawerRow.set(null);
  }

  protected openFocusedTrade(): void {
    const rows = this.sortedRows();
    const row = rows[this.focusedRowIndex()] ?? rows[0];
    if (!row) {
      this.showTradeHint('Aucun token disponible');
      return;
    }

    this.openTokenDrawer(row);
  }

  protected toggleLiveFilter(): void {
    this.liveFilter.update((value) => !value);
    this.focusedRowIndex.set(0);
  }

  protected onDrawerSwapped(event: { message: string }): void {
    this.showTradeHint(event.message);
    void this.marketData.refreshAll(true);
  }

  protected onDrawerFavoriteToggle(): void {
    const row = this.drawerRow();
    if (!row) {
      return;
    }

    this.toggleFavorite(row, { stopPropagation: () => undefined } as MouseEvent);
  }

  protected selectFeatured(row: MarketAssetRow): void {
    this.featuredAsset.set(row.config);
    this.brandCrypto.select(row.config.native ? 'R4V3' : row.config.exchangeToken, row.config.coinId);
    this.publishHubPairForAsset(row.config);
  }

  protected toggleFavorite(row: MarketAssetRow, event: MouseEvent): void {
    event.stopPropagation();

    const next = new Set(this.favorites());
    const key = row.config.exchangeToken;

    if (next.has(key)) {
      next.delete(key);
      this.marketData.togglePriceAlert(key, false);
    } else {
      next.add(key);
    }

    this.favorites.set(next);
    this.marketService.writeFavorites(next);
    this.rows.update((current) =>
      current.map((entry) =>
        entry.config.exchangeToken === key ? { ...entry, favorite: next.has(key) } : entry
      )
    );

    const drawer = this.drawerRow();
    if (drawer?.config.exchangeToken === key) {
      this.drawerRow.set({ ...drawer, favorite: next.has(key) });
    }
  }

  protected togglePriceAlert(row: MarketAssetRow, event: MouseEvent): void {
    event.stopPropagation();

    const enabled = !this.marketData.isAlertEnabled(row.config.exchangeToken);
    const threshold = this.alertThreshold();
    this.marketData.togglePriceAlert(row.config.exchangeToken, enabled, threshold);
    this.showTradeHint(
      enabled
        ? `Alerte ±${threshold}% sur ${row.config.displaySymbol}`
        : `Alerte désactivée pour ${row.config.displaySymbol}`
    );
  }

  protected setAlertThreshold(value: number): void {
    this.alertThreshold.set(value);
    const token = this.featuredAsset().exchangeToken;
    if (this.marketData.isAlertEnabled(token)) {
      this.marketData.updateAlertThreshold(token, value);
    }
  }

  protected isAlertEnabled(row: MarketAssetRow): boolean {
    return this.marketData.isAlertEnabled(row.config.exchangeToken);
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
    this.showTradeHint('Échange R4V3 → jeton du laboratoire');
    this.scrollToSwap();
  }

  protected openInExchange(row: MarketAssetRow, event: MouseEvent): void {
    event.stopPropagation();
    this.selectFeatured(row);
    this.scrollToSwap();
    this.showTradeHint(`Exchange : ${this.pairLabel(row.config)}`);
  }

  protected formatChange(row: MarketAssetRow): string {
    const sign = row.positive ? '+' : '';
    return `${sign}${row.changePercent.toFixed(1)}%`;
  }

  protected compactMetric(value: string): string {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '—') {
      return '—';
    }

    return trimmed
      .replace('Laboratoire', 'Labo')
      .replace('Parité CHF', 'Parité')
      .replace(/\s*R4V3\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  protected momentumShort(row: MarketAssetRow): string {
    switch (row.metrics.momentum) {
      case 'hot':
        return 'HOT';
      case 'warm':
        return '↑';
      case 'cool':
        return '↓';
      default:
        return '—';
    }
  }

  protected balanceLabel(row: MarketAssetRow): string | null {
    if (row.walletBalance == null || row.walletBalance <= 0) {
      return null;
    }

    const share = this.portfolioShare(row);
    const shareLabel = share != null ? ` · ${share.toFixed(0)}%` : '';
    return `${row.walletBalance.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}${shareLabel}`;
  }

  protected portfolioShare(row: MarketAssetRow): number | null {
    if (row.walletBalance == null || row.walletBalance <= 0) {
      return null;
    }

    const total = this.rows().reduce((sum, entry) => sum + (entry.walletBalance ?? 0), 0);
    if (total <= 0) {
      return null;
    }

    return (row.walletBalance / total) * 100;
  }

  protected isSelected(row: MarketAssetRow): boolean {
    return row.config.exchangeToken === this.featuredAsset().exchangeToken;
  }

  protected refreshMarket(): void {
    this.marketData.clearAlertNotifications();
    this.loadAvailableTokens();
    void this.marketData.refreshAll(true);
  }

  @HostListener(`window:${DOCK_REFRESH_EVENT}`, ['$event'])
  @HostListener(`window:${SHOWCASE_REFRESH_EVENT}`, ['$event'])
  onPanelRefresh(event: Event): void {
    if (refreshEventMatchesTab(event, 'market')) {
      this.refreshMarket();
    }
  }

  protected resetMarket(): void {
    this.searchQuery.set('');
    this.filter.set('all');
    this.sortMode.set('fav');
    this.liveFilter.set(false);
    this.historyFilterFeatured.set(false);
    this.marketData.clearAlertNotifications();
    this.marketData.error.set(null);
    this.loadAvailableTokens();
    void this.marketData.refreshAll(true);
  }

  protected dismissStatusBanner(): void {
    this.marketData.error.set(null);
    this.marketData.clearAlertNotifications();
    this.tradeHint.set(null);
  }

  protected toggleHistory(): void {
    this.historyExpanded.update((value) => !value);
  }

  protected toggleHistoryFeaturedFilter(): void {
    this.historyFilterFeatured.update((value) => !value);
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

  protected openTradeExplorer(trade: MarketRecentTrade, event: MouseEvent): void {
    event.stopPropagation();
    if (!trade.txHash) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent('open-transaction-drawer', {
        detail: { hash: trade.txHash },
      })
    );
  }

  protected rowTabIndex(index: number): number {
    return index === this.focusedRowIndex() ? 0 : -1;
  }

  protected cardTabIndex(row: MarketAssetRow): number {
    const index = this.sortedRows().findIndex(
      (entry) => entry.config.exchangeToken === row.config.exchangeToken
    );
    return this.rowTabIndex(index);
  }

  protected isCardFocused(row: MarketAssetRow): boolean {
    const focused = this.sortedRows()[this.focusedRowIndex()];
    return focused?.config.exchangeToken === row.config.exchangeToken;
  }

  @HostListener('keydown', ['$event'])
  protected onPanelKeydown(event: KeyboardEvent): void {
    if (this.drawerRow()) {
      return;
    }

    const rail = this.categoryRail;
    const filterIndex = rail.findIndex((entry) => entry.id === this.filter());

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = rail[Math.min(filterIndex + 1, rail.length - 1)];
      if (next) {
        this.setFilter(next.id);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = rail[Math.max(filterIndex - 1, 0)];
      if (prev) {
        this.setFilter(prev.id);
      }
      return;
    }

    const rows = this.sortedRows();
    if (!rows.length) {
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.focusedRowIndex.update((value) => Math.min(value + 1, rows.length - 1));
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.focusedRowIndex.update((value) => Math.max(value - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      const row = rows[this.focusedRowIndex()];
      if (row) {
        event.preventDefault();
        this.openTokenDrawer(row);
      }
    }

    if (event.key.toLowerCase() === 't') {
      event.preventDefault();
      this.openFocusedTrade();
    }
  }

  private rowsForCategory(filter: MarketFilter, query: string): MarketAssetRow[] {
    const favorites = this.favorites();
    const tradable = new Set(
      this.tradableAssets().map((asset) => asset.exchangeToken.toUpperCase())
    );

    const matched = this.rows().filter((row) => {
      if (!tradable.has(row.config.exchangeToken.toUpperCase())) {
        return false;
      }

      if (filter === 'fav' && !favorites.has(row.config.exchangeToken) && !row.favorite) {
        return false;
      }

      if (filter === 'nft' || filter === 'service' || filter === 'asset') {
        if (row.config.offerKind !== filter) {
          return false;
        }
      }

      if (filter === 'drop' && row.config.offerKind !== 'nft') {
        return false;
      }

      if (filter === 'live') {
        const status = row.launchProject?.status ?? row.metrics.statusLabel;
        if (status !== 'LIVE' && !row.config.native) {
          return false;
        }
      }

      return this.matchesSearch(row, query);
    });

    const pinned = matched.filter((row) => row.config.native);
    const others = matched
      .filter((row) => !row.config.native)
      .sort((left, right) => right.createdAtMs - left.createdAtMs);

    return filter === 'all' || filter === 'asset' || filter === 'live' || filter === 'fav'
      ? [...pinned, ...others]
      : others.length
        ? others
        : matched;
  }

  private matchesSearch(row: MarketAssetRow, query: string): boolean {
    if (!query) {
      return true;
    }

    const normalized = query.toLowerCase();

    const changeMatch = normalized.match(/^([<>]=?)\s*([+-]?\d+(?:[.,]\d+)?)\s*%?$/);
    if (changeMatch) {
      const operator = changeMatch[1];
      const value = Number.parseFloat(changeMatch[2].replace(',', '.'));
      if (!Number.isFinite(value)) {
        return false;
      }

      if (operator.startsWith('>')) {
        return row.changePercent > value;
      }

      return row.changePercent < value;
    }

    const priceMatch = normalized.match(/^price\s*([<>]=?)\s*([\d.,]+)/);
    if (priceMatch) {
      const operator = priceMatch[1];
      const value = Number.parseFloat(priceMatch[2].replace(',', '.'));
      const price = this.parsePriceValue(row.price);
      if (!Number.isFinite(value)) {
        return false;
      }

      if (operator.startsWith('>')) {
        return price > value;
      }

      return price < value;
    }

    return (
      row.config.displaySymbol.toLowerCase().includes(normalized) ||
      row.config.name.toLowerCase().includes(normalized) ||
      row.config.exchangeToken.toLowerCase().includes(normalized) ||
      row.config.offerTag.toLowerCase().includes(normalized) ||
      row.config.shortPitch.toLowerCase().includes(normalized) ||
      (row.config.unitLabel?.toLowerCase().includes(normalized) ?? false)
    );
  }

  private parsePriceValue(price: string): number {
    const normalized = price.replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private restoreSession(): void {
    const session = this.marketService.readSession();
    if (session.featuredToken) {
      const config = MARKET_ASSETS.find((asset) => asset.exchangeToken === session.featuredToken);
      if (config) {
        this.featuredAsset.set(config);
      }
    }

    if (session.chartRange) {
      this.chartRange.set(session.chartRange);
    }

    if (session.filter && isMarketFilter(session.filter)) {
      this.filter.set(session.filter);
    }

    if (session.sort) {
      this.sortMode.set(session.sort);
    }

    if (session.historyExpanded != null) {
      this.historyExpanded.set(session.historyExpanded);
    }

    if (session.alertThreshold != null) {
      this.alertThreshold.set(session.alertThreshold);
    }

    if (session.searchQuery != null) {
      this.searchQuery.set(session.searchQuery);
    }

    if (session.liveFilter != null) {
      this.liveFilter.set(session.liveFilter);
    }
  }

  private persistSession(partial: Parameters<MarketPanelService['writeSession']>[0]): void {
    this.marketService.writeSession(partial);
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

  private ensureTradeReady(fromToken: string): string | null {
    if (!this.walletSession.address()) {
      window.dispatchEvent(new CustomEvent('dock-open-panel', { detail: { panel: 'wallet' } }));
      return 'Créez un wallet pour trader';
    }

    if (!this.auth.isAuthenticated()) {
      this.auth.openDrawer('login');
      return 'Connexion requise pour trader';
    }

    void fromToken;
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
    globalThis.document.querySelector('.app-hub-swap-stack')?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
    window.dispatchEvent(new CustomEvent('exchange-panel-focus'));
  }
}
