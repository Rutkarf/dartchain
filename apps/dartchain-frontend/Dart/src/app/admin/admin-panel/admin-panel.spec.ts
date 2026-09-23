import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { AdminPanelComponent } from './admin-panel';
import { LocaleService } from '../../core/i18n/locale.service';
import { OpsSnapshotService } from '@admin/services/ops-snapshot.service';
import { AdminSeedSessionService } from '@admin/services/admin-seed-session.service';
import { AdminExportClientService } from '@admin/services/admin-export-client.service';

describe('AdminPanelComponent', () => {
  let fixture: ComponentFixture<AdminPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPanelComponent],
      providers: [
        LocaleService,
        {
          provide: OpsSnapshotService,
          useValue: {
            fetchSnapshot: async () => ({
              collectedAt: '2026-07-14T12:00:00Z',
              phase: 'AF',
              counters: { authLogins: 4 },
              gauges: { chainHeight: 12, mempoolSize: 1 },
              latency: { avgRequestLatencyMs: 42 },
              metadata: { observabilityModel: 'native-json' },
              alerts: [{ level: 'warn', code: 'MEMPOOL_HIGH', message: 'test' }],
              recentEvents: [
                { at: '2026-07-14T12:00:00Z', type: 'auth.login', detail: 'alice' },
              ],
            }),
          },
        },
        {
          provide: AdminSeedSessionService,
          useValue: {
            isUnlocked: signal(false).asReadonly(),
            isUnlocking: signal(false).asReadonly(),
            unlockError: signal<string | null>(null).asReadonly(),
            seedConfigured: signal(true).asReadonly(),
            expiresAtLabel: signal('').asReadonly(),
            refreshStatus: async () => undefined,
            unlock: async () => false,
            lock: async () => undefined,
          },
        },
        {
          provide: AdminExportClientService,
          useValue: {
            domains: ['users', 'ops', 'socControls'],
            download: async () => undefined,
            downloadAllFormats: async () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPanelComponent);
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('shows seed gate when locked', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('seed');
  });
});
