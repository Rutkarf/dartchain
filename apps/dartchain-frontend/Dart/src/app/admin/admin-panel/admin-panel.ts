import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { LocaleService } from '../../core/i18n/locale.service';
import { OpsSnapshot } from '@admin/models/ops-snapshot.model';
import { OpsSnapshotService } from '@admin/services/ops-snapshot.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  private readonly opsSnapshotService = inject(OpsSnapshotService);
  protected readonly locale = inject(LocaleService);

  protected readonly snapshot = signal<OpsSnapshot | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly gaugeEntries = computed(() => {
    const gauges = this.snapshot()?.gauges ?? {};
    return Object.entries(gauges).map(([key, value]) => ({ key, value }));
  });

  protected readonly counterEntries = computed(() => {
    const counters = this.snapshot()?.counters ?? {};
    return Object.entries(counters).map(([key, value]) => ({ key, value }));
  });

  protected readonly latencyEntries = computed(() => {
    const latency = this.snapshot()?.latency ?? {};
    return Object.entries(latency).map(([key, value]) => ({ key, value }));
  });

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.refresh();
    this.refreshTimer = setInterval(() => void this.refresh(), 30_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  protected async refresh(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const data = await this.opsSnapshotService.fetchSnapshot();
      this.snapshot.set(data);
    } catch {
      this.errorMessage.set(this.locale.t('admin.error'));
    } finally {
      this.loading.set(false);
    }
  }

  protected formatKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (char) => char.toUpperCase())
      .trim();
  }

  protected formatTimestamp(value: string | undefined): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
}
