import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'dartchain-admin-unlock';

interface StoredUnlock {
  token: string;
  expiresAtEpochMs: number;
}

@Injectable({ providedIn: 'root' })
export class AdminSeedSessionService {
  private readonly http = inject(HttpClient);
  private readonly unlockToken = signal<string | null>(null);
  private readonly expiresAt = signal<number | null>(null);
  private readonly error = signal<string | null>(null);
  private readonly unlocking = signal(false);
  private readonly configured = signal(false);

  readonly isUnlocked = computed(() => {
    const token = this.unlockToken();
    const exp = this.expiresAt();
    return Boolean(token && exp && exp > Date.now());
  });
  readonly unlockError = this.error.asReadonly();
  readonly isUnlocking = this.unlocking.asReadonly();
  readonly seedConfigured = this.configured.asReadonly();
  readonly expiresAtLabel = computed(() => {
    const exp = this.expiresAt();
    if (!exp) return '';
    return new Date(exp).toLocaleString();
  });

  constructor() {
    this.restore();
    void this.refreshStatus();
  }

  unlockHeaders(): HttpHeaders {
    const token = this.unlockToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('X-Admin-Unlock-Token', token);
    }
    return headers;
  }

  async refreshStatus(): Promise<void> {
    try {
      const status = await firstValueFrom(
        this.http.get<{ configured: boolean }>(`${environment.apiUrl}/v1/admin/status`)
      );
      this.configured.set(Boolean(status.configured));
    } catch {
      this.configured.set(false);
    }
  }

  async unlock(seed: string): Promise<boolean> {
    this.unlocking.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(
        this.http.post<{
          success: boolean;
          unlockToken: string;
          expiresAtEpochMs: number;
          message?: string;
        }>(`${environment.apiUrl}/v1/admin/unlock`, { seed })
      );
      this.unlockToken.set(response.unlockToken);
      this.expiresAt.set(response.expiresAtEpochMs);
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          token: response.unlockToken,
          expiresAtEpochMs: response.expiresAtEpochMs,
        } satisfies StoredUnlock)
      );
      return true;
    } catch (err) {
      const message =
        (err as { error?: { message?: string; detail?: string } })?.error?.message ||
        (err as { error?: { detail?: string } })?.error?.detail ||
        'Seed admin invalide';
      this.error.set(message);
      return false;
    } finally {
      this.unlocking.set(false);
    }
  }

  async lock(): Promise<void> {
    const token = this.unlockToken();
    try {
      if (token) {
        await firstValueFrom(
          this.http.post(
            `${environment.apiUrl}/v1/admin/lock`,
            {},
            { headers: this.unlockHeaders() }
          )
        );
      }
    } catch {
      // ignore
    }
    this.unlockToken.set(null);
    this.expiresAt.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  private restore(): void {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredUnlock;
      if (parsed.expiresAtEpochMs > Date.now() && parsed.token) {
        this.unlockToken.set(parsed.token);
        this.expiresAt.set(parsed.expiresAtEpochMs);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }
}
