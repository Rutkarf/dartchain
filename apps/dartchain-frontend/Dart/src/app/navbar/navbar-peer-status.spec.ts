import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { NavbarPeerStatusComponent } from './navbar-peer-status';
import { environment } from '../../environments/environment';

describe('NavbarPeerStatusComponent', () => {
  let component: NavbarPeerStatusComponent;
  let fixture: ComponentFixture<NavbarPeerStatusComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarPeerStatusComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarPeerStatusComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load peer stats on init', async () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/peers/stats`);
    expect(req.request.method).toBe('GET');
    req.flush({ active: 2, total: 5 });

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.peersLabel()).toBe('2/5');
    expect(component.isOnline()).toBe(true);
  });

  it('should show offline when no active peers', async () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/peers/stats`);
    req.flush({ active: 0, total: 3 });

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.peersLabel()).toBe('0/3');
    expect(component.isOnline()).toBe(false);
  });
});
