import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject, catchError, forkJoin, of, take } from 'rxjs';

import { Block } from '../models/block.model';
import { NewsDensity, NewsItem, NewsSource } from '../models/showcase.model';
import { BlockchainApiService } from './blockchain-api.service';
import { NewsArrivalFeedbackService } from './news-arrival-feedback.service';
import { ShowcaseApiService } from './showcase-api.service';

const READ_IDS_KEY = 'dartchain-news-read-ids';
const DENSITY_KEY = 'dartchain-news-density';
const NEWS_PAGE_SIZE = 10;

export type ChainLiveTone = 'offline' | 'active' | 'pending';

@Injectable({ providedIn: 'root' })
export class ShowcaseNewsStateService {
  private readonly api = inject(ShowcaseApiService);
  private readonly blockchain = inject(BlockchainApiService);
  private readonly newsFeedback = inject(NewsArrivalFeedbackService);

  private readonly readIds = signal<Set<string>>(this.loadReadIds());
  private readonly knownIds = signal<Set<string>>(new Set());
  /** IDs déjà entendus / vus en session — ne rétrécit jamais (évite bip permanent sur refresh). */
  private readonly heardIds = signal<Set<string>>(new Set());
  private readonly refreshRequested = new Subject<void>();
  private readonly categoryChanged = new Subject<string>();
  private lastChainSyncAt = 0;
  private static readonly CHAIN_SYNC_MIN_GAP_MS = 12_000;

  readonly density = signal<NewsDensity>(this.loadDensity());
  readonly unreadCount = signal(0);
  readonly newItemsToast = signal(false);
  readonly feedItems = signal<NewsItem[]>([]);
  readonly liveActivity = signal('');
  readonly lastUpdatedAt = signal<Date | null>(null);
  readonly loading = signal(false);
  readonly feedError = signal(false);
  readonly categories = signal<string[]>(['all']);
  readonly activeCategory = signal('all');
  readonly sourceFilter = signal<NewsSource | 'all'>('all');
  readonly chainLiveTone = signal<ChainLiveTone>('active');
  readonly latestBlockIndex = signal<number | null>(null);
  readonly latestBlockTimestamp = signal<number | null>(null);
  readonly refreshPulse = signal(false);
  readonly hasMore = signal(false);
  readonly featuredId = signal<string | null>(null);

  readonly refresh$ = this.refreshRequested.asObservable();
  readonly categoryChange$ = this.categoryChanged.asObservable();

  readonly hasUnread = computed(() => this.unreadCount() > 0);

  readonly unreadPreviews = computed(() => {
    const items = this.feedItems();
    const unread = items.filter((item) => !this.readIds().has(item.id));
    const source = unread.length > 0 ? unread : items;
    return source.slice(0, 2);
  });

  readonly liveAgeLabel = computed(() => {
    const updated = this.lastUpdatedAt();
    if (!updated) {
      return '';
    }

    const seconds = Math.floor((Date.now() - updated.getTime()) / 1000);
    if (seconds < 5) {
      return "à l'instant";
    }
    if (seconds < 60) {
      return `il y a ${seconds} s`;
    }

    return `il y a ${Math.floor(seconds / 60)} min`;
  });

  readonly latestItemAgeLabel = computed(() => {
    const previews = this.unreadPreviews();
    if (previews.length > 0 && previews[0].relativeTime) {
      return previews[0].relativeTime;
    }

    const items = this.feedItems();
    if (items.length > 0 && items[0].relativeTime) {
      return items[0].relativeTime;
    }

    return this.liveAgeLabel();
  });

  readonly chainStatusPrimary = computed(() => {
    const index = this.latestBlockIndex();
    const tone = this.chainLiveTone();

    if (index !== null) {
      const toneLabel =
        tone === 'pending'
          ? 'attente'
          : tone === 'offline'
            ? 'off'
            : 'sync';
      return `#${index} · ${toneLabel}`;
    }

    const activity = this.liveActivity();
    if (activity) {
      return activity.length > 18 ? `${activity.slice(0, 16)}…` : activity;
    }

    return 'Hors ligne';
  });

  readonly chainStatusTooltip = computed(() => {
    const updated = this.lastUpdatedAt();
    const blockTs = this.latestBlockTimestamp();
    const parts: string[] = [];

    if (updated) {
      const syncSeconds = Math.floor((Date.now() - updated.getTime()) / 1000);
      parts.push(`sync ${this.formatAgeShort(syncSeconds)}`);
    }

    if (blockTs) {
      const blockSeconds = Math.floor((Date.now() - blockTs) / 1000);
      parts.push(`bloc ${this.formatAgeShort(blockSeconds)}`);
    }

    return parts.join(' · ');
  });

