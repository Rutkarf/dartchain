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
    pair: 'R4V3 / EUR',
    value: '1,00',
    change: '+1.2%',
    positive: true,
    points: [42, 44, 43, 46],
  },
  news: {
    headline: 'DartChain',
    lastTransaction: '—',
    featuredId: 'swap-1',
    items: [
      {
        id: 'swap-1',
        category: 'R4V3',
        title: 'Swap testnet exécuté',
        summary: 'DART → R4V3',
        body: 'Swap body',
        publishedAt: '2026-01-01T00:00:00Z',
        relativeTime: '1m',
        source: 'EDITORIAL',
        actionType: 'OPEN_SWAP',
        actionTarget: 'DART',
        featured: true,
      },
    ],
    categories: ['R4V3'],
    liveActivity: 'R4V3 actif',
    lastRefreshedAt: '2026-01-01T00:00:00Z',
    totalCount: 1,
    hasMore: false,
  },
  launchTokens: [
    { symbol: 'DART', priceVsR4v3: '1 R4V3', change: '+0.0%', positive: true },
  ],
  swapStats: { swapNewsCount: 1, lastSwapSummary: 'DART → R4V3' },
  ratesLatencyMs: 12,
  lastRefreshedAt: '2026-01-01T00:00:00Z',
};

function flushAncillaryRequests(http: HttpTestingController): void {
  http.match((r) => r.url.includes('/showcase/launch/projects')).forEach((req) => req.flush([]));
  http.match((r) => r.url.includes('/exchange-panel')).forEach((req) =>
    req.flush({
      fromToken: 'DART',
      toToken: 'R4V3',
      fromBalance: 0,
      toBalance: 0,
      rate: 1,
      testnet: true,
      availableTokens: ['R4V3', 'DART'],
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
    http.verify();
  });

  it('should create and load aggregated R4V3 dashboard', async () => {
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url.includes('/showcase/r4v3'));
    req.flush(mockR4v3Dashboard);
    flushAncillaryRequests(http);

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.showcase-r4v3__live-brand')?.textContent).toContain('R4V3');
    expect(fixture.nativeElement.querySelector('.showcase-r4v3__list')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.showcase-r4v3__swap-footer')).toBeTruthy();
  });

  it('should open drawer when clicking a news item', async () => {
    fixture.detectChanges();

    http.expectOne((r) => r.url.includes('/showcase/r4v3')).flush(mockR4v3Dashboard);
    flushAncillaryRequests(http);

    await fixture.whenStable();
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('.showcase-r4v3__item--featured .showcase-r4v3__item-btn')
      ?.click();

    const detailReq = http.expectOne((r) => r.url.includes('/showcase/news/swap-1'));
    detailReq.flush(mockR4v3Dashboard.news.items[0]);

    fixture.detectChanges();

    expect(fixture.componentInstance.selectedItem()?.id).toBe('swap-1');
    expect(fixture.nativeElement.querySelector('.showcase-news-drawer')).toBeTruthy();
  });

  it('should open pin panel when clicking Quest, R4V3, Wallet, Swap and token rows', async () => {
    fixture.detectChanges();

    http.expectOne((r) => r.url.includes('/showcase/r4v3')).flush(mockR4v3Dashboard);
    flushAncillaryRequests(http);

    await fixture.whenStable();
    fixture.detectChanges();

    const clickPin = (label: string) => {
      const buttons = fixture.nativeElement.querySelectorAll(
        '.showcase-r4v3__item-btn'
      ) as NodeListOf<HTMLElement>;
      const button = Array.from(buttons).find((node) =>
        node.textContent?.includes(label)
      );

      expect(button, `row ${label}`).toBeTruthy();
      button?.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.showcase-r4v3__pin-panel')).toBeTruthy();
      (
        fixture.nativeElement.querySelector(
          '.showcase-r4v3__pin-close'
        ) as HTMLButtonElement | null
      )?.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.showcase-r4v3__pin-panel')).toBeFalsy();
    };

    clickPin('Quest');
    clickPin('R4V3');
    clickPin('Wallet');
    clickPin('Swap');
    clickPin('DART');
  });

  it('should reload feed when changing source filter select', async () => {
    fixture.detectChanges();

    http.expectOne((r) => r.url.includes('/showcase/r4v3')).flush(mockR4v3Dashboard);
    flushAncillaryRequests(http);

    await fixture.whenStable();
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector(
      '.showcase-meta__filter-select'
    ) as HTMLSelectElement;
    expect(select).toBeTruthy();

    select.value = 'CHAIN';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const filteredReq = http.expectOne(
      (r) => r.url.includes('/showcase/r4v3') && r.params.get('source') === 'CHAIN'
    );
    filteredReq.flush({
      ...mockR4v3Dashboard,
      news: { ...mockR4v3Dashboard.news, items: [], totalCount: 0 },
    });
    flushAncillaryRequests(http);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('On-chain');
  });
});
