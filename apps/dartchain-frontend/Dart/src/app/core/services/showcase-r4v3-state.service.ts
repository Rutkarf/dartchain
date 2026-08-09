import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, take } from 'rxjs';

import {
  NewsItem,
  NewsSource,
  R4v3ShowcaseResponse,
  R4v3SwapStats,
  R4v3TokenQuote,
} from '../models/showcase.model';
import { R4V3_PEG_LABEL } from '../constants/r4v3-token.constants';
import { R4v3SystemStatus } from '../models/r4v3-hub.model';
import { RatePanelData } from './crypto-rate.service';
import { ShowcaseApiService } from './showcase-api.service';
import { ShowcaseNewsStateService } from './showcase-news-state.service';

const R4V3_PAGE_SIZE = 10;

@Injectable({ providedIn: 'root' })
export class ShowcaseR4v3StateService {
  private readonly api = inject(ShowcaseApiService);
  private readonly newsState = inject(ShowcaseNewsStateService);
  private readonly refreshRequested = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal(false);
  readonly items = signal<NewsItem[]>([]);
  readonly panel = signal<RatePanelData | null>(null);
  readonly launchTokens = signal<R4v3TokenQuote[]>([]);
  readonly swapStats = signal<R4v3SwapStats | null>(null);
  readonly ratesLatencyMs = signal<number | null>(null);
  readonly lastUpdatedAt = signal<Date | null>(null);
  readonly hasMore = signal(false);
  readonly sourceFilter = signal<NewsSource | 'all'>('all');
  readonly searchQuery = signal('');
  readonly debouncedSearchQuery = signal('');
  readonly refreshPulse = signal(false);
  readonly refreshing = signal(false);

  readonly refresh$ = this.refreshRequested.asObservable();

  readonly systemStatus = computed((): R4v3SystemStatus => {
    if (this.error()) {
      return 'incident';
    }

    if (this.loading() || this.refreshing()) {
      return 'degraded';
    }

    const latency = this.ratesLatencyMs();
    if (latency != null && latency > 450) {
      return 'degraded';
    }

    if (!this.panel()) {
      return 'degraded';
    }

    return 'ok';
  });

  readonly pegDisplayLabel = computed(() => {
    const panel = this.panel();
    if (panel?.pair?.toUpperCase().includes('CHF')) {
      return R4V3_PEG_LABEL;
    }

    if (panel?.pair?.trim()) {
      return panel.pair.replace(/\s*\/\s*/g, ' = ').replace(/^R4V3/, '1 R4V3');
    }

    return R4V3_PEG_LABEL;
  });

  readonly liveValueLabel = computed(() => this.panel()?.value ?? '…');
  readonly liveChangeLabel = computed(() => this.panel()?.change ?? '…');
  readonly liveChangePositive = computed(() => this.panel()?.positive ?? true);

  readonly filteredItems = computed(() => {
    const query = this.debouncedSearchQuery().trim().toLowerCase();
    if (!query) {
      return this.items();
    }

    return this.items().filter((item) => this.itemMatchesQuery(item, query));
  });

  readonly unreadCount = computed(() =>
    this.items().filter((item) => this.newsState.isUnread(item.id)).length
  );

  readonly headline = computed(() => {
    const quote = this.panel();
    if (!quote) {
      return 'R4V3';
    }

    const trend = quote.positive ? '▲' : '▼';
    return `${quote.value} ${trend} ${quote.change}`;
  });

  readonly previewText = computed(() => {
    const items = this.filteredItems();
    if (items.length === 0) {
      return this.headline();
    }

    const first = items[0];
    return first.relativeTime ? `${first.title} · ${first.relativeTime}` : first.title;
  });

  readonly updatedAgeLabel = computed(() => {
    const updated = this.lastUpdatedAt();
    if (!updated) {
      return '';
    }

    const seconds = Math.floor((Date.now() - updated.getTime()) / 1000);
    if (seconds < 5) {
      return "à l'instant";
    }
    if (seconds < 60) {
      return `il y a ${seconds}s`;
    }

    return `il y a ${Math.floor(seconds / 60)}min`;
  });

  readonly collapsedSubline = computed(() => {
    const quote = this.panel();
    const parts: string[] = ['Hub R4V3'];

    if (quote) {
      parts.push(`${quote.value} ${quote.change}`);
    }

    return parts.join(' · ');
  });

  constructor() {
    this.searchInput$
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe((query) => {
        this.debouncedSearchQuery.set(query);
        this.ensureSearchCoverage();
      });
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchInput$.next(value);
  }

  cycleSourceFilter(): void {
    const order: Array<NewsSource | 'all'> = ['all', 'CHAIN', 'EDITORIAL'];
    const index = order.indexOf(this.sourceFilter());
    this.setSourceFilter(order[(index + 1) % order.length]);
  }

