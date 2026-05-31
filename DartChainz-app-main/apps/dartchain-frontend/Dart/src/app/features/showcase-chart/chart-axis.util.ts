import { CoingeckoGranularity } from './chart-timeframe.constants';

export interface ChartAxisTick {
  id?: string;
  index: number;
  position: number;
  label: string;
  showLabel: boolean;
}

const MS_5M = 5 * 60_000;
const MS_1H = 60 * 60_000;
const MS_1D = 24 * 60 * 60_000;

export function granularityStepMs(granularity: CoingeckoGranularity): number {
  switch (granularity) {
    case '5m':
      return MS_5M;
    case '1h':
      return MS_1H;
    default:
      return MS_1D;
  }
}

/** Libellé textuel à chaque point de données (timestamp CoinGecko). */
export function buildChartAxisTicks(
  timestamps: number[],
  granularity: CoingeckoGranularity
): ChartAxisTick[] {
  if (!timestamps.length) {
    return [];
  }

  const start = timestamps[0];
  const end = timestamps[timestamps.length - 1];
  const spanMs = Math.max(granularityStepMs(granularity), end - start);
  const n = timestamps.length;

  return timestamps.map((ts, index) => ({
    index,
    position: n <= 1 ? 0 : (index / (n - 1)) * 100,
    label: formatAxisLabel(ts, granularity, start, spanMs),
    showLabel: true,
  }));
}

export function formatAxisLabel(
  ts: number,
  granularity: CoingeckoGranularity,
  rangeStart: number,
  spanMs: number
): string {
  const date = new Date(ts);

  if (granularity === '5m') {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  if (granularity === '1h') {
    if (spanMs > 14 * MS_1D) {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
    if (spanMs > 2 * MS_1D) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
    }
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  if (spanMs > 300 * MS_1D) {
    return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  }

  if (spanMs > 60 * MS_1D) {
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function formatHoverTimestamp(
  ts: number,
  granularity: CoingeckoGranularity,
  rangeStart: number,
  spanMs: number
): string {
  const date = new Date(ts);
  const elapsedMin = Math.round((ts - rangeStart) / MS_5M) * 5;

  if (granularity === '5m') {
    return `${date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })} (+${elapsedMin}m)`;
  }

  if (granularity === '1h') {
    return date.toLocaleString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: spanMs > 300 * MS_1D ? 'numeric' : undefined,
  });
}

/** Timestamps synthétiques espacés selon la granularité CG quand l’API n’en fournit pas. */
export function syntheticTimestamps(
  count: number,
  granularity: CoingeckoGranularity,
  rangeEndMs = Date.now()
): number[] {
  if (count < 1) {
    return [];
  }

  const stepMs = granularityStepMs(granularity);
  const start = rangeEndMs - (count - 1) * stepMs;

  return Array.from({ length: count }, (_, index) => start + index * stepMs);
}
