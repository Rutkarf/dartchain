import { Injectable, computed, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import {
  R4V3_FAQ_CATEGORIES,
  R4V3_FAQ_ENTRIES,
} from '@core/constants/r4v3-faq.constants';
import { R4v3FaqCategoryId, R4v3FaqEntry } from '@showcase/models/r4v3-faq.model';

export type R4v3FaqCategoryFilter = R4v3FaqCategoryId | 'all';

@Injectable({ providedIn: 'root' })
export class R4v3FaqStateService {
  private readonly searchInput$ = new Subject<string>();

  readonly entries = signal<readonly R4v3FaqEntry[]>(R4V3_FAQ_ENTRIES);
  readonly categories = R4V3_FAQ_CATEGORIES;
  readonly searchQuery = signal('');
  readonly debouncedSearchQuery = signal('');
  readonly categoryFilter = signal<R4v3FaqCategoryFilter>('all');

  readonly popularEntries = computed(() =>
    this.entries().filter((entry) => entry.popular)
  );

  readonly filteredEntries = computed(() => {
    const query = this.debouncedSearchQuery().trim().toLowerCase();
    const category = this.categoryFilter();

    return this.entries().filter((entry) => {
      if (category !== 'all' && entry.categoryId !== category) {
        return false;
      }

      if (!query) {
        return true;
      }

      return this.entryMatchesQuery(entry, query);
    });
  });

  readonly totalCount = computed(() => this.entries().length);

  constructor() {
    this.searchInput$
      .pipe(debounceTime(180), distinctUntilChanged())
      .subscribe((query) => this.debouncedSearchQuery.set(query));
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchInput$.next(value);
  }

  setCategoryFilter(category: R4v3FaqCategoryFilter): void {
    this.categoryFilter.set(category);
  }

  cycleCategoryFilter(): void {
    const order: R4v3FaqCategoryFilter[] = [
      'all',
      ...this.categories.map((category) => category.id),
    ];
    const index = order.indexOf(this.categoryFilter());
    this.categoryFilter.set(order[(index + 1) % order.length]);
  }

  categoryFilterLabel(): string {
    const filter = this.categoryFilter();
    if (filter === 'all') {
      return 'Toutes les catégories';
    }

    return this.categories.find((category) => category.id === filter)?.label ?? filter;
  }

  findById(id: string): R4v3FaqEntry | undefined {
    return this.entries().find((entry) => entry.id === id);
  }

  private entryMatchesQuery(entry: R4v3FaqEntry, query: string): boolean {
    const haystack = [
      entry.title,
      entry.summary,
      entry.body,
      ...(entry.tags ?? []),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  }
}