  setSourceFilter(source: NewsSource | 'all'): void {
    if (this.sourceFilter() === source) {
      return;
    }

    this.sourceFilter.set(source);
    this.load(true);
  }

  sourceFilterIcon(): string {
    switch (this.sourceFilter()) {
      case 'CHAIN':
        return '⛓';
      case 'EDITORIAL':
        return '✎';
      default:
        return '⛓✎';
    }
  }

  sourceFilterLabel(): string {
    switch (this.sourceFilter()) {
      case 'CHAIN':
        return 'On-chain';
      case 'EDITORIAL':
        return 'Édito';
      default:
        return 'Toutes';
    }
  }

  requestRefresh(): void {
    this.refreshRequested.next();
  }

  refresh(): void {
    this.load(true, false, false, true);
  }

  load(
    showLoading = true,
    append = false,
    forSearch = false,
    manualRefresh = false
  ): void {
    if (manualRefresh) {
      this.refreshing.set(true);
      this.triggerRefreshPulse();
    }

    if (showLoading && !append) {
      this.loading.set(true);
    }
    if (append) {
      this.loadingMore.set(true);
    }
    this.error.set(false);

    const previousFeatured = this.items()[0]?.id ?? null;

    this.api
      .getR4v3Dashboard({
        category: 'R4V3',
        source: this.sourceFilter(),
        limit: R4V3_PAGE_SIZE,
        offset: append ? this.items().length : 0,
      })
      .pipe(take(1))
      .subscribe({
        next: (payload) => {
          if (!payload) {
            this.error.set(true);
            this.loading.set(false);
            this.loadingMore.set(false);
            this.refreshing.set(false);
            return;
          }

          this.applyPayload(payload, append, previousFeatured);
          this.loading.set(false);
          this.loadingMore.set(false);
          this.refreshing.set(false);

          if (manualRefresh) {
            this.triggerRefreshPulse();
          }

          if (!append) {
            this.ensureSearchCoverage();
          } else if (forSearch) {
            this.ensureSearchCoverage();
          }
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
          this.loadingMore.set(false);
          this.refreshing.set(false);
        },
      });
  }

  loadMore(forSearch = false): void {
    if (!this.hasMore() || this.loadingMore()) {
      return;
    }

    this.load(false, true, forSearch);
  }

  prependNewsItem(item: NewsItem): void {
    const exists = this.items().some((entry) => entry.id === item.id);
    if (exists) {
      return;
    }

    this.items.update((current) => [item, ...current]);
    this.triggerRefreshPulse();
  }

  private applyPayload(
    payload: R4v3ShowcaseResponse,
    append: boolean,
    previousFeatured: string | null
  ): void {
    this.panel.set({
      symbol: payload.panel.symbol,
      pair: payload.panel.pair,
      value: payload.panel.value,
      change: payload.panel.change,
      positive: payload.panel.positive,
      points: [...payload.panel.points],
    });
    this.launchTokens.set(payload.launchTokens ?? []);
    this.swapStats.set(payload.swapStats ?? null);
    this.ratesLatencyMs.set(payload.ratesLatencyMs ?? null);
    this.hasMore.set(payload.news.hasMore);

    const mergedItems = append
      ? this.mergeItems(this.items(), payload.news.items)
      : payload.news.items;

    this.items.set(mergedItems);
    this.lastUpdatedAt.set(new Date(payload.lastRefreshedAt || Date.now()));

    const nextFeatured = payload.news.featuredId ?? mergedItems[0]?.id ?? null;
    if (!append && nextFeatured && nextFeatured !== previousFeatured) {
      this.triggerRefreshPulse();
    }
  }

  private mergeItems(current: NewsItem[], incoming: NewsItem[]): NewsItem[] {
    const byId = new Map(current.map((item) => [item.id, item]));
    incoming.forEach((item) => byId.set(item.id, item));
    return [...byId.values()];
  }

  private ensureSearchCoverage(): void {
    const query = this.debouncedSearchQuery().trim().toLowerCase();
    if (!query || !this.hasMore() || this.loadingMore()) {
      return;
    }

    const hasMatch = this.items().some((item) => this.itemMatchesQuery(item, query));
    if (!hasMatch) {
      this.loadMore(true);
    }
  }

  private itemMatchesQuery(item: NewsItem, query: string): boolean {
    return (
      item.title.toLowerCase().includes(query) ||
      item.summary.toLowerCase().includes(query) ||
      item.body.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  }

  private triggerRefreshPulse(): void {
    this.refreshPulse.set(true);
    window.setTimeout(() => this.refreshPulse.set(false), 1_100);
  }
}
