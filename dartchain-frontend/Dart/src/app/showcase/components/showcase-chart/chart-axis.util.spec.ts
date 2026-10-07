import { describe, expect, it } from 'vitest';

import { buildChartAxisTicks, formatAxisLabel, syntheticTimestamps } from './chart-axis.util';

describe('chart-axis.util', () => {
  const start = Date.parse('2026-05-19T10:00:00Z');

  it('creates one tick per timestamp (legacy helper)', () => {
    const timestamps = [start, start + 5 * 60_000, start + 10 * 60_000, start + 15 * 60_000];
    const ticks = buildChartAxisTicks(timestamps, '5m');

    expect(ticks).toHaveLength(4);
    expect(ticks.every((tick) => tick.position >= 0 && tick.position <= 100)).toBe(true);
    expect(ticks.every((tick) => tick.showLabel && tick.label.length > 0)).toBe(true);
  });

  it('labels 5m steps with clock time', () => {
    const label = formatAxisLabel(start + 10 * 60_000, '5m', start, 15 * 60_000);
    expect(label).toMatch(/\d{2}:\d{2}/);
  });

  it('builds synthetic timestamps for fallbacks', () => {
    const timestamps = syntheticTimestamps(5, '1h');
    expect(timestamps).toHaveLength(5);
    expect(timestamps[4] - timestamps[0]).toBe(4 * 60 * 60_000);
  });
});
