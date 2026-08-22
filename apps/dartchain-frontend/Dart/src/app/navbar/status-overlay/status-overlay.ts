import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';

import { NetworkTrustService } from '@navbar/services/network-trust.service';
import { ShellFeedbackService } from '@core/services/shell-feedback.service';

export type LatencyTier = 'checking' | 'unknown' | 'excellent' | 'good' | 'slow' | 'poor';

@Component({
  selector: 'app-status-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-overlay.html',
  styleUrl: './status-overlay.css',
})
export class StatusOverlayComponent {
  readonly trust = inject(NetworkTrustService);
  private readonly shell = inject(ShellFeedbackService);

  readonly latencyTier = computed((): LatencyTier => {
    if (this.trust.loading()) {
      return 'checking';
    }

    const ms = this.trust.latencyMs();
    if (ms === null || Number.isNaN(ms)) {
      return 'unknown';
    }
    if (ms < 100) {
      return 'excellent';
    }
    if (ms < 300) {
      return 'good';
    }
    if (ms < 800) {
      return 'slow';
    }
    return 'poor';
  });

  readonly latencyGaugeWidth = computed(() => {
    const ms = this.trust.latencyMs();
    if (ms === null || Number.isNaN(ms)) {
      return 8;
    }
    return Math.max(8, Math.min(100, Math.round(100 - (ms / 900) * 92)));
  });

  readonly displayLatency = computed(() => {
    if (this.trust.loading()) {
      return '...';
    }

    const ms = this.trust.latencyMs();
    if (ms !== null && Number.isFinite(ms)) {
      return `${ms} ms`;
    }

    const label = this.trust.latencyLabel();
    return label?.trim() && label !== '…' ? label : 'N/A';
  });

  readonly apiTone = computed(() => {
    if (this.trust.loading()) {
      return 'checking';
    }
    return this.trust.apiOk() ? 'ok' : 'error';
  });

  readonly apiShortLabel = computed(() => {
    if (this.trust.loading()) {
      return '...';
    }
    return this.trust.apiOk() ? 'OK' : 'KO';
  });

  constructor() {
    effect(() => {
      this.shell.setBannerError(this.trust.errorMessage());
    });
  }

  refresh(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    void this.trust.refresh();
  }

  close(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.shell.statusPanelOpen.set(false);
  }
}
