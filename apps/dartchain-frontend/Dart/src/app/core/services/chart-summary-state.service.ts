import { Injectable, computed, signal } from '@angular/core';

import { buildChartTrendSegments, chartYFromNormalizedCoord } from '../../features/showcase-chart/chart-display.util';

export type ChartSummaryPhase = 'error' | 'loading' | 'ready';

export interface ChartSummarySnapshot {
  title: string;
  pairLabel: string;
  price: string;
  delta: string;
  positive: boolean;
  rangeBadge: string;
  volume: string;
  high: string;
  low: string;
  loading: boolean;
  error: boolean;
  sparklinePoints?: number[];
}

@Injectable({ providedIn: 'root' })
export class ChartSummaryStateService {
  readonly title = signal('Graphique');
  readonly pairLabel = signal('R4V3 / CHF');
  readonly price = signal('—');
  readonly delta = signal('—');
  readonly positive = signal(true);
  readonly rangeBadge = signal('24H');
  readonly volume = signal('—');
  readonly high = signal('—');
  readonly low = signal('—');
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly sparklinePoints = signal<number[]>([50, 48, 44, 46, 40, 42, 38]);

  private refreshHandler: (() => void) | null = null;

  readonly symbolLabel = computed(() => {
    const [base] = this.pairLabel().split('/');
    return base?.trim() || '—';
  });

  readonly sparklineSegments = computed(() =>
    buildChartTrendSegments(this.sparklinePoints(), 100, 20, 20, 0, 100)
  );

  readonly sparklineHead = computed(() => {
    const points = this.sparklinePoints();
    if (points.length < 2) {
      return null;
    }

    const last = points.length - 1;
    return {
      x: 100,
      y: chartYFromNormalizedCoord(points[last], 20),
      up: points[last] >= points[last - 1],
    };
  });

  /** Polyline compacte — utilisée par le panneau NODE de la navbar. */
  readonly sparklinePolyline = computed(() =>
    buildSparklinePolyline(this.sparklinePoints(), 48, 16, 1)
  );

  readonly phase = computed((): ChartSummaryPhase => {
    if (this.error()) {
      return 'error';
    }
    if (this.loading()) {
      return 'loading';
    }
    return 'ready';
  });

  readonly highLowLabel = computed(() => {
    const high = this.high();
    const low = this.low();
    if (high === '—' && low === '—') {
      return '';
    }
    return `H ${high} · L ${low}`;
  });

  registerRefreshHandler(handler: () => void): void {
    this.refreshHandler = handler;
  }

  sync(snapshot: ChartSummarySnapshot): void {
    this.title.set(snapshot.title);
    this.pairLabel.set(snapshot.pairLabel);
    this.price.set(snapshot.price);
    this.delta.set(snapshot.delta);
    this.positive.set(snapshot.positive);
    this.rangeBadge.set(snapshot.rangeBadge);
    this.volume.set(snapshot.volume);
    this.high.set(snapshot.high);
    this.low.set(snapshot.low);
    this.loading.set(snapshot.loading);
    this.error.set(snapshot.error);

    if (snapshot.sparklinePoints?.length) {
      this.sparklinePoints.set(snapshot.sparklinePoints);
    }

    if (snapshot.loading && !snapshot.sparklinePoints?.length) {
      return;
    }
  }

  refresh(): void {
    this.refreshHandler?.();
  }
}

function buildSparklinePolyline(
  values: number[],
  width: number,
  height: number,
  padding: number
): string {
  if (!values.length) {
    return `0,${height / 2} ${width},${height / 2}`;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const lastIndex = values.length - 1;

  return values
    .map((value, index) => {
      const x = lastIndex === 0 ? width / 2 : (index / lastIndex) * width;
      const y = padding + (1 - (value - min) / span) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
