import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  interval,
  forkJoin,
  of,
  catchError,
  take,
} from 'rxjs';

import {
  NewsDensity,
  NewsItem,
  NewsSource,
} from '../../core/models/showcase.model';
import { Block } from '../../core/models/block.model';
import { ShowcaseApiService } from '../../core/services/showcase-api.service';
import { ShowcaseNewsStateService } from '../../core/services/showcase-news-state.service';
import { ShowcaseNavigationService } from '../../core/services/showcase-navigation.service';
import { BlockchainApiService } from '../../core/services/blockchain-api.service';
import { ShowcaseNewsDrawerComponent } from './showcase-news-drawer';

const NEWS_PAGE_SIZE = 10;

export type ChainLiveTone = 'offline' | 'active' | 'pending';

@Component({
  selector: 'app-showcase-news',
  standalone: true,
  imports: [CommonModule, FormsModule, ShowcaseNewsDrawerComponent],
  templateUrl: './showcase-news.html',
  styleUrls: ['./showcase-news.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseNewsComponent {
  @Input() isExpanded = true;

  @HostBinding('class.is-news')
  readonly isNewsHost = true;

  @HostBinding('class.is-expanded')
  get isExpandedClass(): boolean {
    return this.isExpanded;
  }

  @HostBinding('class.is-collapsed')
  get isCollapsedClass(): boolean {
    return !this.isExpanded;
  }

  private readonly api = inject(ShowcaseApiService);
  protected readonly newsState = inject(ShowcaseNewsStateService);
  private readonly nav = inject(ShowcaseNavigationService);
  private readonly blockchain = inject(BlockchainApiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly contentPanel = viewChild<ElementRef<HTMLElement>>('contentPanel');
  private readonly searchInput$ = new Subject<string>();
  private chainSyncTimerId: number | null = null;
  private lastChainSyncAt = 0;
  private static readonly CHAIN_SYNC_MIN_GAP_MS = 12_000;

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal(false);
  readonly items = signal<NewsItem[]>([]);
  readonly sourceFilter = signal<NewsSource | 'all'>('all');
  readonly searchQuery = signal('');
  readonly debouncedSearchQuery = signal('');
  readonly hasMore = signal(false);
  readonly liveActivity = signal('');
  readonly lastUpdatedAt = signal<Date | null>(null);
  readonly featuredId = signal<string | null>(null);
  readonly chainLiveTone = signal<ChainLiveTone>('active');
  readonly latestBlockIndex = signal<number | null>(null);
  readonly latestBlockTimestamp = signal<number | null>(null);
  readonly keyboardFocusIndex = signal(-1);
  readonly refreshPulse = signal(false);
  readonly ageTick = signal(0);

  readonly chainLiveClickable = computed(() => this.latestBlockIndex() !== null);

  readonly selectedItem = signal<NewsItem | null>(null);
  readonly detailItem = signal<NewsItem | null>(null);
  readonly detailLoading = signal(false);

  readonly density = this.newsState.density;

  readonly filteredItems = computed(() => {
    const query = this.debouncedSearchQuery().trim().toLowerCase();
    if (!query) {
      return this.items();
    }

    return this.items().filter((item) => this.itemMatchesQuery(item, query));
  });

  readonly selectedIndex = computed(() => {
    const selected = this.selectedItem();
    if (!selected) {
      return -1;
    }

    return this.filteredItems().findIndex((item) => item.id === selected.id);
  });

  readonly canNavigatePrev = computed(() => this.selectedIndex() > 0);
  readonly canNavigateNext = computed(() => {
    const index = this.selectedIndex();
    return index >= 0 && index < this.filteredItems().length - 1;
  });

  readonly syncAgeShort = computed(() => {
    this.ageTick();
    const updated = this.lastUpdatedAt();
    if (!updated) {
      return '';
    }
    return this.formatAgeShort(Math.floor((Date.now() - updated.getTime()) / 1000));
  });

  readonly blockAgeShort = computed(() => {
    this.ageTick();
    const timestamp = this.latestBlockTimestamp();
    if (!timestamp) {
      return '';
    }
    return this.formatAgeShort(Math.floor((Date.now() - timestamp) / 1000));
  });

  constructor() {
    this.searchInput$
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        this.debouncedSearchQuery.set(query);
        this.ensureSearchCoverage();
      });

    this.loadFeed();

    this.newsState.refresh$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadFeed());

    this.newsState.categoryChange$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.closeItem();
        this.loadFeed();
      });

    interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadFeed(false));

    interval(5_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ageTick.update((value) => value + 1));

    this.blockchain
      .connectLiveUpdates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        if (
          message.type === 'blocks' ||
          message.type === 'pending-transactions' ||
          message.type === 'snapshot'
        ) {
          this.loadFeed(false);
          this.scheduleChainLiveSync();
        }
      });
  }

  protected chainLiveToneClass(): string {
    return `showcase-meta__live-dot showcase-meta__live-dot--${this.chainLiveTone()}`;
  }

  protected refreshAriaLabel(): string {
    const unread = this.newsState.unreadCount();
    if (unread > 0) {
      return `Actualiser les actualités, ${unread} non lue${unread > 1 ? 's' : ''}`;
    }
    return 'Actualiser les actualités';
  }

  protected openLatestBlock(): void {
    const index = this.latestBlockIndex();
    if (index === null) {
      return;
    }

    const blockNewsId = `chain-block-${index}`;
    const existing =
      this.items().find((item) => item.id === blockNewsId) ??
      this.items().find(
        (item) =>
          item.actionType === 'VIEW_BLOCK' && item.actionTarget === String(index)
      );

    if (existing) {
      this.openItem(existing);
      return;
    }

    this.api
      .getNewsItem(blockNewsId)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (item) => {
          if (item) {
            this.openItem(item);
            return;
          }
          this.nav.dispatchNewsAction('VIEW_BLOCK', String(index));
        },
        error: () => this.nav.dispatchNewsAction('VIEW_BLOCK', String(index)),
      });
  }

  protected isUnread(item: NewsItem): boolean {
    return this.newsState.isUnread(item.id);
  }

  protected isFeatured(item: NewsItem): boolean {
    return item.featured || item.id === this.featuredId();
  }

  protected categoryIcon(category: string): string {
    switch (category.toLowerCase()) {
      case 'réseau':
        return '⛓';
      case 'r4v3':
        return '◆';
      case 'peers':
        return '◎';
      case 'écosystème':
        return '✦';
      case 'd.a.o':
        return '✦';
      default:
        return '•';
    }
  }

  protected categoryLabel(category: string): string {
    return this.newsState.categoryLabel(category);
  }

  protected selectCategory(category: string): void {
    this.newsState.selectCategory(category);
  }

  protected toggleSourceFilter(): void {
    const order: Array<NewsSource | 'all'> = ['all', 'CHAIN', 'EDITORIAL'];
    const index = order.indexOf(this.sourceFilter());
    this.sourceFilter.set(order[(index + 1) % order.length]);
    this.closeItem();
    this.loadFeed();
  }

  protected sourceFilterLabel(): string {
    switch (this.sourceFilter()) {
      case 'CHAIN':
        return 'On-chain';
      case 'EDITORIAL':
        return 'Édito';
      default:
        return 'Toutes';
    }
  }

  protected sourceFilterIcon(): string {
    switch (this.sourceFilter()) {
      case 'CHAIN':
        return '⛓';
      case 'EDITORIAL':
        return '✎';
      default:
        return '⛓✎';
    }
  }

  protected toggleDensity(): void {
    const next: NewsDensity = this.density() === 'compact' ? 'comfort' : 'compact';
    this.newsState.setDensity(next);
  }

  protected refresh(): void {
    this.loadFeed();
  }

  protected markAllRead(): void {
    this.newsState.markAllRead(this.items().map((item) => item.id));
  }

  protected loadMore(forSearch = false): void {
    if (!this.hasMore() || this.loadingMore()) {
      return;
    }

    this.loadingMore.set(true);

    const category = this.newsState.activeCategory();
    const source = this.sourceFilter();

    this.api
      .getNewsFeed({
        category: category === 'all' ? undefined : category,
        source,
        limit: NEWS_PAGE_SIZE,
        offset: this.items().length,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (feed) => {
          const merged = [...this.items(), ...feed.items];
          this.items.set(merged);
          this.hasMore.set(feed.hasMore);
          this.newsState.syncFeedItems(merged, true);
          this.loadingMore.set(false);
          if (forSearch) {
            this.ensureSearchCoverage();
          }
        },
        error: () => {
          this.loadingMore.set(false);
        },
      });
  }

  protected openItem(item: NewsItem): void {
    this.selectedItem.set(item);
    this.keyboardFocusIndex.set(
      this.filteredItems().findIndex((entry) => entry.id === item.id)
    );
    this.newsState.markRead(item.id);
    this.loadDetail(item.id);
  }

  protected closeItem(): void {
    this.selectedItem.set(null);
    this.detailItem.set(null);
    this.detailLoading.set(false);
  }

  protected isKeyboardFocused(index: number): boolean {
    return !this.selectedItem() && this.keyboardFocusIndex() === index;
  }

  protected navigatePrev(): void {
    const index = this.selectedIndex();
    if (index <= 0) {
      return;
    }

    this.openItem(this.filteredItems()[index - 1]);
  }

  protected navigateNext(): void {
    const index = this.selectedIndex();
    const items = this.filteredItems();
    if (index < 0 || index >= items.length - 1) {
      return;
    }

    this.openItem(items[index + 1]);
  }

  protected runAction(item: NewsItem): void {
    this.nav.dispatchNewsAction(item.actionType, item.actionTarget);
  }

  protected copySummary(item: NewsItem): void {
    const text = `${item.title}\n\n${item.body || item.summary}`;
    navigator.clipboard.writeText(text).catch(() => undefined);
  }

  protected retry(): void {
    this.loadFeed();
  }

  protected goToAllCategory(): void {
    this.nav.requestTab('tours');
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchInput$.next(value);
  }

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.isExpanded) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    if (this.selectedItem()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeItem();
      }
      return;
    }

    const items = this.filteredItems();
    if (items.length === 0) {
      return;
    }

    let index = this.keyboardFocusIndex();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        index = index < 0 ? 0 : Math.min(index + 1, items.length - 1);
        this.keyboardFocusIndex.set(index);
        this.scrollToListIndex(index);
        break;
      case 'ArrowUp':
        event.preventDefault();
        index = index < 0 ? 0 : Math.max(index - 1, 0);
        this.keyboardFocusIndex.set(index);
        this.scrollToListIndex(index);
        break;
      case 'Enter':
        if (index >= 0 && index < items.length) {
          event.preventDefault();
          this.openItem(items[index]);
        }
        break;
      default:
        break;
    }
  }

  private loadFeed(showLoading = true): void {
    if (showLoading) {
      this.loading.set(true);
      this.newsState.setLoading(true);
    }
    this.error.set(false);

    const category = this.newsState.activeCategory();
    const source = this.sourceFilter();

    this.api
      .getNewsFeed({
        category: category === 'all' ? undefined : category,
        source,
        limit: NEWS_PAGE_SIZE,
        offset: 0,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (feed) => {
          this.items.set(feed.items);
          this.newsState.setCategories(feed.categories);
          this.hasMore.set(feed.hasMore);
          this.applyLiveActivity(feed.liveActivity);
          this.featuredId.set(feed.featuredId);
          const updated = feed.lastRefreshedAt
            ? new Date(feed.lastRefreshedAt)
            : new Date();
          this.lastUpdatedAt.set(updated);
          this.newsState.setLastUpdatedAt(updated);
          this.newsState.syncFeedItems(feed.items, false);
          this.handleRefreshNewItems();
          this.loading.set(false);
          this.newsState.setLoading(false);
          this.syncChainLiveStatus();
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
          this.newsState.setLoading(false);
          this.chainLiveTone.set('offline');
          this.latestBlockIndex.set(null);
        },
      });
  }

  private scheduleChainLiveSync(force = false): void {
    const now = Date.now();
    if (
      !force &&
      now - this.lastChainSyncAt < ShowcaseNewsComponent.CHAIN_SYNC_MIN_GAP_MS
    ) {
      if (this.chainSyncTimerId !== null) {
        return;
      }

      const delay =
        ShowcaseNewsComponent.CHAIN_SYNC_MIN_GAP_MS - (now - this.lastChainSyncAt);
      this.chainSyncTimerId = window.setTimeout(() => {
        this.chainSyncTimerId = null;
        this.syncChainLiveStatus();
      }, delay);
      return;
    }

    if (this.chainSyncTimerId !== null) {
      window.clearTimeout(this.chainSyncTimerId);
      this.chainSyncTimerId = null;
    }

    this.syncChainLiveStatus();
  }

  private syncChainLiveStatus(): void {
    this.lastChainSyncAt = Date.now();
    if (this.error()) {
      this.chainLiveTone.set('offline');
      this.latestBlockIndex.set(null);
      return;
    }

    forkJoin({
      blocks: this.blockchain.getBlocks().pipe(catchError(() => of([] as Block[]))),
      pending: this.blockchain.getPendingTransactions().pipe(catchError(() => of([]))),
    })
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
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

  private handleRefreshNewItems(): void {
    if (!this.newsState.newItemsToast()) {
      return;
    }

    this.newsState.dismissNewItemsToast();
    this.triggerRefreshPulse();
    this.scrollToFirstUnread();
  }

  private triggerRefreshPulse(): void {
    this.refreshPulse.set(true);
    window.setTimeout(() => this.refreshPulse.set(false), 1_100);
  }

  private scrollToFirstUnread(): void {
    queueMicrotask(() => {
      const panel = this.contentPanel()?.nativeElement;
      const firstUnread = panel?.querySelector(
        '.showcase-news__item--unread .showcase-news__item-btn'
      ) as HTMLElement | null;
      firstUnread?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  private scrollToListIndex(index: number): void {
    queueMicrotask(() => {
      const panel = this.contentPanel()?.nativeElement;
      const rows = panel?.querySelectorAll('.showcase-news__item-btn');
      const row = rows?.item(index) as HTMLElement | undefined;
      row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  private ensureSearchCoverage(): void {
    const query = this.debouncedSearchQuery().trim().toLowerCase();
    if (!query || !this.hasMore() || this.loadingMore()) {
      return;
    }

    const hasMatch = this.items().some((item) => this.itemMatchesQuery(item, query));
    if (hasMatch) {
      return;
    }

    this.loadMore(true);
  }

  private itemMatchesQuery(item: NewsItem, query: string): boolean {
    return (
      item.title.toLowerCase().includes(query) ||
      item.summary.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.body.toLowerCase().includes(query)
    );
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

  private applyLiveActivity(activity: string): void {
    this.liveActivity.set(activity);
    this.newsState.setLiveActivity(activity);

    const parsed = this.parseBlockIndexFromLive(activity);
    if (parsed !== null) {
      this.latestBlockIndex.set(parsed);
    }
  }

  private parseBlockIndexFromLive(activity: string): number | null {
    const match = /Bloc #(\d+)/i.exec(activity);
    if (!match) {
      return null;
    }

    const index = Number.parseInt(match[1], 10);
    return Number.isNaN(index) ? null : index;
  }

  private loadDetail(id: string): void {
    this.detailLoading.set(true);

    this.api
      .getNewsItem(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (item) => {
          this.detailItem.set(item);
          this.detailLoading.set(false);
        },
        error: () => {
          this.detailItem.set(this.selectedItem());
          this.detailLoading.set(false);
        },
      });
  }
}
