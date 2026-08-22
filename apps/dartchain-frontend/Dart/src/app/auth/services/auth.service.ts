import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuthMode,
  AuthResponse,
  LoginRequest,
  LinkWalletRequest,
  OAuthProviderInfo,
  OAuthProvidersResponse,
  RegisterRequest,
  UserProfile,
} from '@auth/models/auth.model';
import {
  clearAuthSession,
  persistAuthSession,
  readStoredAuthToken,
  readStoredRefreshToken,
  readStoredUser,
} from '@core/auth/auth-session.storage';
import { QuestsProgressService } from '@quests/services/quests-progress.service';
import { WalletSessionService } from '@wallet/services/wallet-session.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly questsProgress = inject(QuestsProgressService);
  private readonly walletSession = inject(WalletSessionService);

  private readonly userSignal = signal<UserProfile | null>(readStoredUser());
  private readonly tokenSignal = signal<string | null>(readStoredAuthToken());
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly drawerOpenSignal = signal(false);
  private readonly drawerModeSignal = signal<AuthMode>('login');
  private readonly oauthProvidersSignal = signal<OAuthProviderInfo[]>([]);
  private readonly oauthRedirectingSignal = signal(false);

  readonly user = this.userSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly drawerOpen = this.drawerOpenSignal.asReadonly();
  readonly drawerMode = this.drawerModeSignal.asReadonly();
  readonly oauthProviders = this.oauthProvidersSignal.asReadonly();
  readonly oauthRedirecting = this.oauthRedirectingSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null && !!this.tokenSignal());
  readonly isAdmin = computed(() => this.userSignal()?.role === 'ADMIN');

  constructor() {
    void this.restoreSession();
    void this.loadOAuthProviders();
  }

  openDrawer(mode: AuthMode = 'login'): void {
    this.errorSignal.set(null);
    this.drawerModeSignal.set(mode);
    this.drawerOpenSignal.set(true);
    void this.loadOAuthProviders();
  }

  /** Ouvre le drawer login si la session est absente. Retourne true si déjà authentifié. */
  promptLogin(): boolean {
    if (this.isAuthenticated()) {
      return true;
    }

    this.openDrawer('login');
    return false;
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
    this.closeDrawer();
    const token = this.tokenSignal();
    const refreshToken = readStoredRefreshToken();

    if (token) {
      try {
        await firstValueFrom(
          this.http.post<void>(
            this.authV1('/logout'),
            refreshToken ? { refreshToken } : null,
            {
              headers: this.buildAuthHeaders(token),
            }
          )
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
        this.http.put<UserProfile>(
          this.authV1('/me/wallet'),
          {
            walletAddress,
            publicKey,
          } satisfies LinkWalletRequest,
          {
            headers: this.buildAuthHeaders(token),
          }
        )
      );
      this.userSignal.set(user);
      localStorage.setItem('dartchain_auth_user', JSON.stringify(user));
      this.questsProgress.syncFromServer();
      this.walletSession.requestBalanceRefresh();
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
        this.http.get<UserProfile>(this.authV1('/me'), {
          headers: this.buildAuthHeaders(token),
        })
      );
      this.userSignal.set(user);
      localStorage.setItem('dartchain_auth_user', JSON.stringify(user));
    } catch {
      await this.tryRefreshSession();
    }
  }

  async loadOAuthProviders(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<OAuthProvidersResponse>(this.authV1('/oauth/providers'))
      );
      this.oauthProvidersSignal.set(response.providers ?? []);
    } catch {
      this.oauthProvidersSignal.set([]);
    }
  }

  isOAuthProviderEnabled(providerId: string): boolean {
    return this.oauthProvidersSignal().some(
      (provider) => provider.id === providerId && provider.enabled
    );
  }

  startOAuth(providerId: string): void {
    if (!this.isOAuthProviderEnabled(providerId)) {
      return;
    }

    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const url = `${this.authV1(`/oauth/connect/${providerId}`)}?redirect_uri=${encodeURIComponent(redirectUri)}`;
    this.oauthRedirectingSignal.set(true);
    window.location.assign(url);
  }

  async handleOAuthCallbackOnLoad(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('oauth_code');
    if (!code) {
      return;
    }

    params.delete('oauth_code');
    const query = params.toString();
    const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', cleanUrl);

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(this.authV1('/oauth/exchange'), { code })
      );
      this.applySession(response);
      await this.questsProgress.mergeGuestProgressOnLogin();
      this.questsProgress.recordDailyLogin();
      this.closeDrawer();
    } catch (error) {
      this.errorSignal.set(this.extractErrorMessage(error));
      this.openDrawer('login');
    } finally {
      this.loadingSignal.set(false);
      this.oauthRedirectingSignal.set(false);
    }
  }

  private async authenticate(
    kind: 'login' | 'register',
    payload: LoginRequest | RegisterRequest
  ): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const url = kind === 'register' ? this.authV1('/register') : this.authV1('/login');
      const response = await firstValueFrom(this.http.post<AuthResponse>(url, payload));
      this.applySession(response);
      await this.questsProgress.mergeGuestProgressOnLogin();
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
        this.http.get<UserProfile>(this.authV1('/me'), {
          headers: this.buildAuthHeaders(token),
        })
      );
      this.userSignal.set(user);
      localStorage.setItem('dartchain_auth_user', JSON.stringify(user));
      this.questsProgress.syncFromServer();
    } catch {
      const refreshed = await this.tryRefreshSession();
      if (!refreshed) {
        this.clearSession();
      }
    }
  }

  private async tryRefreshSession(): Promise<boolean> {
    const refreshToken = readStoredRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(this.authV1('/refresh'), { refreshToken })
      );
      this.applySession(response);
      this.questsProgress.syncFromServer();
      return true;
    } catch {
      return false;
    }
  }

  private applySession(response: AuthResponse): void {
    const accessToken = response.accessToken ?? response.token;
    this.tokenSignal.set(accessToken);
    this.userSignal.set(response.user);
    persistAuthSession(response);
  }

  private clearSession(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.closeDrawer();
    clearAuthSession();
  }

  private authV1(path: string): string {
    const base = environment.apiUrl.replace(/\/+$/, '');
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return `${base}/v1/auth${suffix}`;
  }

  private buildAuthHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
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
