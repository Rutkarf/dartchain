import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  afterNextRender,
  computed,
  effect,
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
  take,
} from 'rxjs';

import {
  NewsItem,
  NewsSource,
} from '../../core/models/showcase.model';
import { ShowcaseApiService } from '../../core/services/showcase-api.service';
import { ShowcaseNavigationService } from '../../core/services/showcase-navigation.service';
import { ShowcaseNewsStateService } from '../../core/services/showcase-news-state.service';
import { BlockchainApiService } from '../../core/services/blockchain-api.service';
import { ShowcaseNewsDrawerComponent } from './showcase-news-drawer';
import { buildNewsCopyText, copyTextToClipboard } from '../../core/utils/clipboard.util';
import {
  SHOWCASE_REFRESH_EVENT,
  refreshEventMatchesTab,
} from '../../core/constants/panel-refresh.constants';
import {
  abbreviateHashesInText,
  formatNewsDisplayTitle,
  newsCategoryAbbrev,
  newsDisplayTitleTooltip,
  normalizeNewsCategorySlug,
} from './showcase-news-display.util';

const NEWS_PAGE_SIZE = 10;

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
  private readonly loadSentinel = viewChild<ElementRef<HTMLElement>>('loadSentinel');
  private readonly searchInput$ = new Subject<string>();
  private loadObserver: IntersectionObserver | null = null;

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
  readonly keyboardFocusIndex = signal(-1);

  readonly chainLiveClickable = computed(() => this.newsState.latestBlockIndex() !== null);

  readonly chainBlockLabel = computed(() => {
    const index = this.newsState.latestBlockIndex();
    return index !== null ? `#${index}` : null;
  });

  readonly chainToneLabel = computed(() => {
    if (this.newsState.latestBlockIndex() === null) {
      return null;
    }

    switch (this.newsState.chainLiveTone()) {
      case 'pending':
        return 'attente';
      case 'offline':
        return 'off';
      default:
        return 'sync';
    }
  });

  readonly chainFallbackLabel = computed(() => {
    if (this.newsState.latestBlockIndex() !== null) {
      return null;
    }

    const activity = this.newsState.liveActivity();
    if (activity) {
      return activity.length > 14 ? `${activity.slice(0, 12)}…` : activity;
    }

    return 'off';
  });

  readonly selectedItem = signal<NewsItem | null>(null);
  readonly detailItem = signal<NewsItem | null>(null);
  readonly detailLoading = signal(false);

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
      .subscribe(() => this.syncFromNewsState());

    this.newsState.categoryChange$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.closeItem();
        this.loadFeed();
      });

    interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadFeed(false));

    this.blockchain
      .connectLiveUpdates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        // Pas de reload sur chaque snapshot (~5s) : ça faisait sonner le ticker en boucle.
        // On ne recharge que sur de vrais événements chaîne / mempool.
        if (message.type === 'blocks' || message.type === 'pending-transactions') {
          this.loadFeed(false);
        }
      });

    effect(() => {
      this.filteredItems();
      this.loading();
      this.hasMore();
      this.loadingMore();
      queueMicrotask(() => this.bindLoadObserver());
    });

    afterNextRender(() => this.bindLoadObserver());

    this.destroyRef.onDestroy(() => this.loadObserver?.disconnect());
  }

  protected refreshAriaLabel(): string {
    const unread = this.newsState.unreadCount();
    if (unread > 0) {
      return `Actualiser les actualités, ${unread} non lue${unread > 1 ? 's' : ''}`;
    }
    return 'Actualiser les actualités';
  }

  protected openLatestBlock(): void {
    const index = this.newsState.latestBlockIndex();
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

  protected categorySlug(category: string): string {
    return normalizeNewsCategorySlug(category);
  }

  protected categoryAbbrev(item: NewsItem): string {
    return newsCategoryAbbrev(item.category, item.source);
  }

  protected itemLineTitle(item: NewsItem): string {
    return formatNewsDisplayTitle(item);
  }

  protected itemLineTooltip(item: NewsItem): string {
    const time = item.relativeTime?.trim();
    const full = newsDisplayTitleTooltip(item);
    return time ? `${full} · ${time}` : full;
  }

  protected isUnread(item: NewsItem): boolean {
    return this.newsState.isUnread(item.id);
  }

  protected isFeatured(item: NewsItem): boolean {
    return item.featured || item.id === this.featuredId();
  }

  protected refresh(): void {
    this.loadFeed();
  }

  @HostListener(`window:${SHOWCASE_REFRESH_EVENT}`, ['$event'])
  onShowcaseRefresh(event: Event): void {
    if (refreshEventMatchesTab(event, 'tours')) {
      this.refresh();
    }
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
    void copyTextToClipboard(buildNewsCopyText(item));
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
    this.newsState.setSourceFilter(this.sourceFilter());
    if (showLoading) {
      this.loading.set(true);
    }
    this.error.set(false);
    this.newsState.refreshFeed(showLoading, this.sourceFilter());
  }

  private syncFromNewsState(): void {
    this.items.set(this.newsState.feedItems());
    this.hasMore.set(this.newsState.hasMore());
    this.liveActivity.set(this.newsState.liveActivity());
    this.lastUpdatedAt.set(this.newsState.lastUpdatedAt());
    this.featuredId.set(this.newsState.featuredId());
    this.loading.set(this.newsState.loading());
    this.error.set(this.newsState.feedError());

    if (this.newsState.refreshPulse()) {
      this.scrollToFirstUnread();
    }
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
    const normalized = abbreviateHashesInText(item.title).toLowerCase();
    return (
      normalized.includes(query) ||
      item.title.toLowerCase().includes(query) ||
      item.summary.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.body.toLowerCase().includes(query)
    );
  }

  private bindLoadObserver(): void {
    this.loadObserver?.disconnect();
    this.loadObserver = null;

    if (this.loading() || !this.hasMore() || this.loadingMore()) {
      return;
    }

    const sentinel = this.loadSentinel()?.nativeElement;
    const root = this.contentPanel()?.nativeElement;
    if (!sentinel || !root) {
      return;
    }

    this.loadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.loadMore(Boolean(this.debouncedSearchQuery().trim()));
        }
      },
      { root, rootMargin: '64px 0px', threshold: 0 }
    );
    this.loadObserver.observe(sentinel);
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
