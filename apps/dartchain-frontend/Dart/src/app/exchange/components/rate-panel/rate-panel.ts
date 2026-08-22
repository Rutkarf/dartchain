import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { AsyncPipe, NgClass, NgTemplateOutlet } from '@angular/common';
import {
  Observable,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import {
  CryptoRatesService,
  CryptoSearchResult,
  RatePanelData,
} from '@exchange/services/crypto-rate.service';
import {
  BRAND_DEFAULT_CRYPTO,
  RATE_PANEL_LEFT_SYMBOLS,
} from '@core/constants/rate-panel-symbols';
import { BrandCryptoSelectionService } from '@navbar/services/brand-crypto-selection.service';
import { RatePanelPreferencesService } from '@showcase/services/rate-panel-preferences.service';
import {
  buildRatePanelTrendSegments,
  ChartTrendSegment,
} from '@showcase/components/showcase-chart/chart-display.util';
import { ShowcaseChartComponent } from '@showcase/components/showcase-chart/showcase-chart';
import { ShowcaseChartSummaryComponent } from '@showcase/components/showcase-chart/showcase-chart-summary';

export interface RatePanelView {
  featured: RatePanelData;
  left: RatePanelData[];
  right: RatePanelData[];
}

@Component({
  selector: 'app-rate-panel',
  standalone: true,
  host: {
    '[class.rate-panel--hub-graph]': 'hubGraphOnly()',
    '[class.rate-panel--hub-collapsed]': 'hubGraphOnly() && chartCollapsed()',
  },
  imports: [NgClass, AsyncPipe, NgTemplateOutlet, ShowcaseChartComponent, ShowcaseChartSummaryComponent],
  templateUrl: './rate-panel.html',
  styleUrls: ['./rate-panel.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatePanelComponent {
  /** Hub marché : graphique seul (maquette), sans grille de cartes ni recherche. */
  readonly hubGraphOnly = input(false, { transform: booleanAttribute });
  readonly chartCollapsed = input(false, { transform: booleanAttribute });
  readonly collapseAriaLabel = input('Replier le graphique');
  readonly collapseToggle = output<void>();

  private readonly rates = inject(CryptoRatesService);
  private readonly preferences = inject(RatePanelPreferencesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly brandCrypto = inject(BrandCryptoSelectionService);

  readonly searchQuery = signal('');
  readonly searchResults = signal<CryptoSearchResult[]>([]);
  readonly searchLoading = signal(false);
  readonly searchMenuOpen = signal(false);
  readonly searchFocused = signal(false);
  readonly searchError = signal<string | null>(null);

  readonly skeletonFeatured = this.rates.placeholderPanelsFor([BRAND_DEFAULT_CRYPTO])[0];
  readonly skeletonLeft = this.rates.placeholderPanelsFor(RATE_PANEL_LEFT_SYMBOLS);
  readonly skeletonRight = this.rates.placeholderPanelsFor(
    this.preferences.rightCoins().map((coin) => coin.symbol)
  );
  readonly skeletonView: RatePanelView = {
    featured: this.skeletonFeatured,
    left: this.skeletonLeft,
    right: this.skeletonRight,
  };

  readonly view$: Observable<RatePanelView> = combineLatest([
    this.rates.getR4v3FeaturedPanel(),
    this.rates.getPanelsBatch(this.rates.leftCoinEntries()),
    toObservable(this.preferences.rightCoins).pipe(
      switchMap((entries) => this.rates.getPanelsBatch(entries))
    ),
  ]).pipe(
    map(([featured, left, right]) => ({ featured, left, right })),
    catchError(() => of(this.skeletonView)),
    startWith(this.skeletonView)
  );

  readonly hasSearchQuery = computed(() => this.searchQuery().trim().length > 0);

  constructor() {
    toObservable(this.searchQuery)
      .pipe(
        debounceTime(280),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmed = query.trim();
          if (trimmed.length < 2) {
            this.searchLoading.set(false);
            this.searchResults.set([]);
            this.searchError.set(null);
            return of([] as CryptoSearchResult[]);
          }

          this.searchLoading.set(true);
          this.searchError.set(null);

          return this.rates.searchCoins(trimmed).pipe(
            catchError(() => {
              this.searchError.set('Recherche CoinGecko indisponible.');
              return of([] as CryptoSearchResult[]);
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

  trackByPair(_: number, item: RatePanelData): string {
    return item.symbol;
  }

  isSelected(panel: RatePanelData): boolean {
    if (panel.symbol === BRAND_DEFAULT_CRYPTO) {
      return this.brandCrypto.selected() === BRAND_DEFAULT_CRYPTO;
    }

    return panel.symbol === this.brandCrypto.selected();
  }

  trendSegments(points: number[] | undefined): ChartTrendSegment[] {
    return buildRatePanelTrendSegments(points);
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchMenuOpen.set(value.trim().length >= 2);
  }

  onSearchFocus(): void {
    this.searchFocused.set(true);
    if (this.searchQuery().trim().length >= 2) {
      this.searchMenuOpen.set(true);
    }
  }

  onSearchBlur(): void {
    this.searchFocused.set(false);
  }

  onSearchSubmit(event: Event): void {
    event.preventDefault();
    const first = this.searchResults()[0];
    if (first) {
      this.addSearchResult(first);
    }
  }

  addSearchResult(result: CryptoSearchResult): void {
    const added = this.preferences.addToRightColumn({
      coinId: result.id,
      symbol: result.symbol,
      name: result.name,
    });

    if (!added) {
      return;
    }

    this.searchQuery.set('');
    this.searchResults.set([]);
    this.searchMenuOpen.set(false);
    this.searchError.set(null);
  }

  onPanelClick(panel: RatePanelData): void {
    if (panel.symbol === BRAND_DEFAULT_CRYPTO) {
      this.brandCrypto.selectFromRatePanel(BRAND_DEFAULT_CRYPTO, null);
      return;
    }

    const coinId = this.preferences.coinIdForSymbol(panel.symbol);
    this.brandCrypto.selectFromRatePanel(panel.symbol, coinId);
  }

  onPanelKeydown(event: KeyboardEvent, panel: RatePanelData): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.onPanelClick(panel);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.searchMenuOpen()) {
      return;
    }

    if (this.host.nativeElement.contains(event.target as Node)) {
      return;
    }

    this.searchMenuOpen.set(false);
  }
}
