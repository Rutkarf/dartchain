import { ChartRange } from '@showcase/models/showcase.model';
import { pricesToChartCoordinates } from './chart-display.util';
import {
  ChartTimeframeId,
  chartTimeframeById,
  isIntervalId,
} from './chart-timeframe.constants';

export interface ChartSeriesPayload {
  currentPrice: string;
  changePercent?: number;
  positive: boolean;
  volume: string;
  points: number[];
  volumes: number[];
  prices: number[];
  timestamps: number[];
}

export interface TimeframeSeriesWindow {
  apiRange: ChartRange;
  /** true = conserver les prix tels que CoinGecko les fournit (pas d’upsample). */
  useNativeGranularity: boolean;
  windowStart?: number;
  windowEnd?: number;
}

export function timeframeSeriesWindow(
  id: ChartTimeframeId,
  activeApiRange: ChartRange
): TimeframeSeriesWindow {
  const option = chartTimeframeById(id);

  if (isIntervalId(id)) {
    return {
      apiRange: option.supportedApiRanges?.includes(activeApiRange)
        ? activeApiRange
        : option.apiRange,
      useNativeGranularity: true,
    };
  }

  switch (id) {
    case '24h':
      return { apiRange: '24h', useNativeGranularity: true };
    case '7d':
      return { apiRange: '7d', useNativeGranularity: true };
    case '30d':
      return { apiRange: '30d', useNativeGranularity: true };
    case '90d':
      return { apiRange: '90d', useNativeGranularity: true };
    case '1y':
      return { apiRange: '365d', useNativeGranularity: true };
    case 'ytd': {
      const ytd = ytdWindowFraction();
      return {
        apiRange: '365d',
        useNativeGranularity: true,
        windowStart: ytd.start,
        windowEnd: ytd.end,
      };
    }
    default:
      return { apiRange: '24h', useNativeGranularity: true };
  }
}

export function transformSeriesForTimeframe(
  base: ChartSeriesPayload,
  timeframeId: ChartTimeframeId,
  activeApiRange: ChartRange
): ChartSeriesPayload {
  const window = timeframeSeriesWindow(timeframeId, activeApiRange);
  const windowedPrices = sliceByWindow(base.prices, window.windowStart, window.windowEnd);
  const windowedTimestamps = sliceByWindow(base.timestamps, window.windowStart, window.windowEnd);

  if (!windowedPrices.length) {
    return base;
  }

  const prices = window.useNativeGranularity
    ? windowedPrices
    : resamplePriceCloses(windowedPrices, windowedPrices.length);
  const timestamps =
    windowedTimestamps.length === windowedPrices.length ? windowedTimestamps : [];
  const first = prices[0];
  const last = prices[prices.length - 1];
  const changePercent = first === 0 ? 0 : ((last - first) / first) * 100;
  const reference = base.currentPrice;

  return {
    currentPrice: formatPriceLikeReference(last, reference),
    changePercent,
    positive: changePercent >= 0,
    volume: base.volume,
    points: pricesToChartCoordinates(prices),
    volumes: deriveVolumeBarsFromPrices(prices),
    prices,
    timestamps,
  };
}

export function sliceByWindow(values: number[], start = 0, end = 1): number[] {
  if (!values.length) {
    return [];
  }

  const startRatio = Math.max(0, Math.min(1, start));
  const endRatio = Math.max(startRatio, Math.min(1, end));

  if (startRatio <= 0 && endRatio >= 1) {
    return [...values];
  }

  const from = Math.floor(startRatio * (values.length - 1));
  const to = Math.ceil(endRatio * (values.length - 1));
  return values.slice(from, to + 1);
}

export function resamplePriceCloses(values: number[], targetCount: number): number[] {
  if (!values.length || targetCount < 1) {
    return [];
  }

  if (values.length === targetCount) {
    return [...values];
  }

  if (targetCount === 1) {
    return [values[values.length - 1]];
  }

  if (targetCount > values.length) {
    return interpolateUpsample(values, targetCount);
  }

  return bucketSeries(values, targetCount).map((bucket) => bucket[bucket.length - 1]);
}

export function interpolateUpsample(values: number[], targetCount: number): number[] {
  const last = values.length - 1;
  if (last <= 0) {
    return [...values];
  }

  return Array.from({ length: targetCount }, (_, index) => {
    const position = (index / (targetCount - 1)) * last;
    const lower = Math.floor(position);
    const upper = Math.min(lower + 1, last);
    const fraction = position - lower;
    return values[lower] * (1 - fraction) + values[upper] * fraction;
  });
}

export function resampleSeries(values: number[], targetCount: number): number[] {
  return resamplePriceCloses(values, targetCount);
}

function bucketSeries(values: number[], targetCount: number): number[][] {
  if (!values.length || targetCount < 1) {
    return [];
  }

  if (values.length === targetCount) {
    return values.map((value) => [value]);
  }

  if (targetCount === 1) {
    return [[values[values.length - 1]]];
  }

  const buckets: number[][] = [];

  for (let index = 0; index < targetCount; index++) {
    const start = (index / targetCount) * values.length;
    const end = ((index + 1) / targetCount) * values.length;
    const from = Math.floor(start);
    const to = Math.max(from + 1, Math.ceil(end));
    buckets.push(values.slice(from, to));
  }

  return buckets;
}

function ytdWindowFraction(): { start: number; end: number } {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1).getTime();
  const progress = (now.getTime() - yearStart) / Math.max(1, yearEnd - yearStart);
  return { start: Math.max(0, 1 - progress), end: 1 };
}

function deriveVolumeBarsFromPrices(prices: number[]): number[] {
  const coords = pricesToChartCoordinates(prices);
  if (coords.length < 2) {
    return coords.map(() => 50);
  }

  const deltas = coords.slice(1).map((value, index) => Math.abs(value - coords[index]));
  const max = Math.max(...deltas, 1);
  return [50, ...deltas.map((value) => 12 + (value / max) * 76)];
}

function formatPriceLikeReference(value: number, reference: string): string {
  if (!reference || reference === '—') {
    return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  }

  const usesComma = reference.includes(',');
  const formatted = value.toLocaleString('fr-FR', {
    maximumFractionDigits: reference.includes('.') || usesComma ? 4 : 0,
  });
  return usesComma ? formatted : formatted.replace(',', '.');
}
