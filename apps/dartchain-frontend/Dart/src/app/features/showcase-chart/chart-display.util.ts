export type ChartDisplayType = 'line' | 'candles';

export interface ChartTrendSegment {
  d: string;
  areaD: string;
  up: boolean;
}

/** Sparkline de repli (rate panel sans données). */
export const RATE_SPARKLINE_FALLBACK = [10, 9.4, 8.8, 7.9, 8.1, 7.1, 7.3, 6.2, 5.4, 4.8, 4.1];

/** Marge de sécurité haut/bas en espace normalisé 0–100. */
export const CHART_COORD_EDGE_PAD = 3;

/** Padding relatif appliqué au domaine min/max avant normalisation. */
export const CHART_DOMAIN_PAD_RATIO = 0.07;

export function chartYFromNormalizedCoord(coord: number, height: number): number {
  return height - (coord / 100) * height;
}

/** Mappe une série numérique vers l'espace vertical 0–100 avec domaine paddé. */
export function mapSeriesToChartCoordinates(
  values: number[],
  domainPadRatio = CHART_DOMAIN_PAD_RATIO,
  edgePad = CHART_COORD_EDGE_PAD
): number[] {
  if (!values.length) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  let span = max - min;

  if (span === 0) {
    const base = Math.max(Math.abs(max), 1);
    span = base * 0.05;
  }

  const pad = span * domainPadRatio;
  const domainMin = min - pad;
  const domainMax = max + pad;
  const domainSpan = Math.max(domainMax - domainMin, 1e-12);
  const usable = Math.max(100 - edgePad * 2, 1);

  return values.map((value) => edgePad + usable * ((value - domainMin) / domainSpan));
}

/** Segments vert (hausse) / rouge (baisse) pour courbes SVG. */
export function buildChartTrendSegments(
  values: number[] | undefined,
  width: number,
  height: number,
  baselineY: number,
  plotXStart = 0,
  plotXEnd?: number
): ChartTrendSegment[] {
  const series = values?.length ? values : RATE_SPARKLINE_FALLBACK;

  if (series.length < 2) {
    return [];
  }

  const xEnd = plotXEnd ?? width;
  const plotSpan = Math.max(xEnd - plotXStart, 1);
  const last = series.length - 1;
  const segments: ChartTrendSegment[] = [];

  for (let i = 1; i < series.length; i++) {
    const up = series[i] >= series[i - 1];
    const x0 = plotXStart + ((i - 1) / last) * plotSpan;
    const x1 = plotXStart + (i / last) * plotSpan;
    const y0 = chartYFromNormalizedCoord(series[i - 1], height);
    const y1 = chartYFromNormalizedCoord(series[i], height);
    const xf0 = x0.toFixed(2);
    const xf1 = x1.toFixed(2);
    const yf0 = y0.toFixed(2);
    const yf1 = y1.toFixed(2);
    const bf = baselineY.toFixed(2);

    segments.push({
      up,
      d: `M${xf0} ${yf0} L${xf1} ${yf1}`,
      areaD: `M${xf0} ${yf0} L${xf1} ${yf1} L${xf1} ${bf} L${xf0} ${bf} Z`,
    });
  }

  return segments;
}

/** Sparkline compacte rate panel — remplit toute la hauteur du viewBox. */
export function buildRatePanelTrendSegments(
  values: number[] | undefined,
  width = 100,
  height = 8
): ChartTrendSegment[] {
  const series = values?.length ? values : RATE_SPARKLINE_FALLBACK;

  if (series.length < 2) {
    return [];
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const topPad = 0.05;
  const span = height - topPad;

  const ys = series.map((value) => {
    if (max === min) {
      return height * 0.35;
    }

    const ratio = (value - min) / (max - min);
    return topPad + (1 - ratio) * (span - topPad);
  });

  const last = series.length - 1;
  const baseline = height;
  const segments: ChartTrendSegment[] = [];

  for (let i = 1; i < series.length; i++) {
    const up = ys[i] >= ys[i - 1];
    const x0 = ((i - 1) / last) * width;
    const x1 = (i / last) * width;
    const y0 = ys[i - 1];
    const y1 = ys[i];
    const xf0 = x0.toFixed(2);
    const xf1 = x1.toFixed(2);
    const yf0 = y0.toFixed(2);
    const yf1 = y1.toFixed(2);
    const bf = baseline.toFixed(2);

    segments.push({
      up,
      d: `M${xf0} ${yf0} L${xf1} ${yf1}`,
      areaD: `M${xf0} ${yf0} L${xf1} ${yf1} L${xf1} ${bf} L${xf0} ${bf} Z`,
    });
  }

  return segments;
}

export interface OhlcCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  bullish: boolean;
}

