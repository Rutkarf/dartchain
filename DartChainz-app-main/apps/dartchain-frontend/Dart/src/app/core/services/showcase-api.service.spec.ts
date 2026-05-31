import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { ShowcaseApiService } from './showcase-api.service';

describe('ShowcaseApiService', () => {
  let service: ShowcaseApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ShowcaseApiService],
    });

    service = TestBed.inject(ShowcaseApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should load news feed', () => {
    service.getNewsFeed().subscribe((feed) => {
      expect(feed.headline).toBe('DartChain');
      expect(feed.items.length).toBe(1);
    });

    const req = http.expectOne((r) => r.url.includes('/showcase/news'));
    expect(req.request.method).toBe('GET');
    req.flush({
      headline: 'DartChain',
      lastTransaction: '—',
      featuredId: null,
      items: [
        {
          id: '1',
          category: 'Réseau',
          title: 'Test',
          summary: 'Summary',
          publishedAt: '',
          relativeTime: 'now',
          source: 'EDITORIAL',
        },
      ],
      categories: ['Réseau'],
    });
  });

  it('should load launch projects', () => {
    service.getLaunchProjects().subscribe((projects) => {
      expect(projects.length).toBe(1);
      expect(projects[0].symbol).toBe('DART');
    });

    const req = http.expectOne((r) => r.url.includes('/showcase/launch/projects'));
    req.flush([{ id: '1', name: 'DART', symbol: 'DART', status: 'LIVE', raised: '1k' }]);
  });
});
