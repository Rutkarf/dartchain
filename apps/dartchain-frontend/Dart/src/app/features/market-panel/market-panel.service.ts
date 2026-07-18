import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, map, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ChartRange, LaunchProject } from '../../core/models/showcase.model';
import { CryptoRatesService, MarketChartData } from '../../core/services/crypto-rate.service';
import { BlockchainApiService } from '../../core/services/blockchain-api.service';
import { ShowcaseApiService } from '../../core/services/showcase-api.service';
import { EXCHANGE_NATIVE_TOKEN } from '../../core/constants/exchange-launchpad.constants';
import {
  MARKET_ASSETS,
  MARKET_FAVORITES_STORAGE_KEY,
  MARKET_SESSION_STORAGE_KEY,
  MarketAssetConfig,
} from './market-panel.constants';
import {
  MarketAssetMetrics,
  MarketAssetRow,
  MarketAssetRowCore,
  MarketFeaturedChart,
  MarketMomentum,
  MarketSessionState,
} from './market-panel.model';

const LAUNCH_TOKEN_EUR_FALLBACK = 0.05;

@Injectable({ providedIn: 'root' })
export class MarketPanelService {
  private readonly cryptoRates = inject(CryptoRatesService);
  private readonly api = inject(BlockchainApiService);
  private readonly showcaseApi = inject(ShowcaseApiService);

