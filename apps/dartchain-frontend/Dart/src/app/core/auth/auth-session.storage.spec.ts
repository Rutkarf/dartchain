import {
  AUTH_EXPIRES_AT_KEY,
  AUTH_REFRESH_KEY,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  clearAuthSession,
  isAccessTokenExpired,
  persistAuthSession,
  readStoredRefreshToken,
  updateStoredAccessToken,
} from './auth-session.storage';

describe('auth-session.storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads the stored auth token', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'session-token-123');

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('session-token-123');
  });

  it('persists refresh token and expiry from auth response', () => {
    persistAuthSession({
      token: 'access-token',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
      user: {
        id: '1',
        username: 'alice',
        email: 'alice@dartchain.dev',
        createdAt: 1,
        role: 'USER',
      },
    });

    expect(readStoredRefreshToken()).toBe('refresh-token');
    expect(isAccessTokenExpired(0)).toBe(false);
  });

  it('clears all auth keys', () => {
    persistAuthSession({
      token: 'access-token',
      user: {
        id: '1',
        username: 'alice',
        email: 'alice@dartchain.dev',
        createdAt: 1,
      },
    });
    localStorage.setItem(AUTH_REFRESH_KEY, 'refresh');
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(Date.now() + 60_000));

    clearAuthSession();

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_REFRESH_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_EXPIRES_AT_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull();
  });

  it('updates stored access token expiry', () => {
    updateStoredAccessToken('rotated-token', 120);

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('rotated-token');
    expect(isAccessTokenExpired(0)).toBe(false);
  });
});
