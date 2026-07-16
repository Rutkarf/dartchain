import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { BlockchainApiService } from '../core/services/blockchain-api.service';
import { NavbarHintDirective } from './navbar-hint.directive';

interface HealthCheck {
  ok: boolean;
  latencyMs: number | null;
}

@Component({
  selector: 'app-navbar-network-status',
  standalone: true,
  imports: [CommonModule, NavbarHintDirective],
  templateUrl: './navbar-network-status.html',
  styleUrls: ['./navbar-network-status.css', './navbar-hint.css'],
})
export class NavbarNetworkStatusComponent implements OnInit {
  private readonly api = inject(BlockchainApiService);

  readonly health = signal<HealthCheck>({ ok: true, latencyMs: null });
  readonly loading = signal(false);

  readonly latencyLabel = computed(() => {
    const value = this.health().latencyMs;

    if (this.loading()) {
      return '…';
    }

    if (value === null || value === undefined || Number.isNaN(value)) {
      return 'N/A';
    }

    return `${value}ms`;
  });

  readonly statusAriaLabel = computed(() => {
    const state = this.health().ok ? 'en ligne' : 'hors ligne';
    return `Réseau ${state}, latence ${this.latencyLabel()}`;
  });

  readonly syncPercentLabel = computed(() => {
    if (this.loading()) {
      return '…';
    }

    if (!this.health().ok) {
      return '0%';
    }

    const latency = this.health().latencyMs;
    if (latency === null || latency === undefined || Number.isNaN(latency)) {
      return '98%';
    }

    const score = Math.max(0, Math.min(99, 100 - Math.round(latency / 25)));
    return `${score}%`;
  });

  ngOnInit(): void {
    void this.loadHealth();
  }

  refresh(): void {
    void this.loadHealth();
  }

  private async loadHealth(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    const startedAt = performance.now();

    try {
      const response = await firstValueFrom(this.api.getHealth());
      const latencyMs = Math.round(performance.now() - startedAt);

      this.health.set({
        ok: response.ok,
        latencyMs,
      });
    } catch {
      this.health.set({
        ok: false,
        latencyMs: null,
      });
    } finally {
      this.loading.set(false);
    }
  }
}