  readonly collapsedPrimaryItem = computed(() => {
    const items = this.feedItems();
    if (items.length === 0) {
      return null;
    }

    const unread = items.filter((item) => !this.readIds().has(item.id));
    return unread.length > 0 ? unread[0] : items[0];
  });

  readonly collapsedHeadlineTitle = computed(() => {
    const item = this.collapsedPrimaryItem();
    if (item) {
      return item.title;
    }

    if (this.loading()) {
      return '';
    }

    return this.liveActivity() || 'Aucune actualité';
  });

  readonly collapsedHeadlineAge = computed(() => {
    const item = this.collapsedPrimaryItem();
    return item?.relativeTime ?? '';
  });

  readonly collapsedCategoryIcon = computed(() => {
    const item = this.collapsedPrimaryItem();
    if (!item) {
      return '•';
    }

    return this.categoryIcon(item.category);
  });

  readonly collapsedCategoryLabel = computed(() => {
    const item = this.collapsedPrimaryItem();
    if (!item) {
      return '';
    }

    return this.categoryLabel(item.category);
  });

  readonly chainStatusChip = computed(() => {
    const index = this.latestBlockIndex();
    if (index === null) {
      return '—';
    }

    return `Bloc ${index}`;
  });

  /** @deprecated Prefer collapsedHeadlineTitle + collapsedHeadlineAge */
  readonly collapsedPreviewHeadline = computed(() => this.collapsedHeadlineTitle());

  isUnread(id: string): boolean {
    return !this.readIds().has(id);
  }

  markRead(id: string): void {
    if (!id || this.readIds().has(id)) {
      return;
    }

    const next = new Set(this.readIds());
    next.add(id);
    this.readIds.set(next);
    this.persistReadIds(next);
    this.unreadCount.set(
      [...this.knownIds()].filter((knownId) => !next.has(knownId)).length
    );
  }

  markAllRead(ids: string[]): void {
    const next = new Set(this.readIds());
    ids.forEach((id) => next.add(id));
    this.readIds.set(next);
    this.persistReadIds(next);
    this.unreadCount.set(0);
    this.newItemsToast.set(false);
  }

  setDensity(density: NewsDensity): void {
    this.density.set(density);
    localStorage.setItem(DENSITY_KEY, density);
  }

  syncFeedItems(items: NewsItem[], append: boolean): void {
    const incomingIds = items.map((item) => item.id);
    const known = this.knownIds();
    const heard = this.heardIds();
    const wasHeard = heard.size > 0;
    const hasBrandNew = incomingIds.some((id) => !heard.has(id));

    const mergedKnown = append
      ? new Set([...known, ...incomingIds])
      : new Set(incomingIds);

    this.knownIds.set(mergedKnown);
    this.heardIds.set(new Set([...heard, ...incomingIds]));
    this.unreadCount.set([...mergedKnown].filter((id) => !this.readIds().has(id)).length);
    this.newItemsToast.set(hasBrandNew && !append);

    if (wasHeard && hasBrandNew) {
      this.newsFeedback.notifyNewItems();
      this.triggerRefreshPulse();
    }

    if (!append) {
      this.feedItems.set(items);
    } else {
      this.feedItems.update((current) => {
        const byId = new Map(current.map((item) => [item.id, item]));
        items.forEach((item) => byId.set(item.id, item));
        return [...byId.values()];
      });
    }
  }

  setLiveActivity(value: string): void {
    this.liveActivity.set(value);

    const parsed = this.parseBlockIndexFromLive(value);
    if (parsed !== null) {
      this.latestBlockIndex.set(parsed);
    }
  }

  setLastUpdatedAt(value: Date | null): void {
    this.lastUpdatedAt.set(value);
  }

  setLoading(value: boolean): void {
    this.loading.set(value);
  }

  requestRefresh(): void {
    this.refreshFeed(true);
  }

  ensureFeedLoaded(): void {
    if (this.feedItems().length === 0 && !this.loading()) {
      this.refreshFeed(true);
    }
  }

