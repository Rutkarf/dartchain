import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from '../../core/services/auth.service';
import { BrandCryptoSelectionService } from '../../core/services/brand-crypto-selection.service';
import { ShowcaseLaunchStateService } from '../../core/services/showcase-launch-state.service';
import { ShowcaseLaunchComponent } from './showcase-launch';

describe('ShowcaseLaunchComponent (Phase V)', () => {
  let fixture: ComponentFixture<ShowcaseLaunchComponent>;

  beforeEach(async () => {
    const launchState = {
      loading: signal(false),
      error: signal(false),
      successMessage: signal<string | null>(null),
      projects: signal([
        {
          id: 'launch-1',
          name: 'Phase V Token',
          symbol: 'PHV',
          status: 'LIVE',
          raised: '10',
          target: '100',
        },
      ]),
      counts: signal({ total: 1, live: 1, soon: 0, ended: 0 }),
      statusLabel: signal('En cours'),
      progressPercent: signal(100),
      phase: signal('running'),
      loadProjects: vi.fn(),
      requestRefresh: vi.fn(),
      openLaunchDrawer: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ShowcaseLaunchComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BrandCryptoSelectionService,
        {
          provide: ShowcaseLaunchStateService,
          useValue: launchState,
        },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: vi.fn(() => false),
            promptLogin: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowcaseLaunchComponent);
    fixture.componentRef.setInput('isExpanded', true);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and render launch project', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Phase V Token');
  });
});
