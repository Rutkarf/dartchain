import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';

import { isLaunchpadSwapToken } from '../../core/constants/exchange-launchpad.constants';
import { BRAND_DEFAULT_CRYPTO } from '../../core/constants/rate-panel-symbols';
import { CryptoRatesService } from '../../core/services/crypto-rate.service';
import { RatePanelPreferencesService } from '../../core/services/rate-panel-preferences.service';
import { ShowcaseLaunchStateService } from '../../core/services/showcase-launch-state.service';
import { chartSearchSourceLabel, ChartSearchResult } from './chart-token-search.model';
import { readChartWatchlist, upsertChartWatchlist } from './chart-watchlist.util';

@Component({
  selector: 'app-chart-token-search',
  standalone: true,
  templateUrl: './chart-token-search.html',
  styleUrls: ['./chart-token-search.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartTokenSearchComponent {
  readonly compact = input(false);
  readonly iconOnly = input(false);

  readonly tokenSelected = output<ChartSearchResult>();

  private readonly rates = inject(CryptoRatesService);
  private readonly preferences = inject(RatePanelPreferencesService);
  private readonly launchState = inject(ShowcaseLaunchStateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);

  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  readonly searchQuery = signal('');
  readonly searchResults = signal<ChartSearchResult[]>([]);
  readonly searchLoading = signal(false);
  readonly searchMenuOpen = signal(false);
  readonly searchFocused = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly watchlist = signal<ChartSearchResult[]>(readChartWatchlist());

  readonly sourceLabel = chartSearchSourceLabel;

  @HostBinding('class.chart-token-search--icon-only')
  get iconOnlyHostClass(): boolean {
    return this.iconOnly();
  }

  @HostBinding('class.chart-token-search--open')
  get searchOpenHostClass(): boolean {
    return this.searchFocused() || this.searchMenuOpen();
  }

  constructor() {
    this.launchState.loadProjects();

    toObservable(this.searchQuery)
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmed = query.trim();
          if (trimmed.length < 2) {
            this.searchLoading.set(false);
            this.searchResults.set([]);
            this.searchError.set(null);
            return of([] as ChartSearchResult[]);
          }

          this.searchLoading.set(true);
          this.searchError.set(null);

          return this.rates.searchCoins(trimmed).pipe(
            map((remote) => this.mergeResults(trimmed, remote)),
            catchError(() => {
              this.searchError.set('Recherche indisponible.');
              return of(this.mergeResults(trimmed, []));
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((results) => {
        this.searchResults.set(results);
        this.searchLoading.set(false);
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.closeMenu(false);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeMenu(true);
    }
  }

  closeMenu(blurInput = true): void {
    this.searchMenuOpen.set(false);
    this.searchFocused.set(false);
    if (blurInput) {
      this.searchInput?.nativeElement.blur();
    }
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    const trimmed = value.trim();
    if (trimmed.length >= 2) {
      this.searchMenuOpen.set(true);
      return;
    }
    this.searchMenuOpen.set(false);
  }

  onSearchFocus(): void {
    this.searchFocused.set(true);
    if (this.searchQuery().trim().length >= 2) {
      this.searchMenuOpen.set(true);
    }
  }

  onSearchBlur(): void {
    window.setTimeout(() => {
      if (!this.searchMenuOpen()) {
        this.searchFocused.set(false);
      }
    }, 120);
  }

  onSearchSubmit(event: Event): void {
    event.preventDefault();
    const first = this.searchResults()[0] ?? this.watchlist()[0];
    if (first) {
      this.pickResult(first);
    }
  }

  pickResult(result: ChartSearchResult): void {
    this.preferences.addToRightColumn({
      coinId: result.id,
      symbol: result.symbol,
      name: result.name,
    });
    this.watchlist.set(upsertChartWatchlist(result));
    this.tokenSelected.emit(result);
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.searchError.set(null);
    this.closeMenu(true);
  }

  private buildDartchainCatalog(): ChartSearchResult[] {
    const r4v3: ChartSearchResult = {
      id: 'r4v3',
      symbol: BRAND_DEFAULT_CRYPTO,
      name: 'R4V3 · Réseau DartChain',
      thumb: '',
      source: 'dartchain',
      network: 'DartChain',
    };

    const launch = this.launchState
      .projects()
      .filter((project) => isLaunchpadSwapToken(project.symbol))
      .map(
        (project): ChartSearchResult => ({
          id: project.symbol.trim().toLowerCase(),
          symbol: project.symbol.trim().toUpperCase(),
          name: project.name,
          thumb: project.logoUrl?.trim() || '',
          source: 'launchlab',
          network: 'LaunchLab',
        })
      );

    return [r4v3, ...launch];
  }

  private matchesCatalogEntry(entry: ChartSearchResult, needle: string): boolean {
    if (!needle) {
      return true;
    }

    const haystack = [
      entry.symbol,
      entry.name,
      entry.network ?? '',
      chartSearchSourceLabel(entry.source, entry.network),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(needle);
  }

  private mergeResults(query: string, remote: ChartSearchResult[]): ChartSearchResult[] {
    const needle = query.trim().toLowerCase();
    const local = this.buildDartchainCatalog()
      .filter((entry) => this.matchesCatalogEntry(entry, needle))
      .slice(0, 5);

    const seen = new Set<string>();
    const merged: ChartSearchResult[] = [];

    for (const entry of [...local, ...remote]) {
      const key = `${entry.id}:${entry.symbol}`.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(entry);
      if (merged.length >= 8) {
        break;
      }
    }

    return merged;
  }
}
