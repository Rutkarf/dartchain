import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from '../../core/services/auth.service';
import { R4v3CommunityFaqService } from '../../core/services/r4v3-community-faq.service';
import { ShowcaseDaoStateService } from '../../core/services/showcase-dao-state.service';
import { ShowcaseLaunchStateService } from '../../core/services/showcase-launch-state.service';
import { ShowcaseDaoComponent } from './showcase-dao';

describe('ShowcaseDaoComponent', () => {
  let fixture: ComponentFixture<ShowcaseDaoComponent>;

  beforeEach(async () => {
    const launchState = {
      loading: signal(false),
      error: signal(false),
      projects: signal([
        {
          id: 'launch-1',
          name: 'Pixel DAO',
          symbol: 'PXD',
          status: 'LIVE' as const,
          raised: '4.2k',
          target: '8k',
          description: 'Gouvernance communautaire Pixel.',
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
      loadProjects: vi.fn(),
      requestRefresh: vi.fn(),
    };

    const community = {
      loading: signal(false),
      refreshing: signal(false),
      error: signal(false),
      questions: signal([]),
      load: vi.fn(),
    };

    const daoState = {
      loading: signal(false),
      error: signal(false),
      cards: signal([
        {
          id: 'dao-launch-1',
          symbol: 'PXD',
          name: 'Pixel DAO',
          launchStatus: 'LIVE' as const,
          status: 'active' as const,
          summary: 'Gouvernance communautaire Pixel.',
          objective: 'Coordonner les décisions.',
          proposalsCount: 2,
          votesCount: 12,
          membersActive: 18,
        },
      ]),
      activeCount: signal(1),
      activeCountLabel: signal('1 DAO ACTIVE'),
      activeCards: signal([]),
      load: vi.fn(),
      refresh: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ShowcaseDaoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ShowcaseLaunchStateService, useValue: launchState },
        { provide: R4v3CommunityFaqService, useValue: community },
        { provide: ShowcaseDaoStateService, useValue: daoState },
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => false, user: () => null },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowcaseDaoComponent);
    fixture.componentRef.setInput('isExpanded', true);
    fixture.detectChanges();
  });

  it('should render DAO cards', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.showcase-dao__list')).toBeTruthy();
    expect(root.querySelectorAll('.showcase-dao__card').length).toBe(1);
  });

  it('should open drawer with close button when a card is clicked', () => {
    const root = fixture.nativeElement as HTMLElement;
    const card = root.querySelector('.showcase-dao__card') as HTMLButtonElement;
    card.click();
    fixture.detectChanges();

    expect(root.querySelector('.dao-drawer')).toBeTruthy();
    expect(root.querySelector('.dao-drawer__close')).toBeTruthy();
  });

  it('should remember last selected DAO in state service', () => {
    const daoState = TestBed.inject(ShowcaseDaoStateService);
    const root = fixture.nativeElement as HTMLElement;
    const cardBtn = root.querySelector('.showcase-dao__card') as HTMLButtonElement;
    cardBtn.click();
    fixture.detectChanges();

    expect(daoState.collapsedDaoCard()?.symbol).toBe('PXD');
    expect(daoState.collapsedDaoHeadline()).toContain('Pixel DAO');
  });
});
