import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { METAVERSE_PLACEMENT_API } from './placement-api.repository';
import { PlacementFacade } from './placement.facade';

describe('PlacementFacade', () => {
  let facade: PlacementFacade;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PlacementFacade],
    });
    facade = TestBed.inject(PlacementFacade);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  async function loadDevCatalog(): Promise<void> {
    const pending = facade.load();
    http
      .expectOne(
        (request) =>
          request.method === 'GET' && request.url.endsWith('/metaverse/placements')
      )
      .flush('nope', { status: 404, statusText: 'Not Found' });
    await pending;
  }

  it('refuse un second submit tant que le premier est en vol', async () => {
    await loadDevCatalog();
    facade.select('dev-placement-01');

    const first = facade.submitInquiry({ contactEmail: 'a@example.com' });
    expect(facade.inquiryBusy()).toBe(true);
    const second = facade.submitInquiry({ contactEmail: 'a@example.com' });
    expect(await second).toBe(false);
    expect(facade.inquiryError()).toBe('Demande déjà en cours.');

    http
      .expectOne(
        `${environment.apiUrl}${METAVERSE_PLACEMENT_API.inquiryPath('dev-placement-01')}`
      )
      .flush({ inquiryId: 'inq-1', status: 'received' });
    expect(await first).toBe(true);
  });

  it('ne traite pas received comme une réservation d’emplacement', async () => {
    await loadDevCatalog();
    facade.select('dev-placement-01');
    const pending = facade.submitInquiry({ contactEmail: 'a@example.com' });
    http
      .expectOne(
        `${environment.apiUrl}${METAVERSE_PLACEMENT_API.inquiryPath('dev-placement-01')}`
      )
      .flush({ inquiryId: 'inq-1', status: 'received' });
    expect(await pending).toBe(true);
    expect(facade.inquiryBusy()).toBe(false);
    expect(facade.inquiryReceived()).toBe(true);
    expect(facade.selectedPlacement()?.status).toBe('available');
    facade.select('dev-placement-03');
    expect(facade.inquiryReceived()).toBe(false);
  });
});
