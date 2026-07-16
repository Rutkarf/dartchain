import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);

    for (const request of httpMock.match(() => true)) {
      if (request.request.url.includes('/api/showcase/launch/projects')) {
        request.flush([]);
      }
    }
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('reports unauthenticated by default', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.isAdmin()).toBe(false);
  });

  it('opens login drawer when promptLogin is called without session', () => {
    expect(service.promptLogin()).toBe(false);
    expect(service.drawerOpen()).toBe(true);
    expect(service.drawerMode()).toBe('login');
  });

  it('closes drawer and clears error', () => {
    service.openDrawer('register');
    service.closeDrawer();

    expect(service.drawerOpen()).toBe(false);
    expect(service.error()).toBeNull();
  });

  it('switches drawer mode', () => {
    service.setDrawerMode('register');
    expect(service.drawerMode()).toBe('register');
  });
});
