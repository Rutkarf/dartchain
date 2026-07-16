import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import {
  MARKET_ALERTS_STORAGE_KEY,
  MARKET_AUTO_REFRESH_MS,
  MARKET_MAX_RECENT_TRADES,
  MARKET_TRADES_STORAGE_KEY,
  MarketAssetConfig,
} from '../../features/market-panel/market-panel.constants';
import {
  MarketFeaturedChart,
  MarketAssetRow,
  MarketPriceAlert,
  MarketRecentTrade,
  MarketSwapCompleteDetail,
} from '../../features/market-panel/market-panel.model';
import { MarketPanelService } from '../../features/market-panel/market-panel.service';
import { ChartRange } from '../models/showcase.model';

@Injectable({ providedIn: 'root' })
export class MarketDataService {
  private static readonly REFRESH_DEBOUNCE_MS = 500;
  private static readonly RATE_LIMIT_BACKOFF_MS = 60_000;
  private static readonly MIN_REFRESH_GAP_MS = 2_000;

  private readonly marketService = inject(MarketPanelService);

  readonly rows = signal<MarketAssetRow[]>([]);
  readonly featuredChart = signal<MarketFeaturedChart | null>(null);
  readonly loadingRows = signal(false);
  readonly loadingChart = signal(false);
  readonly error = signal<string | null>(null);
  readonly rateLimitedUntil = signal(0);
  readonly recentTrades = signal<MarketRecentTrade[]>([]);
  readonly priceAlerts = signal<MarketPriceAlert[]>([]);
  readonly alertNotifications = signal<string[]>([]);

  private refreshTimerId: number | null = null;
  private pollTimerId: number | null = null;
  private rowsInflight: Promise<void> | null = null;
  private chartInflight: Promise<void> | null = null;
  private lastRowsFetchMs = 0;
  private lastChartFetchMs = 0;
  private started = false;
  private favorites = new Set<string>();
  private walletAddress = '';
  private featuredAsset: MarketAssetConfig | null = null;
  private chartRange: ChartRange = '24h';
  private onSwapComplete = (event: Event): void => {
    const detail = (event as CustomEvent<MarketSwapCompleteDetail>).detail;
    if (!detail?.fromToken || !detail?.toToken) {
      return;
    }

    this.recordTrade({
      id: `${Date.now()}-${detail.fromToken}-${detail.toToken}`,
      fromToken: detail.fromToken,
      toToken: detail.toToken,
      amountIn: detail.amountIn,
      amountOut: detail.amountOut,
      at: Date.now(),
    });
    void this.refreshRows(true);
  };

  init(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    this.recentTrades.set(this.readRecentTrades());
    this.priceAlerts.set(this.readPriceAlerts());
    window.addEventListener('market-swap-complete', this.onSwapComplete);

    this.pollTimerId = window.setInterval(() => {
      void this.refreshAll(false);
    }, MARKET_AUTO_REFRESH_MS);
  }