  loadAssetRows(
    favorites: ReadonlySet<string>,
    walletAddress?: string,
    recentTradeCounts?: Readonly<Record<string, number>>
  ): Observable<MarketAssetRow[]> {
    const launchAssets = MARKET_ASSETS.filter((config) => !config.native);

    return forkJoin({
      r4v3Chart: this.fetchChart(MARKET_ASSETS[0], '24h'),
      r4v3Panel: this.api
        .getExchangePanel({
          walletAddress: walletAddress || undefined,
          fromToken: EXCHANGE_NATIVE_TOKEN,
          toToken: 'PXD',
        })
        .pipe(catchError(() => of(null))),
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
                balance: panel.toBalance ?? 0,
              })),
              catchError(() => of({ config, rate: null as number | null, balance: 0 }))
            )
        )
      ),
      launchProjects: this.showcaseApi.getLaunchProjects().pipe(catchError(() => of([]))),
    }).pipe(
      map(({ r4v3Chart, r4v3Panel, launchRates, launchProjects }) => {
        const projectBySymbol = this.indexLaunchProjects(launchProjects);

        return MARKET_ASSETS.map((config) => {
          const launchProject = projectBySymbol.get(config.exchangeToken.toUpperCase()) ?? null;
          const tradeCount = recentTradeCounts?.[config.exchangeToken] ?? 0;

          if (config.native) {
            return this.enrichRow(
              this.toRow(
                config,
                r4v3Chart,
                favorites.has(config.exchangeToken),
                r4v3Panel?.fromBalance,
                r4v3Panel?.rate ?? null
              ),
              launchProject,
              r4v3Chart,
              tradeCount
            );
          }

          const launchRate = launchRates.find(
            (entry) => entry.config.exchangeToken === config.exchangeToken
          );

          return this.enrichRow(
            this.toLaunchRow(
              config,
              launchRate?.rate ?? null,
              r4v3Chart,
              favorites.has(config.exchangeToken),
              launchRate?.balance
            ),
            launchProject,
            r4v3Chart,
            tradeCount
          );
        });
      }),
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

  readSession(): MarketSessionState {
    if (typeof localStorage === 'undefined') {
      return {};
    }

    try {
      const raw = localStorage.getItem(MARKET_SESSION_STORAGE_KEY);
      if (!raw) {
        return {};
      }

      return JSON.parse(raw) as MarketSessionState;
    } catch {
      return {};
    }
  }

  writeSession(state: MarketSessionState): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(MARKET_SESSION_STORAGE_KEY, JSON.stringify(state));
  }

  private indexLaunchProjects(projects: LaunchProject[]): Map<string, LaunchProject> {
    const map = new Map<string, LaunchProject>();
    for (const project of projects) {
      map.set(project.symbol.toUpperCase(), project);
    }
    return map;
  }

  private enrichRow(
    row: MarketAssetRowCore,
    launchProject: LaunchProject | null,
    r4v3Chart: MarketChartData | null,
    recentTradeCount: number
  ): MarketAssetRow {
    return {
      ...row,
      launchProject,
      createdAtMs: this.resolveCreatedAtMs(row.config, launchProject),
      metrics: this.buildMetrics(row, launchProject, r4v3Chart, recentTradeCount),
    };
  }

  private resolveCreatedAtMs(
    config: MarketAssetConfig,
    launchProject: LaunchProject | null
  ): number {
    if (launchProject?.launchDate) {
      const parsed = Date.parse(launchProject.launchDate);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    const index = MARKET_ASSETS.findIndex(
      (asset) => asset.exchangeToken === config.exchangeToken
    );
    const rank = index >= 0 ? index : 0;
    return Date.now() - (MARKET_ASSETS.length - rank) * 86_400_000 * 7;
  }

  private buildMetrics(
    row: MarketAssetRowCore,
    launchProject: LaunchProject | null,
    r4v3Chart: MarketChartData | null,
    recentTradeCount: number
  ): MarketAssetMetrics {
    const momentum = this.resolveMomentum(row.changePercent);
    const progressPercent = launchProject ? this.progressPercent(launchProject) : null;
    const rate = row.rate ?? null;

    const volumeLabel =
      row.config.native && r4v3Chart?.volume
        ? r4v3Chart.volume
        : row.volume && row.volume !== 'LaunchLab'
          ? row.volume
          : launchProject?.raised && launchProject.raised !== '—'
            ? launchProject.raised
            : '—';

    const liquidityLabel =
      rate && rate > 0
        ? `${this.formatCompactNumber(rate * 1250)} R4V3`
        : row.config.native
          ? 'Peg natif'
          : '—';

    const marketCapLabel = launchProject
      ? launchProject.target && launchProject.target !== '—'
        ? `${launchProject.raised} / ${launchProject.target}`
        : launchProject.raised
      : row.config.native
        ? 'Peg CHF/GBP'
        : '—';

    const holdersLabel = this.estimateHolders(row.config.exchangeToken, launchProject);
    const tokenAgeLabel = this.tokenAgeLabel(launchProject);
    const recentActivityLabel =
      recentTradeCount > 0
        ? `${recentTradeCount} swap${recentTradeCount > 1 ? 's' : ''} récent${recentTradeCount > 1 ? 's' : ''}`
        : 'Calme';

    return {
      volumeLabel,
      liquidityLabel,
      marketCapLabel,
      momentum,
      momentumLabel: this.momentumLabel(momentum),
      holdersLabel,
      tokenAgeLabel,
      recentActivityLabel,
      progressPercent,
      creatorLabel: launchProject ? `LaunchLab · ${launchProject.chain ?? 'R4V3'}` : 'DartChain',
      statusLabel: launchProject?.status ?? (row.config.native ? 'LIVE' : 'LIVE'),
      logoUrl: launchProject?.logoUrl ?? null,
      description: launchProject?.description ?? null,
      launchDate: launchProject?.launchDate ?? null,
    };
  }

  private resolveMomentum(changePercent: number): MarketMomentum {
    const abs = Math.abs(changePercent);
    if (abs >= 3) {
      return 'hot';
    }
    if (abs >= 1) {
      return 'warm';
    }
    if (abs >= 0.2) {
      return 'neutral';
    }
    return 'cool';
  }

  private momentumLabel(momentum: MarketMomentum): string {
    switch (momentum) {
      case 'hot':
        return 'Fort momentum';
      case 'warm':
        return 'Momentum';
      case 'neutral':
        return 'Stable';
      default:
        return 'Calme';
    }
  }

  private estimateHolders(symbol: string, project: LaunchProject | null): string {
    const raised = this.parseAmount(project?.raised);
    if (raised != null && raised > 0) {
      return this.formatCompactNumber(Math.max(24, Math.round(raised / 42)));
    }

    let seed = 0;
    for (let index = 0; index < symbol.length; index += 1) {
      seed += symbol.charCodeAt(index);
    }

    return this.formatCompactNumber(120 + (seed % 1800));
  }

  private tokenAgeLabel(project: LaunchProject | null): string {
    if (!project?.launchDate) {
      return 'LaunchLab';
    }

    const launched = Date.parse(project.launchDate);
    if (!Number.isFinite(launched)) {
      return project.launchDate;
    }

    const days = Math.max(1, Math.floor((Date.now() - launched) / 86_400_000));
    if (days < 30) {
      return `${days}j`;
    }

    const months = Math.floor(days / 30);
    return `${months} mois`;
  }

  private progressPercent(project: LaunchProject): number | null {
    const raised = this.parseAmount(project.raised);
    const target = this.parseAmount(project.target);
    if (raised === null || target === null || target <= 0) {
      return null;
    }

    return Math.min(100, Math.round((raised / target) * 100));
  }

  private parseAmount(value: string | null | undefined): number | null {
    if (!value || value === '—') {
      return null;
    }

    const normalized = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private formatCompactNumber(value: number): string {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}k`;
    }
    return value.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
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
    favorite: boolean,
    walletBalance?: number
  ): MarketAssetRowCore {
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
        walletBalance,
        rate,
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
      walletBalance,
      rate,
    };
  }

  private toRow(
    config: MarketAssetConfig,
    chart: MarketChartData | null,
    favorite: boolean,
    walletBalance?: number,
    rate?: number | null
  ): MarketAssetRowCore {
    if (!chart) {
      return { ...this.fallbackRow(config, favorite), walletBalance, rate: rate ?? null };
    }

    return {
      config,
      price: chart.currentPrice,
      changePercent: chart.changePercent,
      positive: chart.positive,
      volume: chart.volume || '—',
      favorite,
      priceUnavailable: false,
      walletBalance,
      rate: rate ?? null,
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
    return MARKET_ASSETS.map((config) => {
      const row = this.fallbackRow(config, favorites.has(config.exchangeToken));
      return this.enrichRow(row, null, null, 0);
    });
  }

  private fallbackRow(
    config: MarketAssetConfig,
    favorite: boolean
  ): MarketAssetRowCore {
    const samples: Record<string, Omit<MarketAssetRowCore, 'config' | 'favorite'>> = {
      R4V3: {
        price: '1,00 CHF',
        changePercent: 0,
        positive: true,
        volume: 'Peg CHF/GBP',
        priceUnavailable: false,
        rate: 1,
      },
      PXD: {
        price: '0,05 €',
        changePercent: 1.8,
        positive: true,
        volume: 'LaunchLab',
        priceUnavailable: true,
        rate: 20,
      },
      NVFI: {
        price: '0,05 €',
        changePercent: 0.4,
        positive: true,
        volume: 'LaunchLab',
        priceUnavailable: true,
        rate: 18,
      },
      LAB3: {
        price: '0,05 €',
        changePercent: 0,
        positive: true,
        volume: 'LaunchLab',
        priceUnavailable: true,
        rate: 16,
      },
      ORB: {
        price: '0,05 €',
        changePercent: 0.2,
        positive: true,
        volume: 'LaunchLab',
        priceUnavailable: true,
        rate: 22,
      },
    };

    const sample = samples[config.exchangeToken] ?? {
      price: '—',
      changePercent: 0,
      positive: true,
      volume: '—',
      priceUnavailable: true,
      rate: null,
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