export interface CandleSvgLayout {
  x: number;
  bodyWidth: number;
  bodyY: number;
  bodyHeight: number;
  wickTop: number;
  wickBottom: number;
  bullish: boolean;
}

/** Map real prices to SVG Y coordinates (0–100 chart space). */
export function pricesToChartCoordinates(prices: number[]): number[] {
  return mapSeriesToChartCoordinates(prices);
}

/** Prix réel → coordonnée Y SVG dans la zone du graphique principal (avec marge visuelle). */
export function priceToSvgY(
  price: number,
  min: number,
  max: number,
  height: number,
  domainValues?: number[]
): number {
  if (max === min) {
    return height / 2;
  }

  const domain = domainValues?.length ? domainValues : [min, max];
  const chartCoord = mapPriceToChartCoordinate(price, domain);
  return chartYFromNormalizedCoord(chartCoord, height);
}

/** Prix → Y SVG pleine hauteur (cadrillage + axe Y, sans marge basse). */
export function priceToSvgYGrid(price: number, min: number, max: number, height: number): number {
  if (max === min) {
    return height / 2;
  }

  const ratio = (max - price) / (max - min);
  return ratio * height;
}

/** Mappe un prix brut vers une coordonnée 0–100 en réutilisant le domaine d'une série. */
export function mapPriceToChartCoordinate(price: number, domainValues: number[]): number {
  if (!domainValues.length) {
    return 50;
  }

  const min = Math.min(...domainValues);
  const max = Math.max(...domainValues);
  let span = max - min;

  if (span === 0) {
    span = Math.max(Math.abs(max), 1) * 0.05;
  }

  const pad = span * CHART_DOMAIN_PAD_RATIO;
  const domainMin = min - pad;
  const domainMax = max + pad;
  const domainSpan = Math.max(domainMax - domainMin, 1e-12);
  const usable = Math.max(100 - CHART_COORD_EDGE_PAD * 2, 1);

  return CHART_COORD_EDGE_PAD + usable * ((price - domainMin) / domainSpan);
}

export function buildOhlcFromPriceSeries(prices: number[]): OhlcCandle[] {
  if (!prices.length) {
    return [];
  }

  const toY = (price: number) => mapPriceToChartCoordinate(price, prices);

  return prices.map((close, index) => {
    const open = index === 0 ? close : prices[index - 1];
    const high = index === 0 ? close : Math.max(open, close, prices[index]);
    const low = index === 0 ? close : Math.min(open, close, prices[index]);

    return {
      open: toY(open),
      high: toY(high),
      low: toY(low),
      close: toY(close),
      bullish: close >= open,
    };
  });
}

/** @deprecated Prefer buildOhlcFromPriceSeries with raw prices. */
export function buildOhlcFromSeries(points: number[]): OhlcCandle[] {
  if (!points.length) {
    return [];
  }

  return points.map((close, index) => {
    const open = index === 0 ? close : points[index - 1];
    const prev = points[index - 1] ?? close;
    const next = points[index + 1] ?? close;
    const wick = Math.max(0.35, Math.abs(next - prev) * 0.22 + 0.4);
    const high = Math.min(100, Math.max(open, close) + wick);
    const low = Math.max(0, Math.min(open, close) - wick);

    return {
      open,
      high,
      low,
      close,
      bullish: close >= open,
    };
  });
}

export function layoutCandlesForSvg(
  candles: OhlcCandle[],
  width: number,
  height: number
): CandleSvgLayout[] {
  if (!candles.length) {
    return [];
  }

  const last = candles.length - 1;
  const slot = last > 0 ? width / last : width;
  const bodyWidth = Math.max(0.8, (last > 0 ? slot : width) * 0.45);

  const toY = (value: number) => height - (value / 100) * height;

  return candles.map((candle, index) => {
    const x = last === 0 ? width / 2 : (index / last) * width;
    const yOpen = toY(candle.open);
    const yClose = toY(candle.close);
    const bodyY = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(0.65, Math.abs(yClose - yOpen));

    return {
      x,
      bodyWidth,
      bodyY,
      bodyHeight,
      wickTop: toY(candle.high),
      wickBottom: toY(candle.low),
      bullish: candle.bullish,
    };
  });
}

export function priceAtSeriesIndex(
  points: number[],
  index: number,
  highPrice: number,
  lowPrice: number
): number | null {
  if (!points.length || index < 0 || index >= points.length) {
    return null;
  }

  const minPt = Math.min(...points);
  const maxPt = Math.max(...points);
  const span = Math.max(1, maxPt - minPt);
  const normalized = points[index];
  const ratio = (normalized - minPt) / span;

  return lowPrice + (highPrice - lowPrice) * ratio;
}