  destroy(): void {
    window.removeEventListener('market-swap-complete', this.onSwapComplete);
    if (this.pollTimerId !== null) {
      window.clearInterval(this.pollTimerId);
      this.pollTimerId = null;
    }
    if (this.refreshTimerId !== null) {
      window.clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }

  configureContext(
    favorites: ReadonlySet<string>,
    walletAddress: string,
    featuredAsset: MarketAssetConfig,
    chartRange: ChartRange
  ): void {
    this.favorites = new Set(favorites);
    this.walletAddress = walletAddress;
    this.featuredAsset = featuredAsset;
    this.chartRange = chartRange;
  }

  scheduleRefresh(force = false): void {
    if (this.refreshTimerId !== null) {
      window.clearTimeout(this.refreshTimerId);
    }

    this.refreshTimerId = window.setTimeout(() => {
      this.refreshTimerId = null;
      void this.refreshAll(force);
    }, MarketDataService.REFRESH_DEBOUNCE_MS);
  }

  async refreshAll(force = false): Promise<void> {
    await Promise.all([this.refreshRows(force), this.refreshFeatured(force)]);
  }

  async refreshRows(force = false): Promise<void> {
    if (this.isRateLimited()) {
      this.error.set(this.rateLimitMessage());
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastRowsFetchMs < MarketDataService.MIN_REFRESH_GAP_MS) {
      return;
    }

    if (this.rowsInflight && !force) {
      return this.rowsInflight;
    }

    this.loadingRows.set(true);
    this.rowsInflight = (async () => {
      try {
        const previous = this.rows();
        const next = await firstValueFrom(
          this.marketService.loadAssetRows(this.favorites, this.walletAddress || undefined)
        );
        this.rows.set(next);
        this.checkPriceAlerts(previous, next);
        this.error.set(null);
        this.lastRowsFetchMs = Date.now();
      } catch (error) {
        this.handleRateLimit(error);
        if (!this.isRateLimited()) {
          this.error.set('Cours indisponibles — réessayez ↻');
        }
      } finally {
        this.loadingRows.set(false);
        this.rowsInflight = null;
      }
    })();

    return this.rowsInflight;
  }

  async refreshFeatured(force = false): Promise<void> {
    if (!this.featuredAsset) {
      return;
    }

    if (this.isRateLimited()) {
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastChartFetchMs < MarketDataService.MIN_REFRESH_GAP_MS) {
      return;
    }

    if (this.chartInflight && !force) {
      return this.chartInflight;
    }

    this.loadingChart.set(true);
    this.chartInflight = (async () => {
      try {
        const chart = await firstValueFrom(
          this.marketService.loadFeaturedChart(this.featuredAsset!, this.chartRange)
        );
        this.featuredChart.set(chart);
        this.lastChartFetchMs = Date.now();
      } catch (error) {
        this.handleRateLimit(error);
      } finally {
        this.loadingChart.set(false);
        this.chartInflight = null;
      }
    })();

    return this.chartInflight;
  }

  recordTrade(trade: MarketRecentTrade): void {
    const next = [trade, ...this.recentTrades()].slice(0, MARKET_MAX_RECENT_TRADES);
    this.recentTrades.set(next);
    this.writeRecentTrades(next);
  }

  togglePriceAlert(token: string, enabled: boolean, thresholdPercent?: number): void {
    const normalized = token.trim().toUpperCase();
    const current = this.priceAlerts().filter((entry) => entry.token !== normalized);
    if (enabled) {
      current.push({
        token: normalized,
        enabled: true,
        thresholdPercent: thresholdPercent ?? 5,
      });
    }
    this.priceAlerts.set(current);
    this.writePriceAlerts(current);
  }

  isAlertEnabled(token: string): boolean {
    return this.priceAlerts().some(
      (entry) => entry.token === token.trim().toUpperCase() && entry.enabled
    );
  }

  clearAlertNotifications(): void {
    this.alertNotifications.set([]);
  }

  rateLimitCountdownLabel(): string | null {
    const until = this.rateLimitedUntil();
    if (until <= Date.now()) {
      return null;
    }

    const seconds = Math.ceil((until - Date.now()) / 1000);
    return `Pause ${seconds}s`;
  }

  private checkPriceAlerts(previous: MarketAssetRow[], next: MarketAssetRow[]): void {
    const alerts = this.priceAlerts().filter((entry) => entry.enabled);
    if (!alerts.length) {
      return;
    }

    const notifications: string[] = [];
    for (const alert of alerts) {
      const row = next.find((entry) => entry.config.exchangeToken === alert.token);
      const prev = previous.find((entry) => entry.config.exchangeToken === alert.token);
      if (!row) {
        continue;
      }

      const delta = prev ? Math.abs(row.changePercent - prev.changePercent) : Math.abs(row.changePercent);
      if (delta >= alert.thresholdPercent) {
        notifications.push(
          `${row.config.displaySymbol} ${row.positive ? '+' : ''}${row.changePercent.toFixed(2)}%`
        );
      }
    }

    if (notifications.length) {
      this.alertNotifications.set(notifications);
    }
  }

  private isRateLimited(): boolean {
    return Date.now() < this.rateLimitedUntil();
  }

  private rateLimitMessage(): string {
    const label = this.rateLimitCountdownLabel();
    return label ? `Trop de requêtes — ${label}` : 'Trop de requêtes — pause d’1 minute.';
  }

  private handleRateLimit(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 429) {
      this.rateLimitedUntil.set(Date.now() + MarketDataService.RATE_LIMIT_BACKOFF_MS);
      this.error.set(this.rateLimitMessage());
    }
  }

  private readRecentTrades(): MarketRecentTrade[] {
    return this.readStorageArray<MarketRecentTrade>(MARKET_TRADES_STORAGE_KEY);
  }

  private writeRecentTrades(trades: MarketRecentTrade[]): void {
    this.writeStorage(MARKET_TRADES_STORAGE_KEY, trades);
  }

  private readPriceAlerts(): MarketPriceAlert[] {
    return this.readStorageArray<MarketPriceAlert>(MARKET_ALERTS_STORAGE_KEY);
  }

  private writePriceAlerts(alerts: MarketPriceAlert[]): void {
    this.writeStorage(MARKET_ALERTS_STORAGE_KEY, alerts);
  }

  private readStorageArray<T>(key: string): T[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  private writeStorage(key: string, value: unknown): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  }
}
