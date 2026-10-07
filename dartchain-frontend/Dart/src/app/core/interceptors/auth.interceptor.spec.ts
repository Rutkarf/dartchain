import { HttpBackend, HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  AUTH_EXPIRES_AT_KEY,
  AUTH_REFRESH_KEY,
  AUTH_TOKEN_KEY,
} from '../auth/auth-session.storage';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('forwards requests unchanged when no token is stored', () => {
    http.get('/api/blockchain/chain').subscribe();

    const request = httpMock.expectOne('/api/blockchain/chain');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);
  });

  it('adds Bearer authorization when a token is stored', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'session-token-abc');

    http.get('/api/quests/state').subscribe();

    const request = httpMock.expectOne('/api/quests/state');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer session-token-abc'
    );
    request.flush({});
  });

  it('refreshes an expired token before sending the request', async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'expired-token');
    localStorage.setItem(AUTH_REFRESH_KEY, 'refresh-token-xyz');
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(Date.now() - 1000));

    http.get('/api/quests/state').subscribe();

    const refresh = httpMock.expectOne('/api/v1/auth/refresh');
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-token-xyz' });
    refresh.flush({
      token: 'new-access-token',
      accessToken: 'new-access-token',
      refreshToken: 'refresh-token-rotated',
      expiresIn: 3600,
      tokenType: 'Bearer',
      user: {
        id: 'u1',
        username: 'alice',
        email: 'alice@dartchain.dev',
        createdAt: 1,
        role: 'USER',
      },
    });

    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    const api = httpMock.expectOne('/api/quests/state');
    expect(api.request.headers.get('Authorization')).toBe('Bearer new-access-token');
    api.flush({ ok: true });

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('new-access-token');
  });
});
