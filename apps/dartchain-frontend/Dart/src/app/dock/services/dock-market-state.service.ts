import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CryptoRatesService } from '@exchange/services/crypto-rate.service';
import { formatDockRelativeTime } from '@core/utils/dock-time.util';

export type DockMarketPhase = 'error' | 'loading' | 'ready';

@Injectable({ providedIn: 'root' })
export class DockMarketStateService {
  private readonly cryptoRates = inject(CryptoRatesService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly price = signal('—');
  readonly changePercent = signal(0);
  readonly positive = signal(true);
  readonly volume = signal('—');
  readonly lastUpdatedAt = signal<number | null>(null);

  readonly phase = computed((): DockMarketPhase => {
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
    const change = this.changePercent();
    const trend = this.positive() ? '▲' : '▼';
    const changeLabel = `${trend} ${Math.abs(change).toFixed(2)}%`;
    return `${this.price()} · ${changeLabel}`;
  });

  readonly progressLabel = computed(() => {
    const vol = this.volume();
    return vol && vol !== '—' ? `Volume ${vol}` : '';
  });

  readonly updatedAgeLabel = computed(() =>
    formatDockRelativeTime(this.lastUpdatedAt())
  );

  async load(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    try {
      const chart = await firstValueFrom(
        this.cryptoRates.getMarketChart('R4V3', '24h', 'eur')
      ).catch(() => null);

      if (!chart) {
        this.error.set(true);
        return;
      }

      this.price.set(chart.currentPrice ?? '—');
      this.changePercent.set(chart.changePercent ?? 0);
      this.positive.set(chart.positive ?? chart.changePercent >= 0);
      this.volume.set(chart.volume || '—');
      this.lastUpdatedAt.set(Date.now());
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  refresh(): void {
    void this.load();
  }
}
