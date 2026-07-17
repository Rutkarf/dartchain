import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, map, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ChartRange } from '../../core/models/showcase.model';
import { CryptoRatesService, MarketChartData } from '../../core/services/crypto-rate.service';
import { BlockchainApiService } from '../../core/services/blockchain-api.service';
import { EXCHANGE_NATIVE_TOKEN } from '../../core/constants/exchange-launchpad.constants';
import {
  MARKET_ASSETS,
  MARKET_FAVORITES_STORAGE_KEY,
  MarketAssetConfig,
} from './market-panel.constants';
import { MarketAssetRow, MarketFeaturedChart } from './market-panel.model';

const LAUNCH_TOKEN_EUR_FALLBACK = 0.05;

@Injectable({ providedIn: 'root' })
export class MarketPanelService {
  private readonly cryptoRates = inject(CryptoRatesService);
  private readonly api = inject(BlockchainApiService);

  loadAssetRows(
    favorites: ReadonlySet<string>,
    walletAddress?: string
  ): Observable<MarketAssetRow[]> {
    const launchAssets = MARKET_ASSETS.filter((config) => !config.native);

    return forkJoin({
      r4v3Chart: this.fetchChart(MARKET_ASSETS[0], '24h'),
      launchRates: forkJoin(
        launchAssets.map((config) =>
          this.api
            .getExchangePanel({
              walletAddress: walletAddress || undefined,
              fromToken: EXCHANGE_NATIVE_TOKEN,
              toToken: config.exchangeToken,
            })
            .pipe(
              map((panel) => ({
                config,
                rate: panel.rate,
              })),
              catchError(() => of({ config, rate: null as number | null }))
            )
        )
      ),
    }).pipe(
      map(({ r4v3Chart, launchRates }) =>
        MARKET_ASSETS.map((config) => {
          if (config.native) {
            return this.toRow(config, r4v3Chart, favorites.has(config.exchangeToken));
          }

          const launchRate = launchRates.find(
            (entry) => entry.config.exchangeToken === config.exchangeToken
          );
          return this.toLaunchRow(
            config,
            launchRate?.rate ?? null,
            r4v3Chart,
            favorites.has(config.exchangeToken)
          );
        })
      ),
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 429) {
          throw error;
        }
        return of(this.fallbackRows(favorites));
      })
    );
  }

  loadFeaturedChart(
    config: MarketAssetConfig,
    range: ChartRange
  ): Observable<MarketFeaturedChart | null> {
    if (!config.native && !config.coinId) {
      return forkJoin({
        chart: this.fetchChart(config, range),
        ratePanel: this.api
          .getExchangePanel({
            fromToken: EXCHANGE_NATIVE_TOKEN,
            toToken: config.exchangeToken,
          })
          .pipe(catchError(() => of(null))),
        r4v3Chart: this.fetchChart(MARKET_ASSETS[0], range),
      }).pipe(
        map(({ chart, ratePanel, r4v3Chart }) => {
          const launchRow = this.toLaunchRow(
            config,
            ratePanel?.rate ?? null,
            r4v3Chart,
            false
          );

          const prices = chart?.prices?.length
            ? chart.prices
            : r4v3Chart?.prices?.length
              ? r4v3Chart.prices
              : chart?.points ?? [];

          return {
            price: launchRow.price,
            changePercent: launchRow.changePercent,
            positive: launchRow.positive,
            prices,
          };
        }),
        catchError(() => of(this.fallbackFeatured(config)))
      );
    }

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
    return this.cryptoRates.getMarketChart(symbol, range, 'eur', config.coinId);
  }

  private toLaunchRow(
    config: MarketAssetConfig,
    rate: number | null,
    r4v3Chart: MarketChartData | null,
    favorite: boolean
  ): MarketAssetRow {
    const r4v3Eur = this.parseEurPrice(r4v3Chart?.currentPrice);
    const changePercent = r4v3Chart?.changePercent ?? 0;
    const positive = changePercent >= 0;

    if (rate && rate > 0 && r4v3Eur != null) {
      const tokenEur = r4v3Eur / rate;
      return {
        config,
        favorite,
        price: this.formatEur(tokenEur),
        changePercent,
        positive,
        volume: 'LaunchLab',
        priceUnavailable: false,
      };
    }

    return {
      config,
      favorite,
      price: this.formatEur(LAUNCH_TOKEN_EUR_FALLBACK),
      changePercent,
      positive,
      volume: 'LaunchLab',
      priceUnavailable: rate == null,
    };
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
      priceUnavailable: false,
    };
  }

  private parseEurPrice(value: string | undefined): number | null {
    if (!value) {
      return null;
    }

    const normalized = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private formatEur(value: number): string {
    if (value >= 1) {
      return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`;
    }

    return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} €`;
  }

  private fallbackRows(favorites: ReadonlySet<string>): MarketAssetRow[] {
    return MARKET_ASSETS.map((config) => this.fallbackRow(config, favorites.has(config.exchangeToken)));
  }

  private fallbackRow(config: MarketAssetConfig, favorite: boolean): MarketAssetRow {
    const samples: Record<string, Omit<MarketAssetRow, 'config' | 'favorite'>> = {
      R4V3: { price: '1,00 CHF', changePercent: 0, positive: true, volume: 'Peg CHF/GBP', priceUnavailable: false },
      PXD: { price: '0,05 €', changePercent: 1.8, positive: true, volume: 'LaunchLab', priceUnavailable: true },
      NVFI: { price: '0,05 €', changePercent: 0.4, positive: true, volume: 'LaunchLab', priceUnavailable: true },
      LAB3: { price: '0,05 €', changePercent: 0, positive: true, volume: 'LaunchLab', priceUnavailable: true },
      ORB: { price: '0,05 €', changePercent: 0.2, positive: true, volume: 'LaunchLab', priceUnavailable: true },
    };

    const sample = samples[config.exchangeToken] ?? {
      price: '—',
      changePercent: 0,
      positive: true,
      volume: '—',
      priceUnavailable: true,
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
