import { HttpBackend, HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import type { AuthResponse } from '@auth/models/auth.model';
import { environment } from '../../../environments/environment';
import {
  clearAuthSession,
  readStoredRefreshToken,
  updateStoredAccessToken,
} from './auth-session.storage';

function refreshUrl(): string {
  return `${environment.apiUrl.replace(/\/+$/, '')}/v1/auth/refresh`;
}

let refreshInFlight: Promise<string | null> | null = null;

function isAuthMutationUrl(url: string): boolean {
  return (
    url.includes('/auth/login')
    || url.includes('/auth/register')
    || url.includes('/auth/refresh')
    || url.includes('/v1/auth/login')
    || url.includes('/v1/auth/register')
    || url.includes('/v1/auth/refresh')
  );
}

export function shouldAttemptTokenRefresh(url: string, status: number): boolean {
  return status === 401 && !isAuthMutationUrl(url) && !!readStoredRefreshToken();
}

export async function refreshAccessToken(httpBackend: HttpBackend): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh(httpBackend).finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

async function performRefresh(httpBackend: HttpBackend): Promise<string | null> {
  const refreshToken = readStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const http = new HttpClient(httpBackend);

  try {
    const response = await firstValueFrom(
      http.post<AuthResponse>(refreshUrl(), { refreshToken })
    );

    const accessToken = response.accessToken ?? response.token;
    updateStoredAccessToken(accessToken, response.expiresIn);

    if (response.refreshToken) {
      localStorage.setItem('dartchain_auth_refresh', response.refreshToken);
    }

    return accessToken;
  } catch {
    clearAuthSession();
    return null;
  }
}
