import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  signal,
  booleanAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';

import { ChartRange } from '../../core/models/showcase.model';
import {
  BRAND_DEFAULT_CRYPTO,
  BrandCryptoSymbol,
  RATE_PANEL_SYMBOLS,
  RatePanelSymbol,
  chartBaseSymbol,
  chartPairForSymbol,
  chartQuoteSymbol,
} from '../../core/constants/rate-panel-symbols';
import { ChartAlertsService } from '../../core/services/chart-alerts.service';
import { BrandCryptoSelectionService } from '../../core/services/brand-crypto-selection.service';
import {
  ChartCurrency,
  CryptoRatesService,
  MarketChartData,
  RatePanelData,
} from '../../core/services/crypto-rate.service';
import { BlockchainApiService } from '../../core/services/blockchain-api.service';
import { ShowcaseApiService } from '../../core/services/showcase-api.service';
import {
  CandleSvgLayout,
  ChartDisplayType,
  buildChartTrendSegments,
  buildOhlcFromPriceSeries,
  layoutCandlesForSvg,
  priceAtSeriesIndex,
  pricesToChartCoordinates,
} from './chart-display.util';
import {
  buildIndicatorLine,
  computeRsi,
  movingAverageNormalized,
  ohlcAtIndex,
  sliceSeries,
  volumeBarLayouts,
} from './chart-indicators.util';
import { formatHoverTimestamp, syntheticTimestamps } from './chart-axis.util';
import {
  buildHorizontalAxisTicks,
  buildHorizontalGridLines,
  buildPriceGridLevels,
  buildVerticalGridLines,
} from './chart-grid.util';
import { resolveGridProfile } from './chart-grid.config';
import {
  CHART_PERIOD_OPTIONS,
  ChartTimeframeId,
  ChartTimeframeOption,
  buildTimeframeMenuSections,
  chartTimeframeById,
  defaultIntervalForRange,
  isIntervalId,
} from './chart-timeframe.constants';
import { ChartSeriesPayload, transformSeriesForTimeframe } from './chart-timeframe.util';

const CHART_TYPES: ReadonlyArray<{ id: ChartDisplayType; label: string }> = [
  { id: 'line', label: 'Courbe' },
  { id: 'candles', label: 'Bougies' },
];

const CURRENCIES: ReadonlyArray<{ id: ChartCurrency; label: string }> = [
  { id: 'eur', label: 'EUR' },
  { id: 'usd', label: 'USD' },
  { id: 'r4v3', label: 'R4V3' },
];

const CHART_TYPE_STORAGE_KEY = 'dart_chart_display_type';
const CHART_CURRENCY_STORAGE_KEY = 'dart_chart_currency';
const COMPARE_NONE = 'none' as const;

export interface HubPeriodPill {
  range: ChartRange;
  badge: string;
}

const HUB_PERIOD_PILLS: readonly HubPeriodPill[] = [
  { range: '1h', badge: '1H' },
  { range: '24h', badge: '24H' },
  { range: '7d', badge: '7D' },
  { range: '30d', badge: '30D' },
];

