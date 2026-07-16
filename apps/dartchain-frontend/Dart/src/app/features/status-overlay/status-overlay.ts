import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { BlockchainApiService } from '../../core/services/blockchain-api.service';
import { ShellFeedbackService } from '../../core/services/shell-feedback.service';

interface HealthCheck {
  service: string;
  ok: boolean;
  label?: string;
  latencyMs?: number | null;
  network?: string;
}

@Component({
  selector: 'app-status-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-overlay.html',
  styleUrl: './status-overlay.css',
})
export class StatusOverlayComponent implements OnInit {
  private readonly api = inject(BlockchainApiService);
  private readonly shell = inject(ShellFeedbackService);

  readonly health = signal<HealthCheck>({
    service: 'dartchain-backend',
    ok: true,
    label: 'Online',
    latencyMs: null,
    network: 'Local',
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly statusLabel = computed(() => {
    const current = this.health();
    return current.label || (current.ok ? 'Online' : 'Offline');
  });

  readonly latencyLabel = computed(() => {
    const value = this.health().latencyMs;

    if (value === null || value === undefined || Number.isNaN(value)) {
      return 'N/A';
    }

    return `${value} ms`;
  });

  readonly networkLabel = computed(() => {
    return this.health().network || 'N/A';
  });

  readonly serviceLabel = computed(() => {
    return this.health().service || 'Service inconnu';
  });

  constructor() {
    effect(() => {
      this.shell.setBannerError(this.error());
    });
  }

  ngOnInit(): void {
    void this.loadHealth();
  }

  async refresh(): Promise<void> {
    await this.loadHealth();
  }

  private async loadHealth(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const startedAt = performance.now();

    try {
      const response = await firstValueFrom(this.api.getHealth());
      const latencyMs = Math.round(performance.now() - startedAt);

      this.health.set({
        service: response.service || 'dartchain-backend',
        ok: response.ok,
        label: response.ok ? 'Online' : 'Offline',
        latencyMs,
        network: 'Local',
      });
    } catch (error) {
      console.error(error);

      this.health.set({
        service: 'dartchain-backend',
        ok: false,
        label: 'Offline',
        latencyMs: null,
        network: 'Local',
      });

      this.error.set('Backend hors ligne — certaines actions peuvent échouer.');
    } finally {
      this.loading.set(false);
    }
  }
}