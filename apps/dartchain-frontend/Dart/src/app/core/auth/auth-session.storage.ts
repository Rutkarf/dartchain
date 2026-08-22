import type { AuthResponse, UserProfile } from '@auth/models/auth.model';

export const AUTH_TOKEN_KEY = 'dartchain_auth_token';
export const AUTH_REFRESH_KEY = 'dartchain_auth_refresh';
export const AUTH_EXPIRES_AT_KEY = 'dartchain_auth_expires_at';
export const AUTH_USER_KEY = 'dartchain_auth_user';

export function readStoredAuthToken(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function readStoredRefreshToken(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  return localStorage.getItem(AUTH_REFRESH_KEY);
}

export function readStoredExpiresAt(): number | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(AUTH_EXPIRES_AT_KEY);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readStoredUser(): UserProfile | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(leewayMs = 30_000): boolean {
  const expiresAt = readStoredExpiresAt();
  if (!expiresAt) {
    return false;
  }

  return Date.now() + leewayMs >= expiresAt;
}

export function persistAuthSession(response: AuthResponse): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const accessToken = response.accessToken ?? response.token;
  localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));

  if (response.refreshToken) {
    localStorage.setItem(AUTH_REFRESH_KEY, response.refreshToken);
  }

  if (response.expiresIn) {
    localStorage.setItem(
      AUTH_EXPIRES_AT_KEY,
      String(Date.now() + response.expiresIn * 1000)
    );
  }
}

export function updateStoredAccessToken(accessToken: string, expiresIn?: number): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(AUTH_TOKEN_KEY, accessToken);

  if (expiresIn) {
    localStorage.setItem(
      AUTH_EXPIRES_AT_KEY,
      String(Date.now() + expiresIn * 1000)
    );
  }
}

export function clearAuthSession(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_KEY);
  localStorage.removeItem(AUTH_EXPIRES_AT_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}
