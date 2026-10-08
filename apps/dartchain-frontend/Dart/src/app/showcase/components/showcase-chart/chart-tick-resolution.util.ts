import { pricesToChartCoordinates } from './chart-display.util';
import type { ChartSeriesPayload } from './chart-timeframe.util';

/**
 * Agrège la série sur un pas temporel (close de chaque bucket).
 * Si le pas est plus fin que les données native, la série reste inchangée.
 */
export function downsampleSeriesByStep(
  series: ChartSeriesPayload,
  stepMs: number
): ChartSeriesPayload {
  if (!Number.isFinite(stepMs) || stepMs <= 0 || series.prices.length < 2) {
    return series;
  }

  const timestamps =
    series.timestamps.length === series.prices.length
      ? series.timestamps
      : null;

  if (!timestamps) {
    return series;
  }

  const prices: number[] = [];
  const nextTimestamps: number[] = [];
  let bucket = Math.floor(timestamps[0] / stepMs);
  let lastPrice = series.prices[0];
  let lastTs = timestamps[0];

  for (let index = 0; index < series.prices.length; index++) {
    const ts = timestamps[index];
    const nextBucket = Math.floor(ts / stepMs);
    if (nextBucket !== bucket) {
      prices.push(lastPrice);
      nextTimestamps.push(lastTs);
      bucket = nextBucket;
    }
    lastPrice = series.prices[index];
    lastTs = ts;
  }

  prices.push(lastPrice);
  nextTimestamps.push(lastTs);

  if (prices.length < 2 || prices.length === series.prices.length) {
    return series;
  }

  const first = prices[0];
  const last = prices[prices.length - 1];
  const changePercent = first === 0 ? 0 : ((last - first) / first) * 100;

  return {
    ...series,
    changePercent,
    positive: changePercent >= 0,
    points: pricesToChartCoordinates(prices),
    volumes: deriveVolumeBarsFromPrices(prices),
    prices,
    timestamps: nextTimestamps,
  };
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
