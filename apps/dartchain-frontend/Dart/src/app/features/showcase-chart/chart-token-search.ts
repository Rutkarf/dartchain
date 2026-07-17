import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';

import { isLaunchpadSwapToken } from '../../core/constants/exchange-launchpad.constants';
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

  readonly tokenSelected = output<ChartSearchResult>();

  private readonly rates = inject(CryptoRatesService);
  private readonly preferences = inject(RatePanelPreferencesService);
  private readonly launchState = inject(ShowcaseLaunchStateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly searchQuery = signal('');
  readonly searchResults = signal<ChartSearchResult[]>([]);
  readonly searchLoading = signal(false);
  readonly searchMenuOpen = signal(false);
  readonly searchFocused = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly watchlist = signal<ChartSearchResult[]>(readChartWatchlist());

  readonly sourceLabel = chartSearchSourceLabel;

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
      this.searchMenuOpen.set(false);
    }
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchMenuOpen.set(value.trim().length >= 2);
  }

  onSearchFocus(): void {
    this.searchFocused.set(true);
    if (this.searchQuery().trim().length >= 2 || this.watchlist().length) {
      this.searchMenuOpen.set(true);
    }
  }

  onSearchBlur(): void {
    this.searchFocused.set(false);
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
    this.searchMenuOpen.set(false);
    this.searchError.set(null);
  }

  private mergeResults(query: string, remote: ChartSearchResult[]): ChartSearchResult[] {
    const needle = query.trim().toLowerCase();
    const local = this.launchState
      .projects()
      .filter((project) => {
        const symbol = project.symbol.trim().toUpperCase();
        if (!isLaunchpadSwapToken(symbol)) {
          return false;
        }
        return (
          symbol.toLowerCase().includes(needle) ||
          project.name.trim().toLowerCase().includes(needle)
        );
      })
      .slice(0, 2)
      .map(
        (project): ChartSearchResult => ({
          id: project.symbol.trim().toLowerCase(),
          symbol: project.symbol.trim().toUpperCase(),
          name: project.name,
          thumb: project.logoUrl?.trim() || '',
          source: 'launchlab',
          network: 'DartChain',
        })
      );

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
