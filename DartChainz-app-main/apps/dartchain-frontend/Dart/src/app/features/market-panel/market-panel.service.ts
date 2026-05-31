import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ChartRange } from '../../core/models/showcase.model';
import { CryptoRatesService, MarketChartData } from '../../core/services/crypto-rate.service';
import {
  MARKET_ASSETS,
  MARKET_FAVORITES_STORAGE_KEY,
  MarketAssetConfig,
} from './market-panel.constants';
import { MarketAssetRow, MarketFeaturedChart } from './market-panel.model';

@Injectable({ providedIn: 'root' })
export class MarketPanelService {
  private readonly cryptoRates = inject(CryptoRatesService);

  loadAssetRows(favorites: ReadonlySet<string>): Observable<MarketAssetRow[]> {
    return forkJoin(
      MARKET_ASSETS.map((config) =>
        this.fetchChart(config, '24h').pipe(
          map((chart) => this.toRow(config, chart, favorites.has(config.exchangeToken)))
        )
      )
    ).pipe(catchError(() => of(this.fallbackRows(favorites))));
  }

  loadFeaturedChart(
    config: MarketAssetConfig,
    range: ChartRange
  ): Observable<MarketFeaturedChart | null> {
    return this.fetchChart(config, range).pipe(
      map((chart) =>
        chart
          ? {
              price: chart.currentPrice,
              changePercent: chart.changePercent,
              positive: chart.positive,
              prices: chart.prices?.length ? chart.prices : chart.points,
            }
          : null
      ),
      catchError(() => of(this.fallbackFeatured(config)))
    );
  }

  readFavorites(): Set<string> {
    if (typeof localStorage === 'undefined') {
      return new Set();
    }

    try {
      const raw = localStorage.getItem(MARKET_FAVORITES_STORAGE_KEY);
      if (!raw) {
        return new Set();
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return new Set();
      }

      return new Set(parsed.filter((entry): entry is string => typeof entry === 'string'));
    } catch {
      return new Set();
    }
  }

  writeFavorites(favorites: ReadonlySet<string>): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(
      MARKET_FAVORITES_STORAGE_KEY,
      JSON.stringify([...favorites].sort())
    );
  }

  private fetchChart(
    config: MarketAssetConfig,
    range: ChartRange
  ): Observable<MarketChartData | null> {
    const symbol = config.native ? 'R4V3' : config.exchangeToken;
    return this.cryptoRates.getMarketChart(symbol, range, 'usd', config.coinId);
  }

  private toRow(
    config: MarketAssetConfig,
    chart: MarketChartData | null,
    favorite: boolean
  ): MarketAssetRow {
    if (!chart) {
      return this.fallbackRow(config, favorite);
    }

    return {
      config,
      price: chart.currentPrice,
      changePercent: chart.changePercent,
      positive: chart.positive,
      volume: chart.volume || '—',
      favorite,
    };
  }

  private fallbackRows(favorites: ReadonlySet<string>): MarketAssetRow[] {
    return MARKET_ASSETS.map((config) => this.fallbackRow(config, favorites.has(config.exchangeToken)));
  }

  private fallbackRow(config: MarketAssetConfig, favorite: boolean): MarketAssetRow {
    const samples: Record<string, Omit<MarketAssetRow, 'config' | 'favorite'>> = {
      R4V3: { price: '$0.1204', changePercent: 2.45, positive: true, volume: '$1.24M' },
      ETH: { price: '$3,187.25', changePercent: 1.12, positive: true, volume: '$6.31B' },
      BTC: { price: '$67,420.00', changePercent: -0.35, positive: false, volume: '$18.2B' },
      SOL: { price: '$142.80', changePercent: 3.08, positive: true, volume: '$2.14B' },
      USDT: { price: '$1.00', changePercent: 0.01, positive: true, volume: '$42.1B' },
    };

    const sample = samples[config.exchangeToken] ?? {
      price: '—',
      changePercent: 0,
      positive: true,
      volume: '—',
    };

    return { config, favorite, ...sample };
  }

  private fallbackFeatured(config: MarketAssetConfig): MarketFeaturedChart {
    const row = this.fallbackRow(config, false);
    return {
      price: row.price,
      changePercent: row.changePercent,
      positive: row.positive,
      prices: [0.11, 0.115, 0.112, 0.118, 0.116, 0.121, 0.119, 0.124, 0.1204],
    };
  }
}
