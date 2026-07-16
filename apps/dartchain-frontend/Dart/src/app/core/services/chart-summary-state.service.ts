import { Injectable, computed, signal } from '@angular/core';

import { formatDockRelativeTime } from '../utils/dock-time.util';

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
  readonly pairLabel = signal('R4V3 / EUR');
  readonly price = signal('—');
  readonly delta = signal('—');
  readonly positive = signal(true);
  readonly rangeBadge = signal('24H');
  readonly volume = signal('—');
  readonly high = signal('—');
  readonly low = signal('—');
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly lastUpdatedAt = signal<number | null>(null);
  readonly sparklinePoints = signal<number[]>([50, 48, 44, 46, 40, 42, 38]);

  private refreshHandler: (() => void) | null = null;

  readonly sparklinePolyline = computed(() =>
    buildSparklinePolyline(this.sparklinePoints(), 48, 16, 2)
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

  readonly statusLabel = computed(() => {
    switch (this.phase()) {
      case 'error':
        return 'Erreur';
      case 'loading':
        return 'Sync…';
      default:
        return this.positive() ? 'Hausse' : 'Baisse';
    }
  });

  readonly headline = computed(() => {
    if (this.loading()) {
      return 'Chargement du graphique…';
    }
    if (this.error()) {
      return 'Graphique indisponible';
    }

    const trend = this.positive() ? '▲' : '▼';
    return `${this.price()} · ${trend} ${this.delta()}`;
  });

  readonly progressLabel = computed(() => {
    const parts = [
      this.pairLabel(),
      this.rangeBadge() ? `Période ${this.rangeBadge()}` : '',
      this.volume() !== '—' ? `Vol ${this.volume()}` : '',
    ].filter(Boolean);

    return parts.join(' · ');
  });

  readonly detailLabel = computed(() => {
    const high = this.high();
    const low = this.low();
    if (high === '—' && low === '—') {
      return '';
    }
    return `H ${high} · L ${low}`;
  });

  readonly updatedAgeLabel = computed(() =>
    formatDockRelativeTime(this.lastUpdatedAt())
  );

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

    if (!snapshot.loading) {
      this.lastUpdatedAt.set(Date.now());
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
