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
  output,
  signal,
  booleanAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CollapsedBarActionsComponent } from '../../../components/collapsed-bar-actions/collapsed-bar-actions';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';

import {
  EXCHANGE_NATIVE_TOKEN,
  isExchangeNativeToken,
  isLaunchpadSwapToken,
} from '@core/constants/exchange-launchpad.constants';
import {
  R4V3_PEG_DISPLAY_DELTA,
  R4V3_PEG_DISPLAY_PRICE,
} from '@core/constants/r4v3-token.constants';
import {
  formatMarketDelta,
  stripUsdFromMarketLabel,
} from '@core/utils/market-display.util';
import { LaunchProject, ChartRange } from '@core/models/showcase.model';
import { MarketDataService } from '@core/services/market-data.service';
import { RatePanelPreferencesService } from '@core/services/rate-panel-preferences.service';
import { ShowcaseLaunchStateService } from '@core/services/showcase-launch-state.service';
import { ShowcaseR4v3StateService } from '@core/services/showcase-r4v3-state.service';
import { R4v3ThreeComponent } from '../../../components/r4v3-three/r4v3-three';
import { ChartSearchResult } from './chart-token-search.model';
import { ChartTokenSearchComponent } from './chart-token-search';
import { readChartWatchlist, upsertChartWatchlist } from './chart-watchlist.util';
import {
  BRAND_DEFAULT_CRYPTO,
  BrandCryptoSymbol,
  RATE_PANEL_SYMBOLS,
  RatePanelSymbol,
  chartBaseSymbol,
  chartPairForSymbol,
  chartQuoteSymbol,
} from '@core/constants/rate-panel-symbols';
import { ChartAlertsService } from '@core/services/chart-alerts.service';
import { ChartSummaryStateService } from '@core/services/chart-summary-state.service';
import { BrandCryptoSelectionService } from '@core/services/brand-crypto-selection.service';
import {
  ChartCurrency,
  CryptoRatesService,
  MarketChartData,
  RatePanelData,
} from '@core/services/crypto-rate.service';
import { BlockchainApiService } from '@core/services/blockchain-api.service';
import { ShowcaseApiService } from '@core/services/showcase-api.service';
import {
  CandleSvgLayout,
  ChartDisplayType,
  buildChartTrendSegments,
  buildOhlcFromPriceSeries,
  chartYFromNormalizedCoord,
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
import {
  R4v3ChartView,
  buildR4v3DepthBars,
  buildR4v3Heatmap,
  buildR4v3PulseSpikes,
  buildR4v3Series,
  buildR4v3TimelinePins,
  buildR4v3Waterfall,
  computeR4v3FlowStats,
  computeR4v3HealthScore,
  resampleActivitySeries,
  r4v3AxisHint,
  r4v3ResolvedViewLabel,
  r4v3ViewHint,
  r4v3ViewLabel,
  resolveR4v3AutoView,
} from './r4v3-chart.util';

const CHART_TYPES: ReadonlyArray<{ id: ChartDisplayType; label: string }> = [
  { id: 'line', label: 'Courbe' },
  { id: 'candles', label: 'Bougies' },
];

const CURRENCIES: ReadonlyArray<{ id: ChartCurrency; label: string }> = [
  { id: 'eur', label: 'EUR' },
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

const R4V3_VIEW_PILLS: readonly { id: R4v3ChartView; badge: string; hint: string }[] = [
  { id: 'auto', badge: 'AUTO', hint: r4v3ViewHint('auto') },
  { id: 'flow', badge: 'VUE', hint: r4v3ViewHint('flow') },
  { id: 'pulse', badge: 'PULSE', hint: r4v3ViewHint('pulse') },
  { id: 'fuel', badge: 'FUEL', hint: r4v3ViewHint('fuel') },
  { id: 'health', badge: 'SANTÉ', hint: r4v3ViewHint('health') },
];

const R4V3_PEG_PRICE = R4V3_PEG_DISPLAY_PRICE;
const R4V3_PEG_DELTA = R4V3_PEG_DISPLAY_DELTA;

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
  imports: [
    CommonModule,
    R4v3ThreeComponent,
    ChartTokenSearchComponent,
    CollapsedBarActionsComponent,
  ],
  templateUrl: './showcase-chart.html',
  styleUrls: ['./showcase-chart.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.showcase-chart--hub-collapsed]': 'hubLayout() && chartCollapsed()',
    '[class.showcase-chart--compact]': 'compactLayout()',
    '[class.showcase-chart--r4v3]': 'isR4v3Chart()',
    '[class.showcase-chart--launch-overlay]': 'hubLaunchOverlay()',
  },
})
export class ShowcaseChartComponent {
  /** Layout hub marché (maquette : titre, pills, footer stats). */
  readonly hubLayout = input(false, { transform: booleanAttribute });
  readonly chartCollapsed = input(false, { transform: booleanAttribute });
  /** Bandeau R4V3 : graphique compact avec pills 1H/24H/7J. */
  readonly compactLayout = input(false, { transform: booleanAttribute });
  readonly collapseAriaLabel = input('Replier le graphique');
  readonly collapseToggle = output<void>();

