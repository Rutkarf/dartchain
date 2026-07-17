import {
  buildR4v3FlowSeries,
  buildR4v3HealthSeries,
  computeR4v3FlowStats,
  resolveR4v3AutoView,
  type R4v3ChartContext,
} from './r4v3-chart.util';

function baseContext(overrides: Partial<R4v3ChartContext> = {}): R4v3ChartContext {
  return {
    pointCount: 24,
    volumes: Array.from({ length: 24 }, (_, index) => 40 + index),
    timestamps: Array.from({ length: 24 }, (_, index) => index * 60_000),
    panelPoints: [],
    recentTrades: [],
    swapNewsCount: 0,
    launchProjects: [],
    liquidityProxy: 60,
    ...overrides,
  };
}

describe('r4v3-chart.util', () => {
  it('builds a non-flat flow series from volume deltas', () => {
    const series = buildR4v3FlowSeries(baseContext());
    expect(series.length).toBeGreaterThan(1);
    expect(Math.max(...series)).toBeGreaterThan(Math.min(...series));
  });

  it('resolves auto view to flow when swap activity is high', () => {
    const view = resolveR4v3AutoView(
      baseContext({
        swapNewsCount: 4,
        recentTrades: [
          {
            id: '1',
            fromToken: 'PXD',
            toToken: 'R4V3',
            amountIn: 10,
            amountOut: 10,
            at: Date.now(),
          },
        ],
      })
    );
    expect(view).toBe('flow');
  });

  it('computes signed net flow from recent trades', () => {
    const stats = computeR4v3FlowStats(
      baseContext({
        recentTrades: [
          {
            id: 'buy',
            fromToken: 'PXD',
            toToken: 'R4V3',
            amountIn: 5,
            amountOut: 20,
            at: Date.now(),
          },
          {
            id: 'sell',
            fromToken: 'R4V3',
            toToken: 'PXD',
            amountIn: 10,
            amountOut: 2,
            at: Date.now(),
          },
        ],
        swapNewsCount: 1,
      })
    );

    expect(stats.buys).toBeGreaterThan(stats.sells);
    expect(stats.swaps).toBe(3);
  });

  it('builds a bounded health series', () => {
    const series = buildR4v3HealthSeries(
      baseContext({
        launchProjects: [
          {
            id: '1',
            name: 'PXD',
            symbol: 'PXD',
            status: 'LIVE',
            raised: '1200',
            target: '5000',
          },
        ],
      })
    );

    expect(series.every((value) => value >= 8 && value <= 92)).toBe(true);
  });
});
