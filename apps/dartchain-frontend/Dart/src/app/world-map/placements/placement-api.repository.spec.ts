import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import {
  METAVERSE_PLACEMENT_API,
  PlacementApiRepository,
} from './placement-api.repository';
import { createDevPlacementFixtures } from './placement-fixtures.dev';

describe('PlacementApiRepository', () => {
  let repo: PlacementApiRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PlacementApiRepository,
      ],
    });
    repo = TestBed.inject(PlacementApiRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('mappe une réponse API list sans passer par les fixtures', async () => {
    const pending = repo.listPlacements();
    const req = http.expectOne(
      (request) =>
        request.method === 'GET' &&
        request.url === `${environment.apiUrl}${METAVERSE_PLACEMENT_API.listPath}`
    );
    req.flush({
      type: 'METAVERSE_PLACEMENTS',
      source: 'authorized-api',
      serverTime: '2026-08-20T12:00:00.000Z',
      buildings: [
        {
          id: 'api-building',
          label: 'API building',
          world: { x: 1, y: 0, z: 1 },
          status: 'active',
        },
      ],
      placements: [
        {
          id: 'api-placement',
          buildingId: 'api-building',
          anchorWorld: { x: 1, y: 1.2, z: 1 },
          status: 'available',
        },
      ],
    });

    const result = await pending;
    expect(result.fallback).toBe('api');
    expect(result.catalog?.source).toBe('authorized-api');
    expect(result.catalog?.placements.map((item) => item.id)).toEqual([
      'api-placement',
    ]);
  });

  it('bascule sur les fixtures DEV si l’API liste échoue hors production', async () => {
    expect(environment.production).toBe(false);
    const pending = repo.listPlacements();
    const req = http.expectOne(
      (request) =>
        request.method === 'GET' && request.url.endsWith('/metaverse/placements')
    );
    req.flush('nope', { status: 404, statusText: 'Not Found' });

    const result = await pending;
    expect(result.fallback).toBe('fixture-dev');
    expect(result.catalog?.source).toBe('fixture-dev');
    expect(result.catalog?.placements.length).toBe(
      createDevPlacementFixtures().placements.length
    );
  });

  it('ne simule pas un inquiry reçu quand le POST échoue', async () => {
    const pending = repo.submitInquiry({ placementId: 'dev-placement-01' });
    const req = http.expectOne(
      `${environment.apiUrl}${METAVERSE_PLACEMENT_API.inquiryPath('dev-placement-01')}`
    );
    req.flush('nope', { status: 503, statusText: 'Unavailable' });

    const result = await pending;
    expect(result.response).toBeNull();
    expect(result.error).toBe('Demande non transmise.');
  });
});
