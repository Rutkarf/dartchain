import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { QuestsProgressService } from './quests-progress.service';
import { WalletSessionService } from './wallet-session.service';

function flushBootstrapRequests(httpMock: HttpTestingController): void {
  for (const request of httpMock.match(() => true)) {
    if (request.request.url.includes('/api/showcase/launch/projects')) {
      request.flush([]);
      continue;
    }

    if (request.request.url.includes('/api/v1/auth/oauth/providers')) {
      request.flush({ providers: [] });
      continue;
    }

    if (request.request.url.includes('/api/v1/auth/me')) {
      request.error(new ProgressEvent('error'), { status: 401 });
    }
  }
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: QuestsProgressService,
          useValue: {
            syncFromServer: vi.fn(),
            mergeGuestProgressOnLogin: vi.fn().mockResolvedValue(undefined),
            recordDailyLogin: vi.fn(),
          },
        },
        {
          provide: WalletSessionService,
          useValue: {
            requestBalanceRefresh: vi.fn(),
          },
        },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);
    flushBootstrapRequests(httpMock);
  });

  afterEach(() => {
    flushBootstrapRequests(httpMock);
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
    httpMock.expectOne('/api/v1/auth/oauth/providers').flush({ providers: [] });
    expect(service.drawerOpen()).toBe(true);
    expect(service.drawerMode()).toBe('login');
  });

  it('uses v1 auth endpoints for login', async () => {
    const loginPromise = service.login({
      identifier: 'alice',
      password: 'password123',
    });

    const request = httpMock.expectOne('/api/v1/auth/login');
    expect(request.request.method).toBe('POST');
    request.flush({
      token: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
      user: {
        id: '1',
        username: 'alice',
        email: 'alice@example.com',
        createdAt: Date.now(),
      },
    });

    await loginPromise;
    expect(service.isAuthenticated()).toBe(true);
  });

  it('closes drawer and clears error', () => {
    service.openDrawer('register');
    httpMock.expectOne('/api/v1/auth/oauth/providers').flush({ providers: [] });
    service.closeDrawer();

    expect(service.drawerOpen()).toBe(false);
    expect(service.error()).toBeNull();
  });

  it('switches drawer mode', () => {
    service.setDrawerMode('register');
    expect(service.drawerMode()).toBe('register');
  });

  it('closes auth drawer when logging out', async () => {
    localStorage.setItem('dartchain_auth_token', 'access-token');
    localStorage.setItem('dartchain_auth_user', JSON.stringify({
      id: '1',
      username: 'alice',
      email: 'alice@example.com',
      createdAt: Date.now(),
    }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: QuestsProgressService,
          useValue: {
            syncFromServer: vi.fn(),
            mergeGuestProgressOnLogin: vi.fn().mockResolvedValue(undefined),
            recordDailyLogin: vi.fn(),
          },
        },
        {
          provide: WalletSessionService,
          useValue: {
            requestBalanceRefresh: vi.fn(),
          },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);
    flushBootstrapRequests(httpMock);

    service.openDrawer('login');
    httpMock.expectOne('/api/v1/auth/oauth/providers').flush({ providers: [] });

    const logoutPromise = service.logout();
    httpMock.expectOne('/api/v1/auth/logout').flush(null);
    await logoutPromise;

    expect(service.drawerOpen()).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
  });
});
