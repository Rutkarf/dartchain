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
  let brandCrypto: {
    selectLaunchToken: ReturnType<typeof vi.fn>;
    requestExchangeTrade: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    brandCrypto = {
      selectLaunchToken: vi.fn(),
      requestExchangeTrade: vi.fn(),
      select: vi.fn(),
    };

    const launchState = {
      loading: signal(false),
      error: signal(false),
      successMessage: signal<string | null>(null),
      projects: signal([
        {
          id: 'launch-1',
          name: 'Pixel DAO',
          symbol: 'PXD',
          status: 'LIVE' as const,
          raised: '4.2k',
          target: '8k',
          whitepaperUrl: 'https://example.com/whitepaper.pdf',
        },
        {
          id: 'launch-2',
          name: 'Soon Token',
          symbol: 'SOON',
          status: 'SOON' as const,
          raised: '0',
          target: '50',
        },
      ]),
      counts: signal({ total: 2, live: 1, soon: 1, ended: 0 }),
      liveProjects: signal([
        {
          id: 'launch-1',
          name: 'Pixel DAO',
          symbol: 'PXD',
          status: 'LIVE' as const,
          raised: '4.2k',
          target: '8k',
        },
      ]),
      marketCapLabel: (project: { raised: string; target?: string }) =>
        project.target ? `${project.raised} / ${project.target}` : project.raised,
      loadProjects: vi.fn(),
      requestRefresh: vi.fn(),
      openLaunchDrawer: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ShowcaseLaunchComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: BrandCryptoSelectionService,
          useValue: brandCrypto,
        },
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

  it('should create and render launch hub with live header', () => {
    expect(fixture.componentInstance).toBeTruthy();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Pixel DAO');
    expect(root.querySelector('.showcase-launch__live-led')).toBeTruthy();
    expect(root.querySelector('.showcase-meta__live-text')?.textContent?.trim()).toBe('1 LIVE');
    expect(root.querySelector('.showcase-meta__refresh')).toBeFalsy();
    expect(root.querySelector('.showcase-meta__filter-select')).toBeFalsy();
    expect(root.querySelector('.showcase-launch__whitepaper')).toBeTruthy();
    expect(root.querySelector('.showcase-launch__cta')).toBeTruthy();
  });

  it('should open project drawer when ticker is clicked', () => {
    const ticker = fixture.nativeElement.querySelector('.showcase-launch__ticker') as HTMLButtonElement;
    ticker.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.launch-project-drawer')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('PXD');
  });

  it('should trigger launch swap flow for launchpad token', () => {
    const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');
    const swapBtn = fixture.nativeElement.querySelector('.showcase-launch__action') as HTMLButtonElement;

    swapBtn.click();
    fixture.detectChanges();

    expect(brandCrypto.selectLaunchToken).toHaveBeenCalledWith('PXD');
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'exchange-panel-open' }));
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'exchange-panel-focus' }));
  });
});
