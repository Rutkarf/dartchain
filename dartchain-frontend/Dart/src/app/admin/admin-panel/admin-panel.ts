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
import { FormsModule } from '@angular/forms';

import { LocaleService } from '../../core/i18n/locale.service';
import { OpsSnapshot } from '@admin/models/ops-snapshot.model';
import { OpsSnapshotService } from '@admin/services/ops-snapshot.service';
import { AdminSeedSessionService } from '@admin/services/admin-seed-session.service';
import {
  AdminExportClientService,
  AdminExportFormat,
} from '@admin/services/admin-export-client.service';

type AdminSection = 'ops' | 'soc' | 'export';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  private readonly opsSnapshotService = inject(OpsSnapshotService);
  private readonly seedSession = inject(AdminSeedSessionService);
  private readonly exportClient = inject(AdminExportClientService);
  protected readonly locale = inject(LocaleService);

  protected readonly snapshot = signal<OpsSnapshot | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly section = signal<AdminSection>('soc');
  protected readonly seedDraft = signal('');
  protected readonly exportBusy = signal(false);
  protected readonly exportNotice = signal<string | null>(null);
  protected readonly selectedDomains = signal<string[]>([...this.exportClient.domains]);

  protected readonly unlocked = this.seedSession.isUnlocked;
  protected readonly unlocking = this.seedSession.isUnlocking;
  protected readonly unlockError = this.seedSession.unlockError;
  protected readonly seedConfigured = this.seedSession.seedConfigured;
  protected readonly expiresAtLabel = this.seedSession.expiresAtLabel;

  protected readonly domains = this.exportClient.domains;

  protected readonly socRows = [
    {
      framework: 'SOC1',
      type: 'Type 1',
      criterion: 'ICFR-access',
      control: 'Accès logique ledger / comptes',
      status: 'designed',
    },
    {
      framework: 'SOC1',
      type: 'Type 2',
      criterion: 'ICFR-ops-period',
      control: 'Efficacité opérationnelle sur période',
      status: 'gap-org',
    },
    {
      framework: 'SOC2',
      type: 'Type 1',
      criterion: 'CC6.1',
      control: 'JWT + seed unlock admin',
      status: 'designed',
    },
    {
      framework: 'SOC2',
      type: 'Type 1',
      criterion: 'CC6.7',
      control: 'Seed hashée (SHA-256), jamais en clair',
      status: 'designed',
    },
    {
      framework: 'SOC2',
      type: 'Type 1',
      criterion: 'CC7.2',
      control: 'Export evidence pack json/txt/csv',
      status: 'designed',
    },
    {
      framework: 'SOC2',
      type: 'Type 2',
      criterion: 'CC6.1-ops',
      control: 'Revues d’accès périodiques',
      status: 'gap-org',
    },
    {
      framework: 'SOC2',
      type: 'Type 2',
      criterion: 'CC8.1-ops',
      control: 'Historique changements sur période',
      status: 'gap-org',
    },
  ] as const;

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
    void this.seedSession.refreshStatus();
    if (this.unlocked()) {
      void this.refresh();
      this.refreshTimer = setInterval(() => void this.refresh(), 30_000);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  protected onSeedInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement | null)?.value ?? '';
    this.seedDraft.set(value);
  }

  protected async submitUnlock(): Promise<void> {
    const ok = await this.seedSession.unlock(this.seedDraft());
    if (!ok) return;
    this.seedDraft.set('');
    this.section.set('export');
    void this.refresh();
    if (!this.refreshTimer) {
      this.refreshTimer = setInterval(() => void this.refresh(), 30_000);
    }
  }

  protected async lock(): Promise<void> {
    await this.seedSession.lock();
    this.snapshot.set(null);
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  protected setSection(next: AdminSection): void {
    this.section.set(next);
    if (next === 'ops' && this.unlocked()) {
      void this.refresh();
    }
  }

  protected toggleDomain(domain: string, checked: boolean): void {
    const current = new Set(this.selectedDomains());
    if (checked) current.add(domain);
    else current.delete(domain);
    this.selectedDomains.set([...current]);
  }

  protected domainChecked(domain: string): boolean {
    return this.selectedDomains().includes(domain);
  }

  protected async exportOne(format: AdminExportFormat): Promise<void> {
    this.exportBusy.set(true);
    this.exportNotice.set(null);
    try {
      await this.exportClient.download(format, this.selectedDomains());
      this.exportNotice.set(`Export .${format} téléchargé`);
    } catch {
      this.exportNotice.set('Export impossible — vérifiez la session seed');
    } finally {
      this.exportBusy.set(false);
    }
  }

  protected async exportAll(): Promise<void> {
    this.exportBusy.set(true);
    this.exportNotice.set(null);
    try {
      await this.exportClient.downloadAllFormats(this.selectedDomains());
      this.exportNotice.set('Exports .json + .txt + .csv téléchargés');
    } catch {
      this.exportNotice.set('Export impossible — vérifiez la session seed');
    } finally {
      this.exportBusy.set(false);
    }
  }

  protected async refresh(): Promise<void> {
    if (!this.unlocked()) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const data = await this.opsSnapshotService.fetchSnapshot();
      this.snapshot.set(data);
    } catch {
      // Ops snapshot still requires JWT ADMIN — soft-fail if not bootstrap admin.
      this.errorMessage.set(this.locale.t('admin.opsOptional'));
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
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
}