  private readonly api = inject(ShowcaseApiService);
  private readonly rates = inject(CryptoRatesService);
  private readonly blockchain = inject(BlockchainApiService);
  private readonly brandCrypto = inject(BrandCryptoSelectionService);
  private readonly chartAlerts = inject(ChartAlertsService);
  private readonly chartSummary = inject(ChartSummaryStateService);
  private readonly launchState = inject(ShowcaseLaunchStateService);
  private readonly r4v3State = inject(ShowcaseR4v3StateService);
  private readonly marketData = inject(MarketDataService);
  private readonly preferences = inject(RatePanelPreferencesService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('chartSvg') chartSvg?: ElementRef<SVGSVGElement>;
  @ViewChild('timeframeMenu') timeframeMenu?: ElementRef<HTMLElement>;
  @ViewChild('r4v3PeriodMenuRoot') r4v3PeriodMenuRoot?: ElementRef<HTMLElement>;
  @ViewChild('r4v3ViewMenuRoot') r4v3ViewMenuRoot?: ElementRef<HTMLElement>;
  @ViewChild(ChartTokenSearchComponent) chartTokenSearch?: ChartTokenSearchComponent;

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
  readonly compactPeriodPills: readonly HubPeriodPill[] = [
    { range: '1h', badge: '1H' },
    { range: '24h', badge: '24H' },
    { range: '7d', badge: '7J' },
  ];
  readonly r4v3ViewPills = R4V3_VIEW_PILLS;

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
  readonly r4v3ViewMode = signal<R4v3ChartView>('auto');
  readonly r4v3ViewMenuOpen = signal(false);
  readonly r4v3PeriodMenuOpen = signal(false);
  readonly r4v3LivePulse = signal(false);
  readonly showLaunchCurve = signal(true);
  readonly showR4v3OverlayCurve = signal(true);
  readonly chartWatchlist = signal<ChartSearchResult[]>(readChartWatchlist());
  readonly tokenThumbBySymbol = signal<Readonly<Record<string, string>>>({});
  readonly heatmapPulseIndex = signal<number | null>(null);
  readonly pricePulse = signal(false);
  readonly chartTransition = signal(false);
  readonly brokenTokenLogos = signal<ReadonlySet<string>>(new Set());

  private pricePulseTimer: ReturnType<typeof setTimeout> | null = null;
  private chartTransitionTimer: ReturnType<typeof setTimeout> | null = null;
  private touchScrubbing = false;
  private pinchStartDistance: number | null = null;
  private pinchStartZoom = { start: 0, end: 100 };
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPlotTapAt = 0;

  readonly chartPrice = signal('—');
  readonly chartDelta = signal('—');
  readonly chartPositive = signal(true);
  /** Valeurs marché réelles partagées avec la navbar (sans peg pédagogique R4V3). */
  readonly marketSummaryPrice = signal('—');
  readonly marketSummaryDelta = signal('—');
  readonly marketSummaryPositive = signal(true);
  readonly marketSummaryVolume = signal('—');
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
  readonly isR4v3Chart = computed(() => this.isNativeDart());
  readonly hubLaunchOverlay = computed(() => {
    if (!this.hubLayout() || this.isR4v3Chart()) {
      return false;
    }

    return isLaunchpadSwapToken(this.pairBase());
  });
  readonly currencyLabel = computed(() => {
    const id = this.chartCurrency();
    if (id === 'usd') {
      return 'CHF';
    }
    return this.currencies.find((entry) => entry.id === id)?.label ?? 'EUR';
  });

  readonly chartHeight = 100;
  readonly volumeHeight = 14;
  readonly rsiHeight = 16;
  /** Marge SVG gauche (%) — hub : bord gauche du tracé ; desktop : marge prix. */
  get chartPlotInset(): number {
    return this.hubLayout() || this.compactLayout() ? 0 : 2;
  }
  readonly chartPlotRight = 100;
  get chartPlotWidth(): number {
    return this.chartPlotRight - this.chartPlotInset;
  }
  private readonly chartWidth = 100;

  /** Coordonnées SVG (0–100) dérivées des prix visibles — source unique pour courbe / bougies. */
  readonly plotPoints = computed(() => {
    void this.activeTimeframeId();
    void this.activeRange();
    return pricesToChartCoordinates(this.visiblePrices());
  });

  /** Hub / compact : toujours courbe (évite mode bougies vide sans contrôle UI). */
  readonly effectiveChartType = computed((): ChartDisplayType =>
    this.hubLayout() || this.compactLayout() ? 'line' : this.chartType()
  );

  /** Segments vert/rouge pour le mode courbe. */
  readonly lineTrendSegments = computed(() =>
    this.buildPlotTrendSegments(this.displayPlotPoints())
  );

  /** Courbe garantie — repli sparkline si données insuffisantes. */
  readonly renderTrendSegments = computed(() => {
    const segments = this.lineTrendSegments();
    if (segments.length) {
      return segments;
    }

    return this.buildPlotTrendSegments(undefined);
  });

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
    const cleaned = stripUsdFromMarketLabel(label);
    const unit = this.currencyLabel();
    return cleaned.toUpperCase().includes(unit.toUpperCase()) ? cleaned : `${cleaned} ${unit}`;
  });

  readonly hubYAxisTitle = computed(() => {
    if (this.isR4v3Chart()) {
      return this.r4v3AxisTitle();
    }
    return `PRIX (${this.currencyLabel()})`;
  });

  readonly hubFooterVol = computed(() => {
    const vol = this.chartVolume();
    if (!vol || vol === '—') {
      return '—';
    }
    const base = this.pairBase();
    return vol.toUpperCase().includes(base) ? vol : `${vol} ${base}`;
  });

  readonly activeLaunchProject = computed((): LaunchProject | null => {
    const symbol = this.pairBase().trim().toUpperCase();
    if (!isLaunchpadSwapToken(symbol)) {
      return null;
    }

    return (
      this.launchState
        .projects()
        .find((project) => project.symbol.trim().toUpperCase() === symbol) ?? null
    );
  });

  readonly hubLaunchRaised = computed(() => this.activeLaunchProject()?.raised?.trim() || '—');

  readonly hubLaunchTarget = computed(() => {
    const target = this.activeLaunchProject()?.target?.trim();
    return target || '—';
  });

  readonly hubLaunchStatusLabel = computed(() => {
    const status = this.activeLaunchProject()?.status;
    switch (status) {
      case 'LIVE':
        return 'Live';
      case 'SOON':
        return 'Soon';
      case 'ENDED':
        return 'Ended';
      default:
        return null;
    }
  });

  readonly hubLaunchStatusClass = computed(() => {
    const status = this.activeLaunchProject()?.status;
    switch (status) {
      case 'LIVE':
        return 'live';
      case 'SOON':
        return 'soon';
      case 'ENDED':
        return 'ended';
      default:
        return '';
    }
  });

  readonly hubHasLaunchDetails = computed(
    () =>
      this.hubLaunchRaised() !== '—' ||
      this.hubLaunchTarget() !== '—' ||
      !!this.hubLaunchStatusLabel()
  );

  readonly r4v3LiquidityProxy = computed(() => {
    const volumes = this.visibleVolumes();
    const average = volumes.length
      ? volumes.reduce((sum, value) => sum + value, 0) / volumes.length
      : 50;
    const swapBoost = Math.min((this.r4v3State.swapStats()?.swapNewsCount ?? 0) * 4, 22);
    return Math.max(35, Math.min(95, average * 0.55 + swapBoost + 18));
  });

  readonly r4v3Context = computed(() => ({
    pointCount: this.plotPoints().length,
    volumes: this.visibleVolumes(),
    timestamps: this.visibleTimestamps(),
    panelPoints: this.r4v3State.panel()?.points ?? [],
    recentTrades: this.marketData
      .recentTrades()
      .filter(
        (trade) =>
          trade.fromToken.trim().toUpperCase() === EXCHANGE_NATIVE_TOKEN ||
          trade.toToken.trim().toUpperCase() === EXCHANGE_NATIVE_TOKEN
      )
      .slice(0, 24),
    swapNewsCount: this.r4v3State.swapStats()?.swapNewsCount ?? 0,
    launchProjects: this.launchState.projects(),
    liquidityProxy: this.r4v3LiquidityProxy(),
  }));

  readonly r4v3EffectiveView = computed((): Exclude<R4v3ChartView, 'auto'> => {
    const mode = this.r4v3ViewMode();
    if (mode !== 'auto') {
      return mode;
    }
    return resolveR4v3AutoView(this.r4v3Context());
  });

  readonly r4v3PlotPoints = computed(() => buildR4v3Series(this.r4v3Context(), this.r4v3ViewMode()));

  readonly r4v3OverlayPlotPoints = computed(() => {
    if (!this.hubLaunchOverlay()) {
      return [] as number[];
    }

    const overlay = this.r4v3PlotPoints();
    const count = this.plotPoints().length;
    if (!count) {
      return overlay;
    }

    return resampleActivitySeries(overlay, count);
  });

  readonly r4v3OverlayTrendSegments = computed(() =>
    this.buildPlotTrendSegments(this.r4v3OverlayPlotPoints())
  );

  readonly renderR4v3OverlayTrendSegments = computed(() => {
    const segments = this.r4v3OverlayTrendSegments();
    if (segments.length) {
      return segments;
    }

    return this.buildPlotTrendSegments(undefined);
  });

  /** Courbe toujours rendue — jamais de SVG vide en hub. */
  readonly hasRenderableCurve = computed(() => this.renderTrendSegments().length > 0);

  readonly r4v3OverlayLastTrendUp = computed(() => {
    const segments = this.r4v3OverlayTrendSegments();
    return segments.length ? segments[segments.length - 1].up : true;
  });

  readonly displayPlotPoints = computed(() =>
    this.isR4v3Chart() ? this.r4v3PlotPoints() : this.plotPoints()
  );

  readonly r4v3Heatmap = computed(() =>
    buildR4v3Heatmap(this.r4v3Context(), this.chartWidth, this.chartPlotInset)
  );

  readonly r4v3Waterfall = computed(() =>
    buildR4v3Waterfall(this.r4v3Context(), this.chartWidth, this.chartHeight, this.chartPlotInset)
  );

  readonly r4v3TimelinePins = computed(() =>
    buildR4v3TimelinePins(
      this.r4v3PlotPoints(),
      this.r4v3Context(),
      this.chartWidth,
      this.chartPlotInset
    )
  );

  readonly r4v3PulseSpikes = computed(() =>
    buildR4v3PulseSpikes(
      this.r4v3PlotPoints(),
      this.r4v3Context(),
      this.chartWidth,
      this.chartHeight,
      this.chartPlotInset
    )
  );

  readonly r4v3DepthBars = computed(() =>
    buildR4v3DepthBars(
      this.chartWidth,
      this.chartHeight,
      this.chartPlotInset,
      this.r4v3Context().liquidityProxy
    )
  );

  readonly r4v3FlowStats = computed(() => computeR4v3FlowStats(this.r4v3Context()));

  readonly r4v3HealthScore = computed(() => computeR4v3HealthScore(this.r4v3Context()));

  readonly r4v3FuelTotal = computed(() => {
    const total = this.r4v3Context().launchProjects.reduce((sum, project) => {
      const raw = Number.parseFloat((project.raised ?? '0').replace(/[^\d.-]/g, ''));
      return sum + (Number.isFinite(raw) ? raw : 0);
    }, 0);
    return total > 0 ? formatCompactMetric(total) : '—';
  });

  readonly r4v3LastSwapSummary = computed(
    () => this.r4v3State.swapStats()?.lastSwapSummary?.trim() || '—'
  );

  /** Badge du mode R4V3 sur le trigger — libellé court uniquement (ex. AUTO, pas « Auto · Santé »). */
  readonly r4v3ViewBadge = computed(() => {
    const view = this.r4v3ViewMode();
    return this.r4v3ViewPills.find((pill) => pill.id === view)?.badge ?? r4v3ViewLabel(view);
  });

  /** Libellé résolu (Auto · Mode) — réservé aux hints / accessibilité, pas au trigger. */
  readonly r4v3ViewResolvedBadge = computed(() =>
    r4v3ResolvedViewLabel(this.r4v3ViewMode(), this.r4v3Context())
  );

  readonly r4v3ViewTriggerAriaLabel = computed(
    () => `Mode d'affichage : ${this.r4v3ViewResolvedBadge()}`
  );

  /** Libellé court du mode actif (sans préfixe Auto ·). */
  readonly r4v3ViewMenuLabel = computed(() => {
    const view = this.r4v3ViewMode();
    const resolved = view === 'auto' ? resolveR4v3AutoView(this.r4v3Context()) : view;
    return r4v3ViewLabel(resolved);
  });

  readonly hubActivePeriodBadge = computed(() => {
    const range = this.activeRange();
    return HUB_PERIOD_PILLS.find((pill) => pill.range === range)?.badge ?? range.toUpperCase();
  });

  readonly r4v3AxisTitle = computed(() =>
    r4v3AxisHint(this.r4v3ViewMode(), this.r4v3Context())
  );

  readonly isChartCalm = computed(
    () =>
      (this.isR4v3Chart() || this.hubLaunchOverlay()) &&
      this.r4v3FlowStats().swaps === 0 &&
      !this.loading() &&
      !this.error()
  );

  readonly r4v3InsightLine = computed(() => {
    if (this.loading() || this.error() || !this.isR4v3Chart()) {
      return '';
    }

    if (this.isChartCalm()) {
      return 'Aucun swap — convertir pour alimenter le réseau';
    }

    return '';
  });

  readonly r4v3InsightHasAction = computed(
    () => this.isChartCalm() || this.r4v3FlowStats().swaps === 0
  );

  readonly r4v3InsightHint = computed(() => {
    if (this.isChartCalm()) {
      return 'Ouvrir le panneau de conversion R4V3';
    }
    return this.r4v3InsightLine();
  });

  readonly hubCompareTrendSegments = computed(() => {
    const compare = this.visibleCompare();
    if (!compare?.length || !this.hubLayout()) {
      return [];
    }

    return this.buildPlotTrendSegments(compare);
  });

  readonly compareEndPoint = computed(() => {
    const compare = this.visibleCompare();
    if (!compare?.length) {
      return { x: 0, y: 0 };
    }
    return this.getChartEndPoint(compare);
  });

  readonly r4v3FooterStats = computed((): Array<{
    label: string;
    value: string;
    tone?: 'up' | 'down';
  }> => {
    const flow = this.r4v3FlowStats();

    if (this.isChartCalm()) {
      return [
        { label: 'Santé', value: `${this.r4v3HealthScore()}/100`, tone: 'up' },
        { label: 'Liq.', value: `${Math.round(this.r4v3LiquidityProxy())}%` },
        { label: 'Swaps', value: String(flow.swaps) },
      ];
    }

    const view = this.r4v3EffectiveView();

    switch (view) {
      case 'flow':
        return [
          { label: 'Net', value: flow.netLabel, tone: flow.buys >= flow.sells ? 'up' : 'down' },
          { label: 'Achats', value: flow.buys > 0 ? formatCompactMetric(flow.buys) : '0' },
          { label: 'Ventes', value: flow.sells > 0 ? formatCompactMetric(flow.sells) : '0' },
        ];
      case 'pulse':
        return [
          { label: 'Évén.', value: String(flow.swaps) },
          { label: 'Vol.', value: this.hubFooterVol() },
          { label: 'Live', value: flow.swaps > 0 ? 'On' : '—', tone: flow.swaps > 0 ? 'up' : undefined },
        ];
      case 'fuel':
        return [
          { label: 'Fuel', value: this.r4v3FuelTotal() },
          { label: 'Cible', value: this.hubLaunchTarget() },
          { label: 'Levé', value: this.hubLaunchRaised() },
        ];
      case 'health':
        return [
          { label: 'Santé', value: `${this.r4v3HealthScore()}/100`, tone: 'up' },
          { label: 'Liq.', value: `${Math.round(this.r4v3LiquidityProxy())}%` },
          { label: 'Swaps', value: String(flow.swaps) },
        ];
      default:
        return [
          { label: 'Vol.', value: this.hubFooterVol() },
          { label: 'Net', value: flow.netLabel, tone: flow.buys >= flow.sells ? 'up' : 'down' },
          { label: 'Swaps', value: String(flow.swaps) },
        ];
    }
  });

  readonly hubLinePath = computed(() => this.buildChartLine(this.displayPlotPoints()));

  readonly hubAreaPath = computed(() => this.buildChartArea(this.displayPlotPoints()));

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
    const plotHeight = this.chartHeight;
    const hub = this.hubLayout();

    const tickAlign = (index: number, last: number): 'start' | 'center' | 'end' => {
      if (index === 0) {
        return 'start';
      }
      if (index === last) {
        return 'end';
      }
      return 'center';
    };

    if (this.isR4v3Chart()) {
      const points = this.displayPlotPoints();
      if (points.length) {
        const min = Math.min(...points);
        const max = Math.max(...points);
        const toTopPercent = (coord: number) =>
          plotHeight > 0 ? (chartYFromNormalizedCoord(coord, plotHeight) / plotHeight) * 100 : 50;

        return [
          {
            id: 'act-top',
            label: this.formatActivityTick(max),
            topPercent: toTopPercent(max),
            align: 'start' as const,
          },
          {
            id: 'act-bot',
            label: this.formatActivityTick(min),
            topPercent: toTopPercent(min),
            align: 'end' as const,
          },
        ];
      }
    }

    const levels = this.priceGridLevels();

    if (!levels.length) {
      const count = hub && this.isR4v3Chart() ? 2 : hub ? 3 : 10;
      const fallbackLabels =
        hub && this.isR4v3Chart()
          ? (['Fort', 'Faible'] as const)
          : hub
            ? (['Fort', 'Moyen', 'Faible'] as const)
            : null;
      return Array.from({ length: count }, (_, index) => ({
        id: `y-fallback-${index}`,
        label: fallbackLabels
          ? fallbackLabels[index === 0 ? 0 : fallbackLabels.length - 1]
          : '—',
        topPercent: index === 0 ? 0 : index === count - 1 ? 100 : (index / (count - 1)) * 100,
        align: tickAlign(index, count - 1),
      }));
    }

    const visibleLevels =
      hub && levels.length > 3
        ? [levels[0], levels[Math.floor(levels.length / 2)], levels[levels.length - 1]]
        : levels;

    const last = visibleLevels.length - 1;
    return visibleLevels.map((level, index) => ({
      id: `y-${index}`,
      label: level.label,
      topPercent: plotHeight > 0 ? (level.y / plotHeight) * 100 : 50,
      align: tickAlign(index, last),
    }));
  });

  readonly hoverInfo = computed(() => {
    const index = this.activeHoverIndex();
    const plotPoints = this.displayPlotPoints();
    const prices = this.visiblePrices();
    if (index === null || !plotPoints.length) {
      return null;
    }

    if (!this.isR4v3Chart() && !prices.length) {
      return null;
    }

    const bounds = this.priceBounds();
    const price =
      !this.isR4v3Chart() && bounds !== null && prices.length
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

    const overlayPoints = this.hubLaunchOverlay() ? this.r4v3OverlayPlotPoints() : [];
    const overlayValue = overlayPoints[index];
    const overlayLine =
      this.hubLaunchOverlay() && overlayValue !== undefined
        ? `R4V3 ${Math.round(overlayValue)} · ${this.r4v3AxisTitle()}`
        : null;

    const comparePoints = this.visibleCompare();
    const compareValue = comparePoints?.[index];
    const compareLine =
      comparePoints && compareValue !== undefined && this.compareSymbol() !== COMPARE_NONE
        ? `${this.compareSymbol()} ${Math.round(compareValue)}`
        : null;

    return {
      index,
      xPercent,
      yPercent: 100 - value,
      tipAlign: (xPercent < 18 ? 'start' : xPercent > 82 ? 'end' : 'center') as 'start' | 'end' | 'center',
      label,
      price:
        this.isR4v3Chart()
          ? `${label ? `${label} · ` : ''}${this.formatActivityTick(value)} · ${Math.round(value)} · ${this.r4v3AxisTitle()}`
          : price !== null
            ? this.formatAxisPrice(price, bounds?.reference ?? '')
            : '—',
      overlayLine,
      compareLine,
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

    const ticks = buildHorizontalAxisTicks(
      timestamps,
      this.chartGridProfile(),
      this.activeTimeframe().coingeckoGranularity
    );

    if (!this.hubLayout() || !this.isR4v3Chart() || ticks.length <= 4) {
      return ticks;
    }

    const last = ticks.length - 1;
    const picks = new Set([
      0,
      Math.floor(last / 3),
      Math.floor((last * 2) / 3),
      last,
    ]);

    return ticks.filter((_, index) => picks.has(index));
  });

  readonly plotPointIndices = computed(() => this.plotPoints().map((_, index) => index));

  get chartEndPoint(): { x: number; y: number } {
    return this.getChartEndPoint(this.displayPlotPoints());
  }

  get r4v3OverlayEndPoint(): { x: number; y: number } {
    return this.getChartEndPoint(this.r4v3OverlayPlotPoints());
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
    this.launchState.loadProjects();
    this.marketData.init();

    this.destroyRef.onDestroy(() => {
      if (this.pricePulseTimer != null) {
        clearTimeout(this.pricePulseTimer);
      }
      if (this.chartTransitionTimer != null) {
        clearTimeout(this.chartTransitionTimer);
      }
    });

    effect(() => {
      if (!this.isR4v3Chart() && !this.hubLaunchOverlay()) {
        return;
      }

      if (!this.r4v3State.panel()) {
        this.r4v3State.load(false);
      }
    });

    effect(() => {
      if (!this.isR4v3Chart() && !this.hubLaunchOverlay()) {
        return;
      }

      void this.r4v3State.swapStats()?.swapNewsCount;
      void this.marketData.recentTrades().length;
      this.triggerR4v3LivePulse();
    });

    if (typeof window !== 'undefined') {
      const onSwapComplete = (): void => {
        if (!this.isR4v3Chart() && !this.hubLaunchOverlay()) {
          return;
        }
        this.r4v3State.requestRefresh();
        this.loadChart(false);
        this.triggerR4v3LivePulse();
      };

      window.addEventListener('market-swap-complete', onSwapComplete);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('market-swap-complete', onSwapComplete);
      });
    }

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
      if (this.chartCurrency() !== 'eur') {
        this.chartCurrency.set('eur');
      }
      this.showVolume.set(false);
    });

    effect(() => {
      if (!this.hubLayout()) {
        return;
      }

      if (this.selectedSymbol().trim().toUpperCase() === BRAND_DEFAULT_CRYPTO) {
        return;
      }

      const pair = this.brandCrypto.activeExchangePair();
      if (!pair) {
        return;
      }

      const from = pair.from.trim().toUpperCase();
      const to = pair.to.trim().toUpperCase();
      const launchSymbol = isExchangeNativeToken(from)
        ? to
        : isExchangeNativeToken(to)
          ? from
          : null;

      if (!launchSymbol || !isLaunchpadSwapToken(launchSymbol)) {
        return;
      }

      if (this.selectedSymbol().trim().toUpperCase() !== launchSymbol) {
        this.brandCrypto.selectLaunchChart(launchSymbol);
      }
    });

    interval(30_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadChart(false));

    this.loadTradeHistory();

    this.chartSummary.registerRefreshHandler(() => this.loadChart());

    effect(() => {
      const plotPoints = this.displayPlotPoints();
      const sparklinePoints =
        plotPoints.length >= 2
          ? plotPoints
          : this.chartPoints().length >= 2
            ? this.chartPoints()
            : [50, 48, 44, 46, 40, 42, 38];

      this.chartSummary.sync({
        title: 'Graphique',
        pairLabel: `${this.pairBase()} / ${this.currencyLabel()}`,
        price: this.marketSummaryPrice(),
        delta: this.marketSummaryDelta(),
        positive: this.marketSummaryPositive(),
        rangeBadge: this.activeTimeframeBadge(),
        volume: this.marketSummaryVolume(),
        high: this.chartHigh(),
        low: this.chartLow(),
        loading: this.loading(),
        error: this.error(),
        sparklinePoints,
      });
    });
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
    this.triggerChartTransition();
    this.selectRange(pill.range);
  }

  toggleR4v3PeriodMenu(event: Event): void {
    event.stopPropagation();
    this.r4v3PeriodMenuOpen.update((open) => !open);
    if (this.r4v3PeriodMenuOpen()) {
      this.r4v3ViewMenuOpen.set(false);
    }
  }

  selectHubPeriodFromMenu(pill: HubPeriodPill, event?: Event): void {
    event?.stopPropagation();
    this.r4v3PeriodMenuOpen.set(false);
    this.selectHubPeriod(pill);
  }

  selectR4v3View(view: R4v3ChartView): void {
    if (this.r4v3ViewMode() === view) {
      return;
    }
    this.triggerChartTransition();
    this.r4v3ViewMode.set(view);
  }

  toggleR4v3ViewMenu(event: Event): void {
    event.stopPropagation();
    this.r4v3ViewMenuOpen.update((open) => !open);
    if (this.r4v3ViewMenuOpen()) {
      this.r4v3PeriodMenuOpen.set(false);
    }
  }

  selectR4v3ViewFromMenu(view: R4v3ChartView, event?: Event): void {
    event?.stopPropagation();
    this.r4v3ViewMenuOpen.set(false);
    if (this.r4v3ViewMode() !== view) {
      this.selectR4v3View(view);
    }
  }

  onR4v3InsightAction(): void {
    if (!this.r4v3InsightHasAction()) {
      return;
    }

    window.dispatchEvent(new CustomEvent('exchange-panel-open'));
  }

  onChartTokenSelected(result: ChartSearchResult): void {
    const symbol = result.symbol.trim().toUpperCase();
    this.tokenThumbBySymbol.update((current) => ({
      ...current,
      [symbol]: result.thumb?.trim() || current[symbol] || '',
    }));
    this.chartWatchlist.set(upsertChartWatchlist(result));

    if (symbol === BRAND_DEFAULT_CRYPTO) {
      this.brandCrypto.select(BRAND_DEFAULT_CRYPTO);
      return;
    }

    if (isLaunchpadSwapToken(symbol)) {
      this.brandCrypto.selectLaunchChart(symbol, result.id);
      return;
    }

    this.brandCrypto.select(symbol as BrandCryptoSymbol, result.id);
  }

  toggleLaunchCurveVisibility(): void {
    this.showLaunchCurve.update((visible) => {
      if (visible && !this.showR4v3OverlayCurve()) {
        return true;
      }
      return !visible;
    });
  }

  toggleR4v3OverlayVisibility(): void {
    this.showR4v3OverlayCurve.update((visible) => {
      if (visible && !this.showLaunchCurve()) {
        return true;
      }
      return !visible;
    });
  }

  enableCompareToken(entry: ChartSearchResult): void {
    this.compareSymbol.set(entry.symbol);
    this.loadCompareOverlay();
  }

  onR4v3LogoTap(): void {
    this.triggerPricePulse();
    this.triggerR4v3LivePulse();
  }

  formatActivityTick(value: number): string {
    if (value >= 70) {
      return 'Fort';
    }
    if (value <= 30) {
      return 'Faible';
    }
    return 'Moyen';
  }

  tokenLogoUrl(symbol: string): string | null {
    const normalized = symbol.trim().toUpperCase();
    if (this.brokenTokenLogos().has(normalized)) {
      return null;
    }

    const cached = this.tokenThumbBySymbol()[normalized]?.trim();
    if (cached) {
      return cached;
    }

    const project = this.launchState
      .projects()
      .find((entry) => entry.symbol.trim().toUpperCase() === normalized);

    const logoUrl = project?.logoUrl?.trim();
    return logoUrl ? logoUrl : null;
  }

  onTokenLogoError(symbol: string): void {
    const normalized = symbol.trim().toUpperCase();
    this.brokenTokenLogos.update((current) => {
      if (current.has(normalized)) {
        return current;
      }

      const next = new Set(current);
      next.add(normalized);
      return next;
    });
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
    const target = event.target as Node;

    if (this.timeframeMenuOpen()) {
      const root = this.timeframeMenu?.nativeElement;
      if (root && !root.contains(target)) {
        this.timeframeMenuOpen.set(false);
      }
    }

    if (this.r4v3PeriodMenuOpen()) {
      const periodRoot = this.r4v3PeriodMenuRoot?.nativeElement;
      if (periodRoot && !periodRoot.contains(target)) {
        this.r4v3PeriodMenuOpen.set(false);
      }
    }

    if (this.r4v3ViewMenuOpen()) {
      const menuRoot = this.r4v3ViewMenuRoot?.nativeElement;
      if (menuRoot && !menuRoot.contains(target)) {
        this.r4v3ViewMenuOpen.set(false);
      }
    }
  }

  @HostListener('document:keydown.escape')
  closeTimeframeMenu(): void {
    this.timeframeMenuOpen.set(false);
    this.r4v3PeriodMenuOpen.set(false);
    this.r4v3ViewMenuOpen.set(false);
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
    if (this.touchScrubbing || this.pinnedIndex() !== null) {
      return;
    }

    const index = this.indexFromPointer(event.clientX, event.currentTarget as HTMLElement);
    if (index !== null) {
      this.hoverIndex.set(index);
    }
  }

  onPlotTouchStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      this.pinchStartDistance = this.touchDistance(event.touches);
      this.pinchStartZoom = { start: this.zoomStart(), end: this.zoomEnd() };
      return;
    }

    if (event.touches.length !== 1) {
      return;
    }

    this.touchScrubbing = true;
    const touch = event.touches[0];
    const index = this.indexFromPointer(touch.clientX, event.currentTarget as HTMLElement);
    if (index !== null) {
      this.hoverIndex.set(index);
    }

    if (this.longPressTimer != null) {
      clearTimeout(this.longPressTimer);
    }

    this.longPressTimer = setTimeout(() => {
      if (index !== null) {
        this.pinnedIndex.set(index);
      }
    }, 480);
  }

  onPlotTouchMove(event: TouchEvent): void {
    if (event.touches.length === 2 && this.pinchStartDistance) {
      event.preventDefault();
      const distance = this.touchDistance(event.touches);
      if (distance <= 0) {
        return;
      }

      const ratio = this.pinchStartDistance / distance;
      const span = this.pinchStartZoom.end - this.pinchStartZoom.start;
      const center = (this.pinchStartZoom.start + this.pinchStartZoom.end) / 2;
      const nextSpan = Math.max(12, Math.min(100, span * ratio));
      const nextStart = Math.max(0, center - nextSpan / 2);
      const nextEnd = Math.min(100, center + nextSpan / 2);
      this.zoomStart.set(nextStart);
      this.zoomEnd.set(nextEnd);
      return;
    }

    if (!this.touchScrubbing || event.touches.length !== 1) {
      return;
    }

    event.preventDefault();
    const touch = event.touches[0];
    const index = this.indexFromPointer(touch.clientX, event.currentTarget as HTMLElement);
    if (index !== null) {
      this.hoverIndex.set(index);
      if (this.pinnedIndex() !== null) {
        this.pinnedIndex.set(index);
      }
    }
  }

  onPlotTouchEnd(event: TouchEvent): void {
    if (this.longPressTimer != null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (event.touches.length === 0) {
      this.pinchStartDistance = null;
    }

    if (event.touches.length === 1 && event.changedTouches.length === 1) {
      const now = Date.now();
      if (now - this.lastPlotTapAt < 320) {
        this.resetZoom();
        this.pinnedIndex.set(null);
        this.hoverIndex.set(null);
        this.lastPlotTapAt = 0;
      } else {
        this.lastPlotTapAt = now;
      }
    }

    this.touchScrubbing = false;
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
    this.chartTokenSearch?.closeMenu();

    const now = Date.now();
    if (now - this.lastPlotTapAt < 320) {
      this.resetZoom();
      this.pinnedIndex.set(null);
      this.hoverIndex.set(null);
      this.lastPlotTapAt = 0;
      return;
    }
    this.lastPlotTapAt = now;

    const index = this.indexFromPointer(event.clientX, event.currentTarget as HTMLElement);
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

  private touchDistance(touches: TouchList): number {
    if (touches.length < 2) {
      return 0;
    }

    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
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
    if (this.pinnedIndex() === null && !this.touchScrubbing) {
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
    const height = this.chartHeight;
    const xStart = this.chartPlotInset;
    const xEnd = this.chartPlotRight;
    const plotSpan = Math.max(xEnd - xStart, 1);
    const last = points.length - 1;

    if (last <= 0) {
      return `M${xStart} ${height / 2} L${xEnd} ${height / 2}`;
    }

    return points
      .map((point, index) => {
        const x = xStart + (index / last) * plotSpan;
        const y = chartYFromNormalizedCoord(point, height);
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }

  buildChartArea(points: number[]): string {
    const h = this.chartHeight;
    const xStart = this.chartPlotInset;
    const xEnd = this.chartPlotRight;
    return `${this.buildChartLine(points)} L${xEnd} ${h} L${xStart} ${h} Z`;
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

    const coinId =
      this.chartWatchlist().find((entry) => entry.symbol === compare)?.id ||
      this.preferences.coinIdForSymbol(compare) ||
      null;

    this.rates
      .getMarketChart(compare, this.activeRange(), this.chartCurrency(), coinId)
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
    const marketDelta = formatMarketDelta(chart.changePercent);

    this.marketSummaryPrice.set(stripUsdFromMarketLabel(chart.currentPrice));
    this.marketSummaryDelta.set(marketDelta);
    this.marketSummaryPositive.set(chart.positive);
    this.marketSummaryVolume.set(this.formatSummaryVolume(chart.volume));

    this.chartPrice.set(chart.currentPrice);
    this.chartDelta.set(marketDelta);
    this.chartPositive.set(chart.positive);
    this.seriesVolumeLabel.set(chart.volume);
    this.chartPoints.set(chart.points);
    this.volumeBars.set(chart.volumes);
    this.rawPrices.set(chart.prices);
    this.rawTimestamps.set(chart.timestamps);
    this.checkAlertThreshold();

    if (this.isR4v3Chart()) {
      this.marketSummaryPrice.set(R4V3_PEG_PRICE);
      this.marketSummaryDelta.set(R4V3_PEG_DELTA);
      this.marketSummaryPositive.set(true);
      this.chartPrice.set(R4V3_PEG_PRICE);
      this.chartDelta.set(R4V3_PEG_DELTA);
      this.chartPositive.set(true);
    }

    if (this.hubLayout()) {
      this.triggerPricePulse();
    }
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
    return this.indexFromPointer(event.clientX, event.currentTarget as HTMLElement);
  }

  private indexFromPointer(clientX: number, plot: HTMLElement | null): number | null {
    if (!plot) {
      return null;
    }

    const rect = plot.getBoundingClientRect();
    if (rect.width <= 0) {
      return null;
    }

    const x = clientX - rect.left;
    const plotPoints = this.displayPlotPoints();
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

  private triggerPricePulse(): void {
    this.pricePulse.set(false);

    if (this.pricePulseTimer != null) {
      clearTimeout(this.pricePulseTimer);
    }

    queueMicrotask(() => {
      this.pricePulse.set(true);
      this.pricePulseTimer = setTimeout(() => {
        this.pricePulse.set(false);
        this.pricePulseTimer = null;
      }, 180);
    });
  }

  private triggerChartTransition(): void {
    this.chartTransition.set(true);

    if (this.chartTransitionTimer != null) {
      clearTimeout(this.chartTransitionTimer);
    }

    this.chartTransitionTimer = setTimeout(() => {
      this.chartTransition.set(false);
      this.chartTransitionTimer = null;
    }, 200);
  }

  private triggerR4v3LivePulse(): void {
    this.r4v3LivePulse.set(false);
    const points = this.displayPlotPoints();
    this.heatmapPulseIndex.set(points.length ? points.length - 1 : null);
    queueMicrotask(() => {
      this.r4v3LivePulse.set(true);
      window.setTimeout(() => {
        this.r4v3LivePulse.set(false);
        this.heatmapPulseIndex.set(null);
      }, 900);
    });
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

    const rawMin = Math.min(...prices);
    const rawMax = Math.max(...prices);
    let span = rawMax - rawMin;

    if (span === 0) {
      span = Math.max(Math.abs(rawMax) * 0.02, 1e-8);
    }

    const pad = span * 0.07;

    return {
      high: rawMax + pad,
      low: rawMin - pad,
      reference: this.chartPrice(),
    };
  }

  private buildPlotTrendSegments(values: number[] | undefined) {
    return buildChartTrendSegments(
      values,
      this.chartWidth,
      this.chartHeight,
      this.chartHeight,
      this.chartPlotInset,
      this.chartPlotRight
    );
  }

  private getChartEndPoint(points: number[]): { x: number; y: number } {
    const last = points.length - 1;

    if (last <= 0) {
      return { x: this.chartPlotRight, y: this.chartHeight / 2 };
    }

    const lastPoint = points[last] ?? 50;

    return {
      x: this.chartPlotRight,
      y: chartYFromNormalizedCoord(lastPoint, this.chartHeight),
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

  private formatSummaryVolume(volume: string): string {
    const cleaned = stripUsdFromMarketLabel(volume);
    if (!cleaned || cleaned === '—') {
      return '—';
    }

    const normalized = cleaned.trim().toLowerCase().replace(/\s/g, '');
    if (
      normalized === '0' ||
      normalized === '0k' ||
      normalized === '0,0k' ||
      normalized === '0.0k'
    ) {
      return `0 ${this.pairBase()}`;
    }

    const base = this.pairBase();
    return cleaned.toUpperCase().includes(base.toUpperCase()) ? cleaned : `${cleaned} ${base}`;
  }

  private loadCurrency(): ChartCurrency {
    const stored = localStorage.getItem(CHART_CURRENCY_STORAGE_KEY);
    if (stored === 'r4v3') {
      return stored;
    }
    if (stored === 'usd') {
      localStorage.setItem(CHART_CURRENCY_STORAGE_KEY, 'eur');
      return 'eur';
    }
    return 'eur';
  }
}
