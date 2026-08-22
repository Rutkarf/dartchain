import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { METAVERSE_PLACEMENT_API } from '@world-map/placements/placement-api.repository';
import { PlacementFacade } from '@world-map/placements/placement.facade';
import { PlacementDetailsPanel } from './placement-details-panel';

describe('PlacementDetailsPanel', () => {
  let fixture: ComponentFixture<PlacementDetailsPanel>;
  let facade: PlacementFacade;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlacementDetailsPanel],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(PlacementDetailsPanel);
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

  it('reste fermé tant qu’aucun emplacement n’est sélectionné', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.placement-panel')).toBeNull();
  });

  it('affiche la fiche et se ferme via le bouton', async () => {
    await loadDevCatalog();
    facade.select('dev-placement-01');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.placement-panel')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('OpenStreetMap');
    fixture.nativeElement.querySelector('.ghost')?.click();
    fixture.detectChanges();
    expect(facade.selectedPlacementId()).toBeNull();
  });

  it('envoie un devis sans traiter received comme une réservation', async () => {
    await loadDevCatalog();
    facade.select('dev-placement-01');
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    expect(form).toBeTruthy();
    (form.querySelector('input[type="email"]') as HTMLInputElement).value = 'a@example.com';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    http
      .expectOne(
        `${environment.apiUrl}${METAVERSE_PLACEMENT_API.inquiryPath('dev-placement-01')}`
      )
      .flush({ inquiryId: 'inq-1', status: 'received' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(facade.inquiryReceived()).toBe(true);
    expect(facade.selectedPlacement()?.status).toBe('available');
    expect(fixture.nativeElement.textContent).toContain('ne réserve pas');
  });

  it('n’affiche pas le CTA checkout sur un emplacement en pause', async () => {
    await loadDevCatalog();
    facade.select('dev-placement-04');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Pas de demande en ligne');
  });
});
