import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { ShowcaseR4v3Component } from './showcase-r4v3';

const mockR4v3Dashboard = {
  panel: {
    symbol: 'R4V3',
    pair: 'R4V3 / CHF',
    value: '1,00',
    change: '+0.0%',
    positive: true,
    points: [42, 44, 43, 46],
  },
  news: {
    headline: 'DartChain',
    lastTransaction: '—',
    featuredId: null,
    items: [],
    categories: ['R4V3'],
    liveActivity: 'R4V3 actif',
    lastRefreshedAt: '2026-01-01T00:00:00Z',
    totalCount: 0,
    hasMore: false,
  },
  launchTokens: [],
  swapStats: { swapNewsCount: 0, lastSwapSummary: '—' },
  ratesLatencyMs: 12,
  lastRefreshedAt: '2026-01-01T00:00:00Z',
};

function flushAncillaryRequests(http: HttpTestingController): void {
  http.match((r) => r.url.includes('/showcase/launch/projects')).forEach((req) => req.flush([]));
  http.match((r) => r.url.includes('/showcase/faq/questions')).forEach((req) => {
    const payload = {
      id: 'faq-3',
      authorId: 'seed-user-3',
      authorName: 'SwissHODL',
      title: 'Quelle est la prochaine évolution du protocole R4V3 ?',
      body: 'Roadmap mainnet',
      createdAt: '2026-07-17T06:00:00Z',
      status: 'ACTIVE',
      score: 2,
      upvotes: 2,
      downvotes: 0,
      answerCount: 0,
      pendingStaffReview: true,
    };

    if (req.request.url.includes('/popular')) {
      req.flush({ questions: [payload], totalCount: 1 });
      return;
    }

    if (req.request.url.includes('/latest')) {
      req.flush(payload);
      return;
    }

    req.flush({
      questions: [payload],
      totalCount: 1,
    });
  });
  http.match((r) => r.url.includes('/exchange-panel')).forEach((req) =>
    req.flush({
      fromToken: 'R4V3',
      toToken: 'PXD',
      fromBalance: 0,
      toBalance: 0,
      rate: 1,
      testnet: true,
      availableTokens: ['R4V3', 'PXD'],
    })
  );
}

describe('ShowcaseR4v3Component', () => {
  let fixture: ComponentFixture<ShowcaseR4v3Component>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowcaseR4v3Component],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowcaseR4v3Component);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.match(() => true).forEach((req) => {
      try {
        if (req.request.url.includes('/showcase/faq/questions')) {
          const payload = {
            id: 'faq-3',
            authorId: 'seed-user-3',
            authorName: 'SwissHODL',
            title: 'Quelle est la prochaine évolution du protocole R4V3 ?',
            body: 'Roadmap mainnet',
            createdAt: '2026-07-17T06:00:00Z',
            status: 'ACTIVE',
            score: 2,
            upvotes: 2,
            downvotes: 0,
            answerCount: 0,
            pendingStaffReview: true,
          };

          if (req.request.url.includes('/popular')) {
            req.flush({ questions: [payload], totalCount: 1 });
            return;
          }

          if (req.request.url.includes('/latest')) {
            req.flush(payload);
            return;
          }

          req.flush({ questions: [payload], totalCount: 1 });
          return;
        }

        req.flush(req.request.method === 'GET' ? mockR4v3Dashboard : {});
      } catch {
        // already handled
      }
    });
  });

  it('should render six interactive pillars and dynamic header', async () => {
    fixture.detectChanges();

    http.expectOne((r) => r.url.includes('/showcase/r4v3')).flush(mockR4v3Dashboard);
    flushAncillaryRequests(http);

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.showcase-r4v3__pillar').length).toBe(6);
    expect(fixture.nativeElement.querySelectorAll('.showcase-r4v3__pillar-column').length).toBe(3);
    const pegText = fixture.nativeElement.querySelector('.showcase-r4v3__peg--hero')?.textContent ?? '';
    expect(pegText.replace(/\s+/g, ' ').trim()).toContain('1 R4V3 = 1 CHF');
    expect(pegText).not.toContain('GBP');
    expect(fixture.nativeElement.querySelector('.showcase-r4v3__wp-btn')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('.showcase-r4v3__wp-btn-label')?.textContent?.trim()
    ).toBe('White paper');
    expect(fixture.nativeElement.querySelector('.showcase-r4v3__wp-btn-hint')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.showcase-meta__refresh')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.showcase-r4v3__live-quote')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.showcase-r4v3__status-led--banner')).toBeFalsy();
  });

  it('should open hub drawer from pillar click', async () => {
    fixture.detectChanges();

    http.expectOne((r) => r.url.includes('/showcase/r4v3')).flush(mockR4v3Dashboard);
    flushAncillaryRequests(http);

    await fixture.whenStable();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.showcase-r4v3__pillar')?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.drawerPayload()?.kind).toBe('pillar');
    expect(fixture.nativeElement.querySelector('.r4v3-hub-drawer')).toBeTruthy();
  });

  it('should render wiki rail and community section link', async () => {
    fixture.detectChanges();

    http.expectOne((r) => r.url.includes('/showcase/r4v3')).flush(mockR4v3Dashboard);
    flushAncillaryRequests(http);

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.showcase-r4v3__rail-btn--left')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.showcase-r4v3__section-link--community')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Wiki');
    expect(fixture.nativeElement.textContent).toContain('FAQ communautaire');
  });
});
