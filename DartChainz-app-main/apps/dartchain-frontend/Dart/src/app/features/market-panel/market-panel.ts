import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ChartRange } from '../../core/models/showcase.model';
import {
  BrandCryptoSelectionService,
} from '../../core/services/brand-crypto-selection.service';
import {
  buildOhlcFromPriceSeries,
  layoutCandlesForSvg,
  CandleSvgLayout,
} from '../showcase-chart/chart-display.util';
import {
  MARKET_ASSETS,
  MARKET_TIMEFRAMES,
  MarketAssetConfig,
  MarketFilter,
} from './market-panel.constants';
import { MarketAssetRow, MarketFeaturedChart } from './market-panel.model';
import { MarketPanelService } from './market-panel.service';

@Component({
  selector: 'app-market-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './market-panel.html',
  styleUrls: ['./market-panel.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketPanelComponent {
  private readonly marketService = inject(MarketPanelService);
  private readonly brandCrypto = inject(BrandCryptoSelectionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly timeframes = MARKET_TIMEFRAMES;
  protected readonly filterOptions: ReadonlyArray<{ id: MarketFilter; label: string }> = [
    { id: 'all', label: 'ALL' },
    { id: 'mts', label: 'MTS' },
    { id: 'fav', label: 'FAV' },
  ];

  protected readonly featuredAsset = signal<MarketAssetConfig>(MARKET_ASSETS[0]);
  protected readonly chartRange = signal<ChartRange>('24h');
  protected readonly featuredChart = signal<MarketFeaturedChart | null>(null);
  protected readonly rows = signal<MarketAssetRow[]>([]);
  protected readonly filter = signal<MarketFilter>('all');
  protected readonly searchQuery = signal('');
  protected readonly favorites = signal<Set<string>>(new Set());
  protected readonly loadingRows = signal(true);
  protected readonly loadingChart = signal(true);
  protected readonly showFavoritesOnly = signal(false);

  protected readonly filteredRows = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const activeFilter = this.filter();

    return this.rows().filter((row) => {
      if (activeFilter === 'mts' && !row.config.native) {
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
        row.config.exchangeToken.toLowerCase().includes(query)
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

  constructor() {
    this.favorites.set(this.marketService.readFavorites());
    this.loadRows();

    effect((onCleanup) => {
      const asset = this.featuredAsset();
      const range = this.chartRange();
      this.loadingChart.set(true);

      const sub = this.marketService.loadFeaturedChart(asset, range).subscribe((chart) => {
        this.featuredChart.set(chart);
        this.loadingChart.set(false);
      });

      onCleanup(() => sub.unsubscribe());
    });
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  protected setFilter(next: MarketFilter): void {
    this.filter.set(next);
  }

  protected setChartRange(range: ChartRange): void {
    this.chartRange.set(range);
  }

  protected selectFeatured(row: MarketAssetRow): void {
    this.featuredAsset.set(row.config);
    this.brandCrypto.select(row.config.native ? 'R4V3' : row.config.exchangeToken, row.config.coinId);
  }

  protected selectFeaturedConfig(config: MarketAssetConfig): void {
    this.featuredAsset.set(config);
    this.brandCrypto.select(config.native ? 'R4V3' : config.exchangeToken, config.coinId);
  }

  protected toggleFavorite(row: MarketAssetRow, event: MouseEvent): void {
    event.stopPropagation();

    const next = new Set(this.favorites());
    const key = row.config.exchangeToken;

    if (next.has(key)) {
      next.delete(key);
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
  }

  protected toggleFavoritesShortcut(): void {
    this.showFavoritesOnly.update((value) => !value);
    this.filter.set(this.showFavoritesOnly() ? 'fav' : 'all');
  }

  protected onBuy(row: MarketAssetRow, event: MouseEvent): void {
    event.stopPropagation();
    this.openExchange(row.config, 'buy');
  }

  protected onSell(row: MarketAssetRow, event: MouseEvent): void {
    event.stopPropagation();
    this.openExchange(row.config, 'sell');
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

  private loadRows(): void {
    this.loadingRows.set(true);

    this.marketService
      .loadAssetRows(this.favorites())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.rows.set(data);
        this.loadingRows.set(false);
      });
  }

  private openExchange(config: MarketAssetConfig, side: 'buy' | 'sell'): void {
    const token = config.exchangeToken;

    if (side === 'sell') {
      this.brandCrypto.requestExchangeTrade(token, 'R4V3');
    } else if (config.native) {
      this.brandCrypto.requestExchangeTrade('USDT', 'R4V3');
    } else {
      this.brandCrypto.requestExchangeTrade('R4V3', token);
    }

    this.brandCrypto.select(config.native ? 'R4V3' : config.displaySymbol, config.coinId);
    this.scrollToSwap();
  }

  private scrollToSwap(): void {
    globalThis.document.querySelector('.app-market-card--swap')?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }
}
