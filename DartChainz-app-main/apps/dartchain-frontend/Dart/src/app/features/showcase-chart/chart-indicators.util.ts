import { OhlcCandle, buildOhlcFromSeries } from './chart-display.util';

export function sliceSeries<T>(values: T[], startPercent: number, endPercent: number): T[] {
  if (!values.length) {
    return [];
  }

  const start = Math.max(0, Math.min(100, startPercent));
  const end = Math.max(start, Math.min(100, endPercent));
  const from = Math.floor((start / 100) * (values.length - 1));
  const to = Math.ceil((end / 100) * (values.length - 1));

  return values.slice(from, to + 1);
}

export function movingAverageNormalized(points: number[], period: number): number[] {
  if (!points.length || period < 2) {
    return [];
  }

  const averages: number[] = [];

  for (let index = 0; index < points.length; index++) {
    const start = Math.max(0, index - period + 1);
    const window = points.slice(start, index + 1);
    const avg = window.reduce((sum, value) => sum + value, 0) / window.length;
    averages.push(avg);
  }

  return normalizeToChartScale(averages);
}

export function computeRsi(points: number[], period = 14): number[] {
  if (points.length < period + 1) {
    return points.map(() => 50);
  }

  const rsi: number[] = Array.from({ length: period }, () => 50);
  let avgGain = 0;
  let avgLoss = 0;

  for (let index = 1; index <= period; index++) {
    const change = points[index] - points[index - 1];
    if (change >= 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  rsi.push(rsiValue(avgGain, avgLoss));

  for (let index = period + 1; index < points.length; index++) {
    const change = points[index] - points[index - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsi.push(rsiValue(avgGain, avgLoss));
  }

  return rsi;
}

export function normalizeToChartScale(values: number[]): number[] {
  if (!values.length) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max === min) {
    return values.map(() => 50);
  }

  return values.map((value) => 8 + ((value - min) / (max - min)) * 84);
}

export function buildIndicatorLine(
  points: number[],
  width: number,
  height: number
): string {
  const last = points.length - 1;

  if (last <= 0) {
    return '';
  }

  return points
    .map((point, index) => {
      const x = (index / last) * width;
      const y = height - (point / 100) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function volumeBarLayouts(
  volumes: number[],
  width: number,
  height: number
): Array<{ x: number; y: number; w: number; h: number }> {
  if (!volumes.length) {
    return [];
  }

  const last = volumes.length - 1;
  const span = last > 0 ? width / last : width;
  const barW = Math.max(0.5, span * 0.45);

  return volumes.map((value, index) => {
    const h = Math.max(1, (value / 100) * height);
    const center = last === 0 ? width / 2 : (index / last) * width;
    return {
      x: center - barW / 2,
      y: height - h,
      w: barW,
      h,
    };
  });
}

export function ohlcAtIndex(
  points: number[],
  prices: number[],
  index: number
): { open: string; high: string; low: string; close: string } | null {
  const candles = buildOhlcFromSeries(points);
  const candle = candles[index];
  if (!candle || !prices.length) {
    return null;
  }

  const bounds = priceBoundsFromSeries(points, prices);
  if (!bounds) {
    return null;
  }

  const toPrice = (normalized: number) => {
    const ratio = (normalized - bounds.minPt) / Math.max(1, bounds.maxPt - bounds.minPt);
    return bounds.low + (bounds.high - bounds.low) * ratio;
  };

  const fmt = (value: number) =>
    value.toLocaleString('fr-FR', { maximumFractionDigits: bounds.high >= 100 ? 0 : 4 });

  return {
    open: fmt(toPrice(candle.open)),
    high: fmt(toPrice(candle.high)),
    low: fmt(toPrice(candle.low)),
    close: fmt(toPrice(candle.close)),
  };
}

function priceBoundsFromSeries(
  points: number[],
  prices: number[]
): { minPt: number; maxPt: number; low: number; high: number } | null {
  if (!points.length || !prices.length) {
    return null;
  }

  const minPt = Math.min(...points);
  const maxPt = Math.max(...points);
  const low = Math.min(...prices);
  const high = Math.max(...prices);

  return { minPt, maxPt, low, high };
}

function rsiValue(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) {
    return 100;
  }

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function formatOhlcSummary(candle: OhlcCandle | undefined): string {
  if (!candle) {
    return '';
  }

  return `O${candle.open.toFixed(0)} H${candle.high.toFixed(0)} L${candle.low.toFixed(0)} C${candle.close.toFixed(0)}`;
}
