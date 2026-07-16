import { describe, expect, it } from 'vitest';

import { CHART_GRID_PROFILES, resolveGridProfile, resolveGridProfileKey } from './chart-grid.config';
import {
  buildHorizontalAxisTicks,
  buildHorizontalGridLines,
  buildPriceGridLevels,
  buildVerticalGridLines,
} from './chart-grid.util';

describe('chart-grid.config', () => {
  it('maps timeframes to the requested profile keys', () => {
    expect(resolveGridProfileKey('24h', '24h')).toBe('24h');
    expect(resolveGridProfileKey('7d', '7d')).toBe('7d');
    expect(resolveGridProfileKey('30d', '30d')).toBe('30d');
    expect(resolveGridProfileKey('90d', '90d')).toBe('90d');
    expect(resolveGridProfileKey('1y', '365d')).toBe('1y');
    expect(resolveGridProfileKey('ytd', '365d')).toBe('ytd');
  });

  it('defines exact vertical line counts per profile', () => {
    expect(CHART_GRID_PROFILES['24h'].verticalTickCount).toBe(24);
    expect(CHART_GRID_PROFILES['7d'].verticalTickCount).toBe(54);
    expect(CHART_GRID_PROFILES['30d'].verticalTickCount).toBe(12);
    expect(CHART_GRID_PROFILES['90d'].verticalTickCount).toBe(4);
    expect(CHART_GRID_PROFILES['1y'].verticalTickCount).toBe(20);
    expect(CHART_GRID_PROFILES.ytd.verticalTickCount).toBe(24);
    expect(CHART_GRID_PROFILES['24h'].horizontalTickCount).toBe(10);
  });
});

describe('chart-grid.util', () => {
  const hour = 60 * 60_000;
  const start = Date.parse('2026-05-19T10:00:00Z');
  const end = start + 24 * hour;
  const timestamps = Array.from({ length: 50 }, (_, i) => start + (i / 49) * (end - start));

  it('builds exactly 24 vertical lines for 24h', () => {
    const profile = resolveGridProfile('24h', '24h');
    const lines = buildVerticalGridLines(timestamps, profile);
    expect(lines).toHaveLength(24);
    expect(new Set(lines.map((line) => line.id)).size).toBe(24);
    expect(lines.every((line) => line.x > 0.5)).toBe(true);
  });

  it('builds exactly 54 vertical lines for 7d', () => {
    const profile = resolveGridProfile('7d', '7d');
    const weekStart = Date.parse('2026-05-12T00:00:00Z');
    const weekEnd = weekStart + 7 * 24 * hour;
    const weekTs = Array.from({ length: 40 }, (_, i) => weekStart + (i / 39) * (weekEnd - weekStart));
    const lines = buildVerticalGridLines(weekTs, profile);
    expect(lines).toHaveLength(54);
  });

  it('builds exactly 12 vertical lines for 1M', () => {
    const profile = resolveGridProfile('30d', '30d');
    const lines = buildVerticalGridLines(timestamps, profile);
    expect(lines).toHaveLength(12);
  });

  it('builds exactly 20 vertical lines for 1y', () => {
    const profile = resolveGridProfile('1y', '365d');
    const lines = buildVerticalGridLines(timestamps, profile);
    expect(lines).toHaveLength(20);
  });

  it('builds exactly 24 vertical lines for YTD', () => {
    const profile = resolveGridProfile('ytd', '365d');
    const lines = buildVerticalGridLines(timestamps, profile);
    expect(lines).toHaveLength(24);
  });

  it('builds 10 unique horizontal lines', () => {
    const profile = resolveGridProfile('24h', '24h');
    const levels = buildPriceGridLevels(100, 200, 10, 64, (v) => String(v));
    const lines = buildHorizontalGridLines(levels, profile.key);
    expect(lines).toHaveLength(10);
    expect(new Set(lines.map((line) => line.id)).size).toBe(10);
  });

  it('builds 10 horizontal price levels', () => {
    const levels = buildPriceGridLevels(100, 200, 10, 64, (v) => String(v));
    expect(levels).toHaveLength(10);
  });

  it('aligns axis ticks with vertical grid count', () => {
    const profile = resolveGridProfile('24h', '24h');
    const ticks = buildHorizontalAxisTicks(timestamps, profile, '5m');
    expect(ticks).toHaveLength(24);
  });
});
