import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChartRange } from '../models/showcase.model';
import {
  BRAND_DEFAULT_CRYPTO,
  COINGECKO_COIN_IDS,
  RATE_PANEL_LEFT_SYMBOLS,
  RATE_PANEL_NATIVE_COIN_ID,
  RATE_PANEL_SYMBOLS,
  RatePanelSymbol,
} from '../constants/rate-panel-symbols';
import { RatePanelCoinEntry } from '../models/rate-panel-coin.model';

export interface CryptoSearchResult {
  id: string;
  symbol: string;
  name: string;
  thumb: string;
}

export type ChartCurrency = 'eur' | 'usd' | 'r4v3';

export interface MarketChartData {
  symbol: string;
  range: string;
  currency: string;
  currentPrice: string;
  changePercent: number;
  positive: boolean;
  high: string;
  low: string;
  volume: string;
  points: number[];
  volumes: number[];
  prices: number[];
  timestamps: number[];
}

export interface RatePanelData {
  symbol: string;
  pair: string;
  value: string;
  change: string;
  positive: boolean;
  points: number[];
}

@Injectable({
  providedIn: 'root',
})
export class CryptoRatesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl.replace(/\/+$/, '')}/crypto-rates`;

  getMarketChart(
    symbol: string,
    range: ChartRange = '24h',
    currency: ChartCurrency = 'eur',
    coinId?: string | null
  ): Observable<MarketChartData | null> {
    const params: Record<string, string> = { symbol, range, currency };
    if (coinId?.trim()) {
      params['coinId'] = coinId.trim();
    }

    return this.http
      .get<MarketChartData>(`${this.apiUrl}/chart`, { params })
      .pipe(
        map((chart) => ({
          ...chart,
          points: [...chart.points],
          volumes: [...chart.volumes],
          prices: [...chart.prices],
          timestamps: [...(chart.timestamps ?? [])],
        })),
        catchError(() => of(null))
      );
  }

  getLivePanels(): Observable<RatePanelData[]> {
    return this.getPanelsBatch(this.leftCoinEntries()).pipe(
      catchError(() => of(this.placeholderPanelsFor(RATE_PANEL_LEFT_SYMBOLS)))
    );
  }

  getPanelsBatch(entries: RatePanelCoinEntry[]): Observable<RatePanelData[]> {
    if (entries.length === 0) {
      return of([]);
    }

    return forkJoin(
      entries.map((entry) => {
        if (entry.symbol.toUpperCase() === BRAND_DEFAULT_CRYPTO) {
          return this.getR4v3FeaturedPanel();
        }

        return this.fetchRemotePanels([entry]).pipe(
          map((panels) => panels[0] ?? this.placeholderPanelsFor([entry.symbol])[0])
        );
      })
    ).pipe(
      catchError(() => of(this.placeholderPanelsFor(entries.map((entry) => entry.symbol))))
    );
  }

  private fetchRemotePanels(entries: RatePanelCoinEntry[]): Observable<RatePanelData[]> {
    const coins = entries.map((entry) => `${entry.coinId}|${entry.symbol}`).join(',');

    return this.http.get<RatePanelData[]>(`${this.apiUrl}/panels/batch`, { params: { coins } }).pipe(
      map((panels) =>
        panels.map((panel) => ({
          ...panel,
          points: [...panel.points],
        }))
      ),
      catchError(() => of(this.placeholderPanelsFor(entries.map((entry) => entry.symbol))))
    );
  }

  getR4v3FeaturedPanel(): Observable<RatePanelData> {
    return this.http.get<RatePanelData>(`${this.apiUrl}/panels/native`).pipe(
      map((panel) => ({
        ...panel,
        points: [...panel.points],
      })),
      catchError(() =>
        of({
          symbol: BRAND_DEFAULT_CRYPTO,
          pair: 'R4V3 / EUR',
          value: '1,00',
          change: '—',
          positive: true,
          points: [42, 44, 43, 46, 45, 48, 47, 50, 49, 52, 51, 53],
        })
      )
    );
  }

  searchCoins(query: string): Observable<CryptoSearchResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return of([]);
    }

    return this.http
      .get<CryptoSearchResult[]>(`${this.apiUrl}/search`, { params: { q: trimmed } })
      .pipe(catchError(() => of([])));
  }

  leftCoinEntries(): RatePanelCoinEntry[] {
    return RATE_PANEL_LEFT_SYMBOLS.map((symbol) => this.entryForSymbol(symbol));
  }

  private entryForSymbol(symbol: string): RatePanelCoinEntry {
    if (symbol.toUpperCase() === BRAND_DEFAULT_CRYPTO) {
      return { coinId: RATE_PANEL_NATIVE_COIN_ID, symbol: BRAND_DEFAULT_CRYPTO };
    }

    const normalized = symbol.toUpperCase() as RatePanelSymbol;
    return {
      coinId: COINGECKO_COIN_IDS[normalized],
      symbol: normalized,
    };
  }

  placeholderPanelsFor(symbols: readonly string[]): RatePanelData[] {
    const flatLine = [42, 44, 43, 46, 45, 48, 47, 50, 49, 52, 51, 53];

    return symbols.map((symbol) => ({
      symbol,
      pair: symbol.toUpperCase() === BRAND_DEFAULT_CRYPTO ? 'R4V3 / EUR' : `${symbol} / R4V3`,
      value: '—',
      change: '—',
      positive: true,
      points: flatLine,
    }));
  }

  placeholderPanels(): RatePanelData[] {
    return this.placeholderPanelsFor(RATE_PANEL_SYMBOLS);
  }
}
