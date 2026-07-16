import { Injectable, computed, signal } from '@angular/core';
import { Subject } from 'rxjs';

import { NewsDensity, NewsItem } from '../models/showcase.model';

const READ_IDS_KEY = 'dartchain-news-read-ids';
const DENSITY_KEY = 'dartchain-news-density';

@Injectable({ providedIn: 'root' })
export class ShowcaseNewsStateService {
  private readonly readIds = signal<Set<string>>(this.loadReadIds());
  private readonly knownIds = signal<Set<string>>(new Set());
  private readonly refreshRequested = new Subject<void>();
  private readonly categoryChanged = new Subject<string>();

  readonly density = signal<NewsDensity>(this.loadDensity());
  readonly unreadCount = signal(0);
  readonly newItemsToast = signal(false);
  readonly feedItems = signal<NewsItem[]>([]);
  readonly liveActivity = signal('');
  readonly lastUpdatedAt = signal<Date | null>(null);
  readonly loading = signal(false);
  readonly categories = signal<string[]>(['all']);
  readonly activeCategory = signal('all');

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
    const hasNew = incomingIds.some((id) => !known.has(id));

    const merged = append
      ? new Set([...known, ...incomingIds])
      : new Set(incomingIds);

    this.knownIds.set(merged);
    this.unreadCount.set([...merged].filter((id) => !this.readIds().has(id)).length);
    this.newItemsToast.set(hasNew && !append);

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
  }

  setLastUpdatedAt(value: Date | null): void {
    this.lastUpdatedAt.set(value);
  }

  setLoading(value: boolean): void {
    this.loading.set(value);
  }

  requestRefresh(): void {
    this.refreshRequested.next();
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

  categoryLabel(category: string): string {
    if (category === 'all') {
      return 'Tous';
    }

    if (category.toLowerCase() === 'écosystème') {
      return 'D.A.O';
    }

    return category;
  }

  dismissNewItemsToast(): void {
    this.newItemsToast.set(false);
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
