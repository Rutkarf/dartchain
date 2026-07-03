import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuthMode,
  AuthResponse,
  LoginRequest,
  LinkWalletRequest,
  RegisterRequest,
  UserProfile,
} from '../models/auth.model';
import { QuestsProgressService } from './quests-progress.service';

const TOKEN_KEY = 'dartchain_auth_token';
const USER_KEY = 'dartchain_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly questsProgress = inject(QuestsProgressService);

  private readonly userSignal = signal<UserProfile | null>(this.readStoredUser());
  private readonly tokenSignal = signal<string | null>(this.readStoredToken());
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly drawerOpenSignal = signal(false);
  private readonly drawerModeSignal = signal<AuthMode>('login');

  readonly user = this.userSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly drawerOpen = this.drawerOpenSignal.asReadonly();
  readonly drawerMode = this.drawerModeSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null && !!this.tokenSignal());

  constructor() {
    void this.restoreSession();
  }

  openDrawer(mode: AuthMode = 'login'): void {
    this.errorSignal.set(null);
    this.drawerModeSignal.set(mode);
    this.drawerOpenSignal.set(true);
  }

  closeDrawer(): void {
    this.drawerOpenSignal.set(false);
    this.errorSignal.set(null);
  }

  setDrawerMode(mode: AuthMode): void {
    this.errorSignal.set(null);
    this.drawerModeSignal.set(mode);
  }

  async register(payload: RegisterRequest): Promise<boolean> {
    return this.authenticate('register', payload);
  }

  async login(payload: LoginRequest): Promise<boolean> {
    return this.authenticate('login', payload);
  }

  async logout(): Promise<void> {
    const token = this.tokenSignal();
    if (token) {
      try {
        await firstValueFrom(
          this.http.post<void>(`${environment.apiUrl}/auth/logout`, null, {
            headers: this.buildAuthHeaders(token),
          })
        );
      } catch {
        // Local logout even if backend session is already gone.
      }
    }

    this.clearSession();
  }

  authHeaders(): HttpHeaders {
    const token = this.tokenSignal();
    return token ? this.buildAuthHeaders(token) : new HttpHeaders();
  }

  async linkWallet(walletAddress: string, publicKey: string): Promise<boolean> {
    const token = this.tokenSignal();
    if (!token) {
      this.errorSignal.set('Connectez-vous pour lier un wallet.');
      return false;
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const user = await firstValueFrom(
        this.http.put<UserProfile>(`${environment.apiUrl}/auth/me/wallet`, {
          walletAddress,
          publicKey,
        }, {
          headers: this.buildAuthHeaders(token),
        })
      );
      this.userSignal.set(user);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return true;
    } catch (error) {
      this.errorSignal.set(this.extractErrorMessage(error));
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async refreshProfile(): Promise<void> {
    const token = this.tokenSignal();
    if (!token) {
      return;
    }

    try {
      const user = await firstValueFrom(
        this.http.get<UserProfile>(`${environment.apiUrl}/auth/me`, {
          headers: this.buildAuthHeaders(token),
        })
      );
      this.userSignal.set(user);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      this.clearSession();
    }
  }

  private async authenticate(
    kind: 'login' | 'register',
    payload: LoginRequest | RegisterRequest
  ): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const url =
        kind === 'register'
          ? `${environment.apiUrl}/auth/register`
          : `${environment.apiUrl}/auth/login`;

      const response = await firstValueFrom(this.http.post<AuthResponse>(url, payload));
      this.applySession(response);
      this.questsProgress.recordDailyLogin();
      this.closeDrawer();
      return true;
    } catch (error) {
      this.errorSignal.set(this.extractErrorMessage(error));
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  private async restoreSession(): Promise<void> {
    const token = this.tokenSignal();
    if (!token) {
      return;
    }

    try {
      const user = await firstValueFrom(
        this.http.get<UserProfile>(`${environment.apiUrl}/auth/me`, {
          headers: this.buildAuthHeaders(token),
        })
      );
      this.userSignal.set(user);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      this.clearSession();
    }
  }

  private applySession(response: AuthResponse): void {
    this.tokenSignal.set(response.token);
    this.userSignal.set(response.user);
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  }

  private clearSession(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private buildAuthHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private readStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private readStoredUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch {
      return null;
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Une erreur est survenue.';
    }

    const body = error.error as { message?: string } | null;
    if (body?.message) {
      return body.message;
    }

    if (error.status === 0) {
      return 'Impossible de contacter le serveur.';
    }

    return 'Une erreur est survenue.';
  }
}