  refreshFeed(showLoading = true, source?: NewsSource | 'all'): void {
    if (showLoading) {
      this.setLoading(true);
      this.triggerRefreshPulse();
    }
    this.feedError.set(false);

    const category = this.activeCategory();
    const resolvedSource = source ?? this.sourceFilter();

    this.api
      .getNewsFeed({
        category: category === 'all' ? undefined : category,
        source: resolvedSource,
        limit: NEWS_PAGE_SIZE,
        offset: 0,
      })
      .pipe(take(1))
      .subscribe({
        next: (feed) => {
          this.setCategories(feed.categories);
          this.hasMore.set(feed.hasMore);
          this.featuredId.set(feed.featuredId);
          this.setLiveActivity(feed.liveActivity);
          const updated = feed.lastRefreshedAt
            ? new Date(feed.lastRefreshedAt)
            : new Date();
          this.setLastUpdatedAt(updated);
          this.syncFeedItems(feed.items, false);

          if (this.newItemsToast()) {
            this.dismissNewItemsToast();
            this.triggerRefreshPulse();
          }

          this.setLoading(false);
          this.syncChainLiveStatus();
          this.refreshRequested.next();
        },
        error: () => {
          this.feedError.set(true);
          this.setLoading(false);
          this.chainLiveTone.set('offline');
          this.latestBlockIndex.set(null);
        },
      });
  }

  setCategories(categories: string[]): void {
    const next = ['all', ...categories.filter((category) => category !== 'all')];
    this.categories.set(next);
  }

  syncCategoryForTab(category: string): void {
    if (this.activeCategory() === category) {
      return;
    }

    this.activeCategory.set(category);
  }

  selectCategory(category: string): void {
    if (this.activeCategory() === category) {
      return;
    }

    this.activeCategory.set(category);
    this.categoryChanged.next(category);
  }

  setSourceFilter(source: NewsSource | 'all'): void {
    this.sourceFilter.set(source);
  }

  categoryLabel(category: string): string {
    if (category === 'all') {
      return 'Tous';
    }

    if (category.toLowerCase() === 'écosystème') {
      return 'D.A.O';
    }

    return category;
  }

  categoryIcon(category: string): string {
    switch (category.toLowerCase()) {
      case 'réseau':
        return '⛓';
      case 'r4v3':
        return '◆';
      case 'peers':
        return '◎';
      case 'écosystème':
      case 'd.a.o':
        return '✦';
      default:
        return '•';
    }
  }

  dismissNewItemsToast(): void {
    this.newItemsToast.set(false);
  }

  chainLiveToneClass(): string {
    return `showcase-meta__live-dot showcase-meta__live-dot--${this.chainLiveTone()}`;
  }

  private syncChainLiveStatus(force = false): void {
    const now = Date.now();
    if (!force && now - this.lastChainSyncAt < ShowcaseNewsStateService.CHAIN_SYNC_MIN_GAP_MS) {
      return;
    }

    this.lastChainSyncAt = now;

    if (this.feedError()) {
      this.chainLiveTone.set('offline');
      this.latestBlockIndex.set(null);
      return;
    }

    forkJoin({
      blocks: this.blockchain.getBlocks().pipe(catchError(() => of([] as Block[]))),
      pending: this.blockchain.getPendingTransactions().pipe(catchError(() => of([]))),
    })
      .pipe(take(1))
      .subscribe({
        next: ({ blocks, pending }) => {
          const latestBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
          const latest = latestBlock?.index ?? null;
          this.latestBlockIndex.set(latest);
          this.latestBlockTimestamp.set(latestBlock?.timestamp ?? null);

          if (pending.length > 0) {
            this.chainLiveTone.set('pending');
            return;
          }

          if (latest !== null) {
            this.chainLiveTone.set('active');
            return;
          }

          this.chainLiveTone.set('pending');
        },
        error: () => {
          this.chainLiveTone.set('offline');
          this.latestBlockIndex.set(null);
          this.latestBlockTimestamp.set(null);
        },
      });
  }

  private triggerRefreshPulse(): void {
    this.refreshPulse.set(true);
    window.setTimeout(() => this.refreshPulse.set(false), 1_100);
  }

  private formatAgeShort(seconds: number): string {
    if (seconds < 5) {
      return "à l'instant";
    }
    if (seconds < 60) {
      return `${seconds}s`;
    }
    if (seconds < 3_600) {
      return `${Math.floor(seconds / 60)}min`;
    }
    return `${Math.floor(seconds / 3_600)}h`;
  }

  private parseBlockIndexFromLive(activity: string): number | null {
    const match = /Bloc #(\d+)/i.exec(activity);
    if (!match) {
      return null;
    }

    const index = Number.parseInt(match[1], 10);
    return Number.isNaN(index) ? null : index;
  }

  private loadReadIds(): Set<string> {
    try {
      const raw = localStorage.getItem(READ_IDS_KEY);
      if (!raw) {
        return new Set();
      }
      const parsed = JSON.parse(raw) as string[];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }

  private persistReadIds(ids: Set<string>): void {
    localStorage.setItem(READ_IDS_KEY, JSON.stringify([...ids]));
  }

  private loadDensity(): NewsDensity {
    const value = localStorage.getItem(DENSITY_KEY);
    return value === 'compact' ? 'compact' : 'comfort';
  }
}
