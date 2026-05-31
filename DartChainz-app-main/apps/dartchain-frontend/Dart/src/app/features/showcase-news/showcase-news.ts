import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostBinding,
  Input,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { interval } from 'rxjs';

import {
  NewsDensity,
  NewsItem,
  NewsSource,
} from '../../core/models/showcase.model';
import { ShowcaseApiService } from '../../core/services/showcase-api.service';
import { ShowcaseNewsStateService } from '../../core/services/showcase-news-state.service';
import { ShowcaseNavigationService } from '../../core/services/showcase-navigation.service';
import { BlockchainApiService } from '../../core/services/blockchain-api.service';
import { ShowcaseNewsDrawerComponent } from './showcase-news-drawer';

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

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal(false);
  readonly items = signal<NewsItem[]>([]);
  readonly categories = signal<string[]>([]);
  readonly activeCategory = signal('all');
  readonly sourceFilter = signal<NewsSource | 'all'>('all');
  readonly searchQuery = signal('');
  readonly hasMore = signal(false);
  readonly liveActivity = signal('');
  readonly lastUpdatedAt = signal<Date | null>(null);
  readonly featuredId = signal<string | null>(null);

  readonly selectedItem = signal<NewsItem | null>(null);
  readonly detailItem = signal<NewsItem | null>(null);
  readonly detailLoading = signal(false);

  readonly density = this.newsState.density;
  readonly newItemsToast = this.newsState.newItemsToast;

  readonly filteredItems = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return this.items();
    }

    return this.items().filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );
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

  readonly liveAgeLabel = computed(() => this.newsState.liveAgeLabel());

  constructor() {
    this.loadFeed();

    this.newsState.refresh$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadFeed());

    interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadFeed(false));

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
        }
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
    if (category === 'all') {
      return 'Tous';
    }

    if (category.toLowerCase() === 'écosystème') {
      return 'D.A.O';
    }

    return category;
  }

  protected selectCategory(category: string): void {
    if (this.activeCategory() === category) {
      return;
    }

    this.activeCategory.set(category);
    this.closeItem();
    this.loadFeed();
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

  protected toggleDensity(): void {
    const next: NewsDensity = this.density() === 'compact' ? 'comfort' : 'compact';
    this.newsState.setDensity(next);
  }

  protected refresh(): void {
    this.loadFeed();
  }

  protected dismissNewToast(): void {
    this.newsState.dismissNewItemsToast();
  }

  protected markAllRead(): void {
    this.newsState.markAllRead(this.items().map((item) => item.id));
  }

  protected loadMore(): void {
    if (!this.hasMore() || this.loadingMore()) {
      return;
    }

    this.loadingMore.set(true);

    const category = this.activeCategory();
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
          this.newsState.syncFeedItems(merged, false);
          this.loadingMore.set(false);
        },
        error: () => {
          this.loadingMore.set(false);
        },
      });
  }

  protected openItem(item: NewsItem): void {
    this.selectedItem.set(item);
    this.newsState.markRead(item.id);
    this.loadDetail(item.id);
  }

  protected closeItem(): void {
    this.selectedItem.set(null);
    this.detailItem.set(null);
    this.detailLoading.set(false);
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
    this.selectCategory('all');
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  private loadFeed(showLoading = true): void {
    if (showLoading) {
      this.loading.set(true);
      this.newsState.setLoading(true);
    }
    this.error.set(false);

    const category = this.activeCategory();
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
          this.categories.set(['all', ...feed.categories]);
          this.hasMore.set(feed.hasMore);
          this.liveActivity.set(feed.liveActivity);
          this.newsState.setLiveActivity(feed.liveActivity);
          this.featuredId.set(feed.featuredId);
          const updated = feed.lastRefreshedAt
            ? new Date(feed.lastRefreshedAt)
            : new Date();
          this.lastUpdatedAt.set(updated);
          this.newsState.setLastUpdatedAt(updated);
          this.newsState.syncFeedItems(feed.items, false);
          this.loading.set(false);
          this.newsState.setLoading(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
          this.newsState.setLoading(false);
        },
      });
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
