import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';

import { ShowcaseNewsComponent } from './showcase-news';

const mockFeed = {
  headline: 'DartChain',
  lastTransaction: '—',
  featuredId: null,
  items: [
    {
      id: '1',
      category: 'Réseau',
      title: 'Test',
      summary: 'Résumé test',
      body: 'Corps test',
      publishedAt: '2026-01-01T00:00:00Z',
      relativeTime: '1h',
      source: 'CHAIN',
      actionType: 'NONE',
      actionTarget: null,
      featured: false,
    },
  ],
  categories: ['Réseau'],
  liveActivity: 'Chaîne synchronisée',
  lastRefreshedAt: '2026-01-01T00:00:00Z',
  totalCount: 1,
  hasMore: false,
};

describe('ShowcaseNewsComponent', () => {
  let fixture: ComponentFixture<ShowcaseNewsComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowcaseNewsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowcaseNewsComponent);
    http = TestBed.inject(HttpTestingController);
  });

  function flushPendingHttp(): void {
    http.match(() => true).forEach((request) => {
      try {
        const url = request.request.url;

        if (url.includes('/showcase/news/')) {
          request.flush(mockFeed.items[0]);
          return;
        }

        if (url.includes('/showcase/news')) {
          request.flush(mockFeed);
          return;
        }

        if (url.includes('/blocks')) {
          request.flush([]);
          return;
        }

        if (url.includes('/pending-transactions')) {
          request.flush([]);
          return;
        }

        request.flush(request.request.method === 'GET' ? [] : {});
      } catch {
        // already handled
      }
    });
  }

  afterEach(() => {
    flushPendingHttp();
    http.verify();
  });

  it('should create and load news', async () => {
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url.includes('/showcase/news'));
    req.flush(mockFeed);

    flushPendingHttp();
    await fixture.whenStable();
    expect(fixture.componentInstance.items().length).toBe(1);
    expect(fixture.nativeElement.querySelector('.showcase-news__meta-bar')).toBeTruthy();
  });

  it('should open drawer when clicking a news item', async () => {
    fixture.detectChanges();

    http.expectOne((r) => r.url.includes('/showcase/news')).flush(mockFeed);

    flushPendingHttp();
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.showcase-news__item-btn')?.click();

    const detailReq = http.expectOne((r) => r.url.includes('/showcase/news/1'));
    detailReq.flush(mockFeed.items[0]);

    fixture.detectChanges();

    expect(fixture.componentInstance.selectedItem()?.id).toBe('1');
    expect(fixture.nativeElement.querySelector('.showcase-news-drawer')).toBeTruthy();
  });
});
