import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPanelComponent } from './admin-panel';
import { LocaleService } from '../../core/i18n/locale.service';
import { OpsSnapshotService } from '@admin/services/ops-snapshot.service';

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
              recentEvents: [{ at: '2026-07-14T12:00:00Z', type: 'auth.login', detail: 'alice' }],
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPanelComponent);
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('renders snapshot gauges after load', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Phase AF');
    expect(element.textContent).toContain('MEMPOOL_HIGH');
    expect(element.textContent).toContain('auth.login');
  });
});