function formatCompactMetric(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

@Component({
  selector: 'app-showcase-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-chart.html',
  styleUrls: ['./showcase-chart.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseChartComponent {
  /** Layout hub marché (maquette : titre, pills, footer stats). */
  readonly hubLayout = input(false, { transform: booleanAttribute });

  private readonly api = inject(ShowcaseApiService);
  private readonly rates = inject(CryptoRatesService);
  private readonly blockchain = inject(BlockchainApiService);
  private readonly brandCrypto = inject(BrandCryptoSelectionService);
  private readonly chartAlerts = inject(ChartAlertsService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('chartSvg') chartSvg?: ElementRef<SVGSVGElement>;
  @ViewChild('timeframeMenu') timeframeMenu?: ElementRef<HTMLElement>;
  @ViewChild('hubChartStage') hubChartStage?: ElementRef<HTMLElement>;

  readonly timeframeMenuSections = computed(() =>
    buildTimeframeMenuSections(this.activeRange())
  );
  readonly chartTypes = CHART_TYPES;
  readonly currencies = CURRENCIES;
  readonly cryptoOptions = this.brandCrypto.menuSymbols;
  readonly compareOptions: readonly { id: string; label: string }[] = [
    { id: COMPARE_NONE, label: '—' },
    ...RATE_PANEL_SYMBOLS.map((symbol) => ({ id: symbol, label: symbol })),
  ];
  readonly hubPeriodPills = HUB_PERIOD_PILLS;

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly activeRange = signal<ChartRange>('24h');
  readonly activeTimeframeId = signal<ChartTimeframeId>('24h');
  readonly timeframeMenuOpen = signal(false);
  readonly chartType = signal<ChartDisplayType>(this.loadChartType());
  readonly chartCurrency = signal<ChartCurrency>(this.loadCurrency());
  readonly compareSymbol = signal<string>(COMPARE_NONE);
  readonly zoomStart = signal(0);
  readonly zoomEnd = signal(100);
  readonly showMa = signal(false);
  readonly showRsi = signal(false);
  readonly showVolume = signal(false);
  readonly pinnedIndex = signal<number | null>(null);
  readonly alertPanelOpen = signal(false);
  readonly alertAbove = signal('');
  readonly alertBelow = signal('');

  readonly chartPrice = signal('—');
  readonly chartDelta = signal('—');
  readonly chartPositive = signal(true);
  readonly seriesVolumeLabel = signal('');
  private readonly baseSeries = signal<ChartSeriesPayload | null>(null);
  readonly chartPoints = signal<number[]>([50, 50, 50, 50, 50, 50]);
  readonly rawPrices = signal<number[]>([]);
  readonly rawTimestamps = signal<number[]>([]);
  readonly volumeBars = signal<number[]>([]);
  readonly comparePoints = signal<number[] | null>(null);
  readonly hoverIndex = signal<number | null>(null);
  readonly tradeLines = signal<string[]>([]);

  readonly selectedSymbol = this.brandCrypto.selected;
  readonly alertTrigger = this.chartAlerts.lastTrigger;

  readonly pairBase = computed(() => chartBaseSymbol(this.selectedSymbol()));
  readonly pairQuote = computed(() => chartQuoteSymbol(this.selectedSymbol()));
  readonly activeTimeframe = computed(() => chartTimeframeById(this.activeTimeframeId()));
  readonly activeTimeframeBadge = computed(() => this.activeTimeframe().badge);
  readonly activeTimeframeHint = computed(() => {
    const tf = this.activeTimeframe();
    const sectionTitle = isIntervalId(tf.id) ? 'Intervalle' : 'Période';
    return `${sectionTitle} · ${tf.label} · CoinGecko ${tf.coingeckoGranularity}`;
  });
  readonly isNativeDart = computed(() => this.selectedSymbol() === BRAND_DEFAULT_CRYPTO);
  readonly currencyLabel = computed(
    () => this.currencies.find((entry) => entry.id === this.chartCurrency())?.label ?? 'EUR'
  );

  readonly chartHeight = 64;
  readonly volumeHeight = 14;
  readonly rsiHeight = 16;
  /** Marge SVG gauche (%) — évite que grille / courbe chevauchent les prix. */
  readonly chartPlotInset = 2;
  readonly chartPlotRight = 100;
  readonly chartPlotWidth = this.chartPlotRight - this.chartPlotInset;
  private readonly chartWidth = 100;

  /** Coordonnées SVG (0–100) dérivées des prix visibles — source unique pour courbe / bougies. */
  readonly plotPoints = computed(() => {
    void this.activeTimeframeId();
    void this.activeRange();
    return pricesToChartCoordinates(this.visiblePrices());
  });

  /** Segments vert/rouge pour le mode courbe. */
  readonly lineTrendSegments = computed(() =>
    buildChartTrendSegments(
      this.plotPoints(),
      this.chartWidth,
      this.chartHeight,
      this.chartHeight
    )
  );

  readonly lastLineTrendUp = computed(() => {
    const segments = this.lineTrendSegments();
    return segments.length ? segments[segments.length - 1].up : true;
  });

  readonly visiblePrices = computed(() =>
    sliceSeries(this.rawPrices(), this.zoomStart(), this.zoomEnd())
  );

  readonly visibleTimestamps = computed(() =>
    sliceSeries(this.rawTimestamps(), this.zoomStart(), this.zoomEnd())
  );

  readonly visibleVolumes = computed(() =>
    sliceSeries(this.volumeBars(), this.zoomStart(), this.zoomEnd())
  );

  /** Prix utilisés pour H / L (période ou fenêtre zoomée). */
  readonly metricPrices = computed(() => {
    const prices = this.rawPrices();
    if (!prices.length) {
      return [] as number[];
    }
    if (this.zoomStart() === 0 && this.zoomEnd() === 100) {
      return prices;
    }
    return sliceSeries(prices, this.zoomStart(), this.zoomEnd());
  });

  readonly chartHigh = computed(() => {
    void this.activeTimeframeId();
    void this.activeRange();
    const prices = this.metricPrices();
    if (!prices.length) {
      return '—';
    }
    return this.formatAxisPrice(Math.max(...prices), this.chartPrice());
  });

  readonly chartLow = computed(() => {
    void this.activeTimeframeId();
    void this.activeRange();
    const prices = this.metricPrices();
    if (!prices.length) {
      return '—';
    }
    return this.formatAxisPrice(Math.min(...prices), this.chartPrice());
  });

  readonly chartVolume = computed(() => {
    void this.activeTimeframeId();
    void this.activeRange();
    const label = this.seriesVolumeLabel();
    if (!label || label === '—') {
      return '—';
    }
    const unit = this.currencyLabel();
    return label.toUpperCase().includes(unit.toUpperCase()) ? label : `${label} ${unit}`;
  });

  readonly hubYAxisTitle = computed(() => `PRIX (${this.currencyLabel()})`);

  readonly hubFooterVol = computed(() => {
    const vol = this.chartVolume();
    if (!vol || vol === '—') {
      return '—';
    }
    const base = this.pairBase();
    return vol.toUpperCase().includes(base) ? vol : `${vol} ${base}`;
  });

  readonly hubFooterCap = computed(() => {
    const bars = this.volumeBars();
    if (!bars.length) {
      return '—';
    }
    const sum = bars.reduce((acc, value) => acc + (Number.isFinite(value) ? value : 0), 0);
    return formatCompactMetric(sum);
  });

  readonly hubFooterTvl = computed(() => {
    const bars = this.volumeBars();
    if (!bars.length) {
      return '—';
    }
    const sum = bars.reduce((acc, value) => acc + (Number.isFinite(value) ? value : 0), 0);
    return formatCompactMetric(sum * 0.28);
  });

  readonly visibleCompare = computed(() => {
    const compare = this.comparePoints();
    if (!compare) {
      return null;
    }
    return sliceSeries(compare, this.zoomStart(), this.zoomEnd());
  });

  readonly rsiGridLines = this.buildGridLines(2, this.rsiHeight);

  readonly chartGridProfile = computed(() =>
    resolveGridProfile(this.activeTimeframeId(), this.activeRange())
  );

  readonly priceGridLevels = computed(() => {
    const bounds = this.priceBounds();
    if (!bounds) {
      return [];
    }

    return buildPriceGridLevels(
      bounds.low,
      bounds.high,
      this.chartGridProfile().horizontalTickCount,
      this.chartHeight,
      (value) => this.formatAxisPrice(value, bounds.reference)
    );
  });

  /** Lignes verticales — nombre fixe selon le profil actif. */
  readonly verticalGridLines = computed(() => {
    void this.activeTimeframeId();
    void this.activeRange();
    void this.zoomStart();
    void this.zoomEnd();

    const profile = this.chartGridProfile();
    const timestamps = this.resolveGridTimestamps();

    return buildVerticalGridLines(timestamps, profile);
  });

  /** Lignes horizontales — 10 niveaux de prix (axe Y). */
  readonly horizontalGridLines = computed(() => {
    void this.activeTimeframeId();
    const profile = this.chartGridProfile();
    return buildHorizontalGridLines(this.priceGridLevels(), profile.key);
  });

  readonly candles = computed(() => buildOhlcFromPriceSeries(this.visiblePrices()));

  readonly candleLayouts = computed(() =>
    layoutCandlesForSvg(this.candles(), this.chartWidth, this.chartHeight)
  );

  readonly volumeLayouts = computed(() =>
    volumeBarLayouts(this.visibleVolumes(), this.chartWidth, this.volumeHeight)
  );

  readonly ma7Line = computed(() =>
    this.showMa() ? buildIndicatorLine(movingAverageNormalized(this.plotPoints(), 7), this.chartWidth, this.chartHeight) : ''
  );

  readonly ma25Line = computed(() =>
    this.showMa()
      ? buildIndicatorLine(movingAverageNormalized(this.plotPoints(), 25), this.chartWidth, this.chartHeight)
      : ''
  );

  readonly rsiLine = computed(() => {
    const prices = this.visiblePrices();
    if (!this.showRsi() || prices.length < 3) {
      return '';
    }
    return buildIndicatorLine(computeRsi(prices), this.chartWidth, this.rsiHeight);
  });

  readonly compareLine = computed(() => {
    const compare = this.visibleCompare();
    if (!compare) {
      return '';
    }
    return buildIndicatorLine(compare, this.chartWidth, this.chartHeight);
  });

  readonly activeHoverIndex = computed(() => {
    const pinned = this.pinnedIndex();
    if (pinned !== null) {
      return pinned;
    }
    return this.hoverIndex();
  });

  /** Prix alignés sur chaque ligne horizontale du cadrillage. */
  readonly priceAxisTicks = computed(() => {
    const levels = this.priceGridLevels();
    const plotHeight = this.chartHeight;

    const tickAlign = (index: number, last: number): 'start' | 'center' | 'end' => {
      if (index === 0) {
        return 'start';
      }
      if (index === last) {
        return 'end';
      }
      return 'center';
    };

    if (!levels.length) {
      return Array.from({ length: 10 }, (_, index) => ({
        id: `y-fallback-${index}`,
        label: '—',
        topPercent: index === 0 ? 0 : index === 9 ? 100 : (index / 9) * 100,
        align: tickAlign(index, 9),
      }));
    }

    const last = levels.length - 1;
    return levels.map((level, index) => ({
      id: `y-${index}`,
      label: level.label,
      topPercent: plotHeight > 0 ? (level.y / plotHeight) * 100 : 50,
      align: tickAlign(index, last),
    }));
  });

  readonly hoverInfo = computed(() => {
    const index = this.activeHoverIndex();
    const plotPoints = this.plotPoints();
    const prices = this.visiblePrices();
    if (index === null || !plotPoints.length || !prices.length) {
      return null;
    }

    const bounds = this.priceBounds();
    const price =
      bounds !== null && prices.length
        ? priceAtSeriesIndex(plotPoints, index, bounds.high, bounds.low)
        : null;

    const value = plotPoints[index] ?? 50;
    const xPercent = plotPoints.length <= 1 ? 0 : (index / (plotPoints.length - 1)) * 100;
    const timestamps = this.visibleTimestamps();
    const tf = this.activeTimeframe();
    const spanMs =
      timestamps.length > 1 ? timestamps[timestamps.length - 1] - timestamps[0] : 0;
    const hoverTs = timestamps[index];
    const label =
      hoverTs !== undefined
        ? formatHoverTimestamp(hoverTs, tf.coingeckoGranularity, timestamps[0] ?? hoverTs, spanMs)
        : '';

    const ohlc =
      this.chartType() === 'candles'
        ? ohlcAtIndex(plotPoints, prices, index)
        : null;

    return {
      index,
      xPercent,
      yPercent: 100 - value,
      tipAlign: (xPercent < 18 ? 'start' : xPercent > 82 ? 'end' : 'center') as 'start' | 'end' | 'center',
      label,
      price: price !== null ? this.formatAxisPrice(price, bounds?.reference ?? '') : '—',
      ohlc,
      pinned: this.pinnedIndex() !== null,
    };
  });

  readonly axisTicks = computed(() => {
    void this.activeTimeframeId();
    void this.activeRange();
    const timestamps = this.visibleTimestamps();
    if (!timestamps.length) {
      return [];
    }

    return buildHorizontalAxisTicks(
      timestamps,
      this.chartGridProfile(),
      this.activeTimeframe().coingeckoGranularity
    );
  });

  readonly plotPointIndices = computed(() => this.plotPoints().map((_, index) => index));

  get chartEndPoint(): { x: number; y: number } {
    return this.getChartEndPoint(this.plotPoints());
  }

  chartViewHeight(): number {
    let h = this.chartHeight;
    if (this.showVolume()) {
      h += this.volumeHeight + 4;
    }
    if (this.showRsi()) {
      h += this.rsiHeight + 2;
    }
    return h;
  }

  constructor() {
    effect(() => {
      const symbol = this.selectedSymbol();
      const range = this.activeRange();
      const currency = this.chartCurrency();
      const compare = this.compareSymbol();
      void symbol;
      void range;
      void currency;
      void compare;
      this.loadChart();
    });

    effect(() => {
      if (!this.hubLayout()) {
        return;
      }
      if (this.chartCurrency() !== 'usd') {
        this.chartCurrency.set('usd');
      }
      this.showVolume.set(true);
    });

    interval(30_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadChart(false));

    this.loadTradeHistory();
  }

  selectRange(range: ChartRange): void {
    if (this.activeRange() === range) {
      return;
    }
    this.activeRange.set(range);
    this.syncTimeframeForRange(range);
    this.resetZoom();
  }

  selectHubPeriod(pill: HubPeriodPill): void {
    if (this.activeRange() === pill.range) {
      return;
    }
    this.selectRange(pill.range);
  }

  toggleHubExpand(event: MouseEvent): void {
    event.stopPropagation();
    const stage = this.hubChartStage?.nativeElement;
    if (!stage?.requestFullscreen) {
      return;
    }
    if (document.fullscreenElement === stage) {
      void document.exitFullscreen();
      return;
    }
    void stage.requestFullscreen();
  }

  toggleTimeframeMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.timeframeMenuOpen.update((open) => !open);
  }

  selectTimeframe(option: ChartTimeframeOption, event: MouseEvent): void {
    event.stopPropagation();
    this.timeframeMenuOpen.set(false);
    this.resetZoom();

    if (option.category === 'period') {
      this.activeTimeframeId.set(option.id);
      if (this.activeRange() !== option.apiRange) {
        this.activeRange.set(option.apiRange);
        return;
      }
      this.refreshSeriesForTimeframe();
      return;
    }

    this.activeTimeframeId.set(option.id);
    const targetRange =
      option.supportedApiRanges?.find((range) => range === this.activeRange()) ??
      option.apiRange;

    if (this.activeRange() !== targetRange) {
      this.activeRange.set(targetRange);
      return;
    }

    this.refreshSeriesForTimeframe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.timeframeMenuOpen()) {
      return;
    }

    const root = this.timeframeMenu?.nativeElement;
    if (root && !root.contains(event.target as Node)) {
      this.timeframeMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeTimeframeMenu(): void {
    this.timeframeMenuOpen.set(false);
  }

  setChartType(type: ChartDisplayType): void {
    if (this.chartType() === type) {
      return;
    }
    this.chartType.set(type);
    localStorage.setItem(CHART_TYPE_STORAGE_KEY, type);
  }

  setCurrency(currency: ChartCurrency): void {
    if (this.chartCurrency() === currency) {
      return;
    }
    this.chartCurrency.set(currency);
    localStorage.setItem(CHART_CURRENCY_STORAGE_KEY, currency);
  }

  cryptoLabel(symbol: BrandCryptoSymbol): string {
    return chartBaseSymbol(symbol);
  }

  selectCrypto(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as BrandCryptoSymbol;
    if (this.selectedSymbol() !== value) {
      this.brandCrypto.select(value);
      this.resetZoom();
    }
  }

  onCurrencyChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ChartCurrency;
    this.setCurrency(value);
  }

  setCompare(symbol: string): void {
    this.compareSymbol.set(symbol);
  }

  onZoomInput(which: 'start' | 'end', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (which === 'start') {
      this.zoomStart.set(Math.min(value, this.zoomEnd() - 5));
    } else {
      this.zoomEnd.set(Math.max(value, this.zoomStart() + 5));
    }
  }

  resetZoom(): void {
    this.zoomStart.set(0);
    this.zoomEnd.set(100);
  }

  toggleMa(): void {
    this.showMa.update((value) => !value);
  }

  toggleRsi(): void {
    this.showRsi.update((value) => !value);
  }

  toggleVolume(): void {
    this.showVolume.update((value) => !value);
  }

  toggleAlertPanel(): void {
    this.alertPanelOpen.update((value) => !value);
    const existing = this.chartAlerts.alertFor(this.selectedSymbol());
    this.alertAbove.set(existing?.above?.toString() ?? '');
    this.alertBelow.set(existing?.below?.toString() ?? '');
  }

  saveAlert(): void {
    const symbol = this.selectedSymbol();
    const above = this.parsePrice(this.alertAbove()) ?? null;
    const below = this.parsePrice(this.alertBelow()) ?? null;
    this.chartAlerts.setAlert(symbol, above, below);
    this.alertPanelOpen.set(false);
    this.checkAlertThreshold();
  }

  clearAlert(): void {
    this.chartAlerts.clearAlert(this.selectedSymbol());
    this.alertAbove.set('');
    this.alertBelow.set('');
    this.alertPanelOpen.set(false);
  }

  retry(): void {
    this.loadChart();
  }

  refresh(): void {
    this.loadChart();
  }

  exportChart(): void {
    const svg = this.chartSvg?.nativeElement;
    if (!svg) {
      return;
    }

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(clone);
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 640;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0b0e14';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) {
            return;
          }
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `dartchain-${this.pairBase()}-${this.activeRange()}.png`;
          link.click();
          URL.revokeObjectURL(link.href);
        });
      }
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  onPlotMove(event: MouseEvent): void {
    if (this.pinnedIndex() !== null) {
      return;
    }

    const index = this.indexFromEvent(event);
    if (index !== null) {
      this.hoverIndex.set(index);
    }
  }

  onPointHover(index: number): void {
    if (this.pinnedIndex() !== null) {
      return;
    }
    this.hoverIndex.set(index);
  }

  onPointClick(index: number, event: MouseEvent): void {
    event.stopPropagation();

    if (this.pinnedIndex() === index) {
      this.pinnedIndex.set(null);
      return;
    }

    this.pinnedIndex.set(index);
    this.hoverIndex.set(index);
  }

  onPlotClick(event: MouseEvent): void {
    const index = this.indexFromEvent(event);
    if (index === null) {
      return;
    }

    if (this.pinnedIndex() === index) {
      this.pinnedIndex.set(null);
      return;
    }

    this.pinnedIndex.set(index);
    this.hoverIndex.set(index);
  }

  plotPointX(index: number): number {
    const n = this.plotPoints().length;
    if (n <= 1) {
      return 0;
    }
    return (index / (n - 1)) * this.chartWidth;
  }

  hitRectWidth(): number {
    const n = this.plotPoints().length;
    if (n <= 1) {
      return this.chartWidth;
    }
    return this.chartWidth / (n - 1);
  }

  hitRectX(index: number): number {
    const n = this.plotPoints().length;
    const width = this.hitRectWidth();
    if (n <= 1) {
      return 0;
    }
    const center = (index / (n - 1)) * this.chartWidth;
    return Math.max(0, Math.min(this.chartWidth - width, center - width / 2));
  }

  clearHover(): void {
    if (this.pinnedIndex() === null) {
      this.hoverIndex.set(null);
    }
  }

  unpin(): void {
    this.pinnedIndex.set(null);
  }

  buildGridLines(rows: number, height = this.chartHeight): string[] {
    return Array.from({ length: rows }, (_, index) => {
      const y = ((index + 1) / (rows + 1)) * height;
      return `M0 ${y.toFixed(2)} L100 ${y.toFixed(2)}`;
    });
  }

  buildChartLine(points: number[]): string {
    const width = this.chartWidth;
    const height = this.chartHeight;
    const last = points.length - 1;

    if (last <= 0) {
      return `M0 ${height / 2} L100 ${height / 2}`;
    }

    return points
      .map((point, index) => {
        const x = (index / last) * width;
        const y = height - (point / 100) * height;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }

  buildChartArea(points: number[]): string {
    const h = this.chartHeight;
    return `${this.buildChartLine(points)} L100 ${h} L0 ${h} Z`;
  }

  trackCandle(_: number, candle: CandleSvgLayout): string {
    return `${candle.x}-${candle.bodyY}`;
  }

  private loadChart(showLoading = true): void {
    const symbol = this.selectedSymbol();

    if (symbol === BRAND_DEFAULT_CRYPTO) {
      this.loadDartChart(showLoading, symbol);
      return;
    }

    this.loadMarketChart(showLoading, symbol);
  }

  private loadDartChart(showLoading: boolean, symbol: BrandCryptoSymbol): void {
    if (showLoading) {
      this.loading.set(true);
    }

    this.error.set(false);
    const pair = chartPairForSymbol(symbol);

    this.api
      .getChart(this.activeRange(), pair)
      .pipe(take(1))
      .subscribe({
        next: (chart) => {
          if (!chart) {
            this.error.set(true);
            this.loading.set(false);
            return;
          }

          const values = chart.points.map((point) => point.v);
          const low = this.parsePrice(chart.low) ?? 0;
          const high = this.parsePrice(chart.high) ?? low;
          const minV = Math.min(...values);
          const maxV = Math.max(...values);
          const prices = values.map((value) => {
            const ratio = maxV === minV ? 0.5 : (value - minV) / (maxV - minV);
            return low + (high - low) * ratio;
          });
          const plotCoords = pricesToChartCoordinates(prices);

          const timestamps = chart.points.map((point) => point.t);

          this.applySeries({
            currentPrice: chart.currentPrice,
            changePercent: chart.changePercent,
            positive: chart.positive,
            high: chart.high,
            low: chart.low,
            volume: chart.volume,
            points: plotCoords,
            volumes: this.deriveVolumes(plotCoords),
            prices,
            timestamps,
          });
          this.loadCompareOverlay();
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  private loadMarketChart(showLoading: boolean, symbol: BrandCryptoSymbol): void {
    if (showLoading) {
      this.loading.set(true);
    }

    this.error.set(false);

    this.rates
      .getMarketChart(
        symbol,
        this.activeRange(),
        this.chartCurrency(),
        this.brandCrypto.selectedCoinId()
      )
      .pipe(
        take(1),
        switchMap((chart) => {
          if (chart) {
            return of(chart);
          }
          return this.rates.getLivePanels().pipe(
            map((panels) => this.chartFromPanel(panels.find((entry) => entry.symbol === symbol)))
          );
        })
      )
      .subscribe({
        next: (chart) => {
          if (!chart) {
            this.error.set(true);
            this.loading.set(false);
            return;
          }

          this.applySeries(chart);
          this.loadCompareOverlay();
          this.loading.set(false);
        },
        error: () => {
          this.fallbackFromPanels(symbol);
        },
      });
  }

  private fallbackFromPanels(symbol: BrandCryptoSymbol): void {
    this.rates
      .getLivePanels()
      .pipe(take(1))
      .subscribe({
        next: (panels) => {
          const chart = this.chartFromPanel(panels.find((entry) => entry.symbol === symbol));
          if (!chart) {
            this.error.set(true);
            this.loading.set(false);
            return;
          }
          this.applySeries(chart);
          this.loadCompareOverlay();
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  private chartFromPanel(panel: RatePanelData | undefined): MarketChartData | null {
    if (!panel) {
      return null;
    }

    const shape = panel.points?.length ? [...panel.points] : [50, 50, 50, 50];
    const price = this.parsePrice(panel.value) ?? 0;
    const { high, low } = this.estimateHighLow(panel.value, shape);
    const change = Number.parseFloat(panel.change.replace('%', '').replace('+', ''));
    const lowP = this.parsePrice(low) ?? price;
    const highP = this.parsePrice(high) ?? price;
    const minShape = Math.min(...shape);
    const maxShape = Math.max(...shape);
    const prices = shape.map((value) => {
      const ratio = maxShape === minShape ? 0.5 : (value - minShape) / (maxShape - minShape);
      return lowP + (highP - lowP) * ratio;
    });
    const plotCoords = pricesToChartCoordinates(prices);

    const timestamps = syntheticTimestamps(
      prices.length,
      this.activeTimeframe().coingeckoGranularity
    );

    return {
      symbol: panel.symbol,
      range: this.activeRange(),
      currency: this.chartCurrency(),
      currentPrice: panel.value,
      changePercent: Number.isNaN(change) ? 0 : change,
      positive: panel.positive,
      high,
      low,
      volume: '24h',
      points: plotCoords,
      volumes: this.deriveVolumes(plotCoords),
      prices,
      timestamps,
    };
  }

  private loadCompareOverlay(): void {
    const compare = this.compareSymbol();
    if (compare === COMPARE_NONE || compare === this.selectedSymbol()) {
      this.comparePoints.set(null);
      return;
    }

    if (this.selectedSymbol() === BRAND_DEFAULT_CRYPTO) {
      this.comparePoints.set(null);
      return;
    }

    this.rates
      .getMarketChart(
        compare,
        this.activeRange(),
        this.chartCurrency(),
        this.brandCrypto.selectedCoinId()
      )
      .pipe(take(1))
      .subscribe((chart) => {
        this.comparePoints.set(chart?.points ?? null);
      });
  }

  private applySeries(chart: {
    currentPrice: string;
    changePercent?: number;
    positive: boolean;
    high: string;
    low: string;
    volume: string;
    points: number[];
    volumes: number[];
    prices: number[];
    timestamps?: number[];
  }): void {
    const granularity = this.activeTimeframe().coingeckoGranularity;
    const timestamps =
      chart.timestamps?.length === chart.prices.length
        ? [...chart.timestamps]
        : syntheticTimestamps(chart.prices.length, granularity);

    this.baseSeries.set({
      currentPrice: chart.currentPrice,
      changePercent: chart.changePercent,
      positive: chart.positive,
      volume: chart.volume,
      points: [...chart.points],
      volumes: [...chart.volumes],
      prices: [...chart.prices],
      timestamps,
    });
    this.refreshSeriesForTimeframe();
    this.hoverIndex.set(null);
    this.pinnedIndex.set(null);
    this.loadTradeHistory();
  }

  private syncTimeframeForRange(range: ChartRange): void {
    const current = this.activeTimeframe();

    if (current.category === 'period' && current.apiRange === range) {
      return;
    }

    if (isIntervalId(current.id) && current.supportedApiRanges?.includes(range)) {
      return;
    }

    const matchingPeriod = CHART_PERIOD_OPTIONS.find((option) => option.apiRange === range);
    this.activeTimeframeId.set(matchingPeriod?.id ?? defaultIntervalForRange(range));
  }

  private refreshSeriesForTimeframe(): void {
    const base = this.baseSeries();
    if (!base) {
      return;
    }

    const chart = transformSeriesForTimeframe(base, this.activeTimeframeId(), this.activeRange());
    this.chartPrice.set(chart.currentPrice);
    this.chartDelta.set(
      chart.changePercent !== undefined
        ? `${chart.changePercent >= 0 ? '+' : ''}${chart.changePercent.toFixed(2)}%`
        : '—'
    );
    this.chartPositive.set(chart.positive);
    this.seriesVolumeLabel.set(chart.volume);
    this.chartPoints.set(chart.points);
    this.volumeBars.set(chart.volumes);
    this.rawPrices.set(chart.prices);
    this.rawTimestamps.set(chart.timestamps);
    this.checkAlertThreshold();
  }

  private checkAlertThreshold(): void {
    const price = this.parsePrice(this.chartPrice());
    if (price !== null) {
      this.chartAlerts.evaluate(this.selectedSymbol(), price);
    }
  }

  private loadTradeHistory(): void {
    const symbol = this.selectedSymbol();
    this.blockchain
      .getPendingTransactions()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((txs) => {
        const lines = txs
          .filter((tx) => {
            const blob = `${tx.data ?? ''} ${tx.payload ?? ''}`.toUpperCase();
            return blob.includes(symbol.toUpperCase()) || blob.includes('SWAP');
          })
          .slice(0, 3)
          .map((tx) => {
            const amount = tx.amount ?? 0;
            return `#${tx.id.slice(0, 6)} · ${amount} · ${tx.data?.slice(0, 24) ?? 'tx'}`;
          });
        this.tradeLines.set(lines.length ? lines : ['Aucune transaction récente pour cette paire']);
      });
  }

  private deriveVolumes(points: number[]): number[] {
    if (points.length < 2) {
      return points.map(() => 50);
    }

    const deltas = points.slice(1).map((value, index) => Math.abs(value - points[index]));
    const max = Math.max(...deltas, 1);
    return [50, ...deltas.map((value) => 12 + (value / max) * 76)];
  }

  private interpolatePrice(
    chart: { high: string; low: string; currentPrice: string; points: { v: number }[] },
    ratio: number
  ): number {
    const high = this.parsePrice(chart.high) ?? 0;
    const low = this.parsePrice(chart.low) ?? 0;
    return low + (high - low) * ratio;
  }

  private indexFromEvent(event: MouseEvent): number | null {
    const plot = event.currentTarget as HTMLElement;
    const rect = plot.getBoundingClientRect();
    if (rect.width <= 0) {
      return null;
    }

    const x = event.clientX - rect.left;
    const plotPoints = this.plotPoints();
    const n = plotPoints.length;
    if (!n) {
      return null;
    }

    if (n === 1) {
      return 0;
    }

    let nearest = 0;
    let nearestDist = Number.POSITIVE_INFINITY;

    for (let index = 0; index < n; index++) {
      const pointX = (index / (n - 1)) * rect.width;
      const dist = Math.abs(x - pointX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = index;
      }
    }

    return nearest;
  }

  private resolveGridTimestamps(): number[] {
    const timestamps = this.visibleTimestamps();
    if (timestamps.length >= 2) {
      return timestamps;
    }

    const count = Math.max(this.visiblePrices().length, 2);
    return syntheticTimestamps(count, this.activeTimeframe().coingeckoGranularity);
  }

  private priceBounds(): { high: number; low: number; reference: string } | null {
    const prices = this.visiblePrices();
    if (!prices.length) {
      return null;
    }

    return {
      high: Math.max(...prices),
      low: Math.min(...prices),
      reference: this.chartPrice(),
    };
  }

  private parsePrice(value: string): number | null {
    const parsed = Number.parseFloat(value.replace(/\s/g, '').replace(',', '.'));
    return Number.isNaN(parsed) ? null : parsed;
  }

  private estimateHighLow(currentValue: string, points: number[]): { high: string; low: string } {
    const base = this.parsePrice(currentValue) ?? 0;
    const spread = Math.max(Math.max(...points) - Math.min(...points), 8) / 100;
    const high = base * (1 + spread * 0.5);
    const low = base * (1 - spread * 0.5);
    return {
      high: this.formatAxisPrice(high, currentValue),
      low: this.formatAxisPrice(low, currentValue),
    };
  }

  private formatAxisPrice(value: number, reference: string): string {
    if (!reference || reference === '—') {
      return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    }

    const usesComma = reference.includes(',');
    const formatted = value.toLocaleString('fr-FR', {
      maximumFractionDigits: reference.includes('.') || usesComma ? 4 : 0,
    });
    return usesComma ? formatted : formatted.replace(',', '.');
  }

  private loadChartType(): ChartDisplayType {
    const stored = localStorage.getItem(CHART_TYPE_STORAGE_KEY);
    return stored === 'candles' ? 'candles' : 'line';
  }

  private loadCurrency(): ChartCurrency {
    const stored = localStorage.getItem(CHART_CURRENCY_STORAGE_KEY);
    if (stored === 'usd' || stored === 'r4v3') {
      return stored;
    }
    return 'eur';
  }

  private getChartEndPoint(points: number[]): { x: number; y: number } {
    const last = points.length - 1;

    if (last <= 0) {
      return { x: 100, y: this.chartHeight / 2 };
    }

    const lastPoint = points[last] ?? 50;

    return {
      x: 100,
      y: this.chartHeight - (lastPoint / 100) * this.chartHeight,
    };
  }
}
