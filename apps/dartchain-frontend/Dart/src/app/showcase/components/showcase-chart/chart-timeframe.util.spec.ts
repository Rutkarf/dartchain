import { describe, expect, it } from 'vitest';

import {
  CHART_INTERVAL_OPTIONS,
  CHART_PERIOD_OPTIONS,
  buildTimeframeMenuSections,
  chartAxisLabelsForTimeframe,
} from './chart-timeframe.constants';
import {
  interpolateUpsample,
  resamplePriceCloses,
  sliceByWindow,
  timeframeSeriesWindow,
  transformSeriesForTimeframe,
} from './chart-timeframe.util';

describe('chart timeframe menu (CoinGecko only)', () => {
  it('exposes only CG-native intervals', () => {
    expect(CHART_INTERVAL_OPTIONS.map((o) => o.id)).toEqual(['1d']);
    expect(CHART_PERIOD_OPTIONS.map((o) => o.id)).toEqual([
      '24h',
      '7d',
      '30d',
      '90d',
      '1y',
      'ytd',
    ]);
  });

  it('filters intervals by active API range', () => {
    expect(buildTimeframeMenuSections('24h')[0]?.title).toBe('Période');
    expect(buildTimeframeMenuSections('7d')[0]?.title).toBe('Période');
    expect(buildTimeframeMenuSections('365d')[0]?.options.map((o) => o.id)).toEqual(['1d']);
  });

  it('maps period and interval ids to axis labels', () => {
    expect(chartAxisLabelsForTimeframe('24h')).toEqual(['00h', '06h', '12h', '18h', '24h']);
    expect(chartAxisLabelsForTimeframe('7d')).toEqual(['J1', 'J2', 'J3', 'J5', 'J7']);
  });
});

describe('chart-timeframe.util', () => {
  const base = {
    currentPrice: '1 000,50',
    changePercent: 2,
    positive: true,
    volume: '48,2k',
    points: [20, 40, 60, 80],
    volumes: [50, 55, 60, 65],
    prices: [100, 110, 105, 120],
    timestamps: [1_000, 2_000, 3_000, 4_000],
  };

  it('keeps native prices for 24h period without upsampling', () => {
    const transformed = transformSeriesForTimeframe(base, '24h', '24h');
    expect(transformed.prices).toEqual(base.prices);
  });

  it('keeps native prices for 7d period on 7d range', () => {
    const transformed = transformSeriesForTimeframe(base, '7d', '7d');
    expect(transformed.prices).toEqual(base.prices);
  });

  it('uses native window for ytd on daily data', () => {
    const window = timeframeSeriesWindow('ytd', '365d');
    expect(window.useNativeGranularity).toBe(true);
    expect(window.windowStart).toBeGreaterThan(0);
  });

  it('interpolates only when explicitly downsampling', () => {
    const closes = resamplePriceCloses([10, 12, 11, 15], 2);
    expect(closes).toHaveLength(2);
    expect(interpolateUpsample([10, 12, 11, 15], 8)).toHaveLength(8);
  });

  it('slices trailing window for ytd fraction', () => {
    const sliced = sliceByWindow(base.prices, 0.5, 1);
    expect(sliced.length).toBeLessThan(base.prices.length);
    expect(sliced[sliced.length - 1]).toBe(120);
  });
});
