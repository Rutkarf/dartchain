import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { interval, startWith } from 'rxjs';

import { BlockchainApiService } from './blockchain-api.service';

export type NetworkTrustState = 'checking' | 'live' | 'slow' | 'offline';

const LIVE_LATENCY_MS = 300;
const WS_FRESH_MS = 45_000;

@Injectable({ providedIn: 'root' })
export class NetworkTrustService {
  private readonly api = inject(BlockchainApiService);

  readonly loading = signal(false);
  readonly apiOk = signal(true);
  readonly serviceName = signal('dartchain-backend');
  readonly latencyMs = signal<number | null>(null);
  readonly lastCheckedAt = signal<number | null>(null);
  readonly lastWsAt = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly trustState = computed((): NetworkTrustState => {
    if (this.loading()) {
      return 'checking';
    }

    if (!this.apiOk()) {
      return 'offline';
    }

    const latency = this.latencyMs();
    if (latency !== null && latency >= LIVE_LATENCY_MS) {
      return 'slow';
    }

    return 'live';
  });

  readonly chipLabel = computed(() => {
    switch (this.trustState()) {
      case 'checking':
        return '…';
      case 'offline':
        return 'Off';
      case 'slow':
        return 'Lent';
      default:
        return 'Live';
    }
  });

  readonly latencyLabel = computed(() => {
    const value = this.latencyMs();
    if (this.loading()) {
      return '…';
    }
    if (value === null || Number.isNaN(value)) {
      return 'N/A';
    }
    return `${value}ms`;
  });

  readonly streamLive = computed(() => {
    const last = this.lastWsAt();
    if (!last) {
      return this.api.liveSocketOpen();
    }
    return Date.now() - last <= WS_FRESH_MS;
  });

  readonly statusHeadline = computed(() => {
    switch (this.trustState()) {
      case 'checking':
        return 'Vérification…';
      case 'offline':
        return 'Hors ligne';
      case 'slow':
        return 'Connexion lente';
      default:
        return this.streamLive() ? 'En direct' : 'Opérationnel';
    }
  });

  readonly chipAriaLabel = computed(() => {
    const latency = this.latencyLabel();
    const stream = this.streamLive() ? 'flux live actif' : 'flux live inactif';
    return `État réseau DartChain : ${this.statusHeadline()}, latence ${latency}, ${stream}. Cliquer pour les détails.`;
  });

  readonly detailSummary = computed(() => {
    const parts = [`API ${this.apiOk() ? 'OK' : 'KO'}`, `latence ${this.latencyLabel()}`];
    if (this.streamLive()) {
      parts.push('flux live actif');
    }
    return parts.join(' · ');
  });

  constructor() {
    interval(30_000)
      .pipe(startWith(0), takeUntilDestroyed())
      .subscribe(() => {
        void this.refresh();
      });

    this.api.connectLiveUpdates().pipe(takeUntilDestroyed()).subscribe({
      next: () => {
        this.lastWsAt.set(Date.now());
      },
    });
  }

  async refresh(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const startedAt = performance.now();

    try {
      const response = await firstValueFrom(this.api.getHealth());
      const latencyMs = Math.round(performance.now() - startedAt);

      this.apiOk.set(response.ok);
      this.serviceName.set(response.service || 'dartchain-backend');
      this.latencyMs.set(latencyMs);
      this.lastCheckedAt.set(Date.now());

      if (!response.ok) {
        this.errorMessage.set('Backend hors ligne — certaines actions peuvent échouer.');
      }
    } catch {
      this.apiOk.set(false);
      this.latencyMs.set(null);
      this.lastCheckedAt.set(Date.now());
      this.errorMessage.set('Backend hors ligne — certaines actions peuvent échouer.');
    } finally {
      this.loading.set(false);
    }
  }
}
