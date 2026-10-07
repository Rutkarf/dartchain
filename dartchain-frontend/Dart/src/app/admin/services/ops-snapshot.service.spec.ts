import { HttpHeaders } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { OpsSnapshotService } from './ops-snapshot.service';
import { AuthService } from '@auth/services/auth.service';

describe('OpsSnapshotService', () => {
  let service: OpsSnapshotService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OpsSnapshotService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            authHeaders: () => new HttpHeaders({ Authorization: 'Bearer admin-token' }),
          },
        },
      ],
    });

    service = TestBed.inject(OpsSnapshotService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches ops snapshot from v1 endpoint', async () => {
    const promise = service.fetchSnapshot();

    const request = httpMock.expectOne((req) => req.url.includes('/v1/ops/snapshot'));
    expect(request.request.headers.get('Authorization')).toBe('Bearer admin-token');

    request.flush({
      collectedAt: '2026-07-14T12:00:00Z',
      phase: 'AF',
      counters: { blocksMined: 1 },
      gauges: { chainHeight: 2 },
      latency: { requestCount: 3 },
      metadata: { observabilityModel: 'native-json' },
      alerts: [],
      recentEvents: [],
    });

    const snapshot = await promise;
    expect(snapshot.phase).toBe('AF');
    expect(snapshot.gauges['chainHeight']).toBe(2);
  });
});
