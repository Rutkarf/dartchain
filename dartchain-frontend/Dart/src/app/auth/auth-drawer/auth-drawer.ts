import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { AuthService } from '@auth/services/auth.service';
import { AuthChallengeStatus, AuthMode } from '@auth/models/auth.model';
import { FocusTrapDirective } from '../../core/directives/focus-trap.directive';
import { LocaleService } from '../../core/i18n/locale.service';
import { AUTH_OAUTH_PROVIDERS } from './auth-drawer.oauth';

type AuthFieldKind = 'identifier' | 'username' | 'email' | 'password';

@Component({
  selector: 'app-auth-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FocusTrapDirective],
  templateUrl: './auth-drawer.html',
  styleUrl: './auth-drawer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthDrawerComponent {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);
  readonly oauthProviders = AUTH_OAUTH_PROVIDERS;

  readonly showPassword = signal(false);

  readonly loginForm = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly codeForm = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly registerForm = this.fb.group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(32),
        Validators.pattern(/^[A-Za-z0-9_]+$/),
      ],
    ],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  close(): void {
    this.codeForm.reset();
    this.auth.closeDrawer();
  }

  drawerTitle(): string {
    const step = this.auth.challenge()?.status;
    if (step === 'EMAIL_VERIFICATION') {
      return this.locale.t('auth.emailCodeTitle');
    }
    if (step === 'TWO_FACTOR' || step === 'TOTP_SETUP' || step === 'TOTP_DISABLE') {
      return this.locale.t('auth.twoFactorTitle');
    }
    return this.auth.drawerMode() === 'login'
      ? this.locale.t('auth.loginTitle')
      : this.locale.t('auth.registerTitle');
  }

  challengeSubmitLabel(status: AuthChallengeStatus): string {
    if (status === 'EMAIL_VERIFICATION') {
      return this.locale.t('auth.emailCodeSubmit');
    }
    if (status === 'TOTP_SETUP') {
      return this.locale.t('auth.twoFactorEnable');
    }
    if (status === 'TOTP_DISABLE') {
      return this.locale.t('auth.twoFactorDisable');
    }
    return this.locale.t('auth.twoFactorSubmit');
  }

  backFromChallenge(): void {
    this.codeForm.reset();
    const stayOpen = !this.auth.isAuthenticated();
    this.auth.clearChallenge();
    if (!stayOpen) {
      this.auth.closeDrawer();
    }
  }

  resendEmail(): void {
    void this.auth.resendEmailCode();
  }

  async submitChallenge(): Promise<void> {
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }
    const code = this.codeForm.getRawValue().code ?? '';
    const status = this.auth.challenge()?.status;
    let done = false;
    if (status === 'EMAIL_VERIFICATION') {
      done = await this.auth.confirmEmailCode(code);
    } else if (status === 'TWO_FACTOR') {
      done = await this.auth.confirmTotpCode(code);
    } else if (status === 'TOTP_SETUP') {
      done = await this.auth.enableTotp(code);
    } else if (status === 'TOTP_DISABLE') {
      done = await this.auth.disableTotp(code);
    }
    if (done) {
      this.codeForm.reset();
    }
  }

  switchMode(mode: AuthMode): void {
    this.auth.setDrawerMode(mode);
  }

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  startOAuth(providerId: string): void {
    this.auth.startOAuth(providerId);
  }

  oauthButtonTitle(providerId: string): string {
    if (!this.auth.isOAuthProviderEnabled(providerId)) {
      return this.locale.t('auth.oauthUnavailable');
    }
    if (this.auth.isOAuthProviderMock(providerId)) {
      return this.locale.t('auth.oauthMock');
    }
    return this.locale.t(
      this.oauthProviders.find((provider) => provider.id === providerId)?.labelKey ?? 'auth.orContinueWith'
    );
  }

  showFieldError(control: AbstractControl | null): boolean {
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  fieldError(control: AbstractControl | null, kind: AuthFieldKind): string {
    if (!control || !control.errors) {
      return this.locale.t('auth.validation.required');
    }

    if (control.errors['required']) {
      return this.locale.t('auth.validation.required');
    }

    if (kind === 'identifier' && control.errors['minlength']) {
      return this.locale.t('auth.validation.identifierMin');
    }

    if (kind === 'username' && control.errors['pattern']) {
      return this.locale.t('auth.validation.usernamePattern');
    }

    if (kind === 'email' && control.errors['email']) {
      return this.locale.t('auth.validation.email');
    }

    if (kind === 'password' && control.errors['minlength']) {
      return this.locale.t('auth.validation.passwordMin');
    }

    return this.locale.t('auth.validation.required');
  }

  async submitLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { identifier, password } = this.loginForm.getRawValue();
    await this.auth.login({
      identifier: identifier ?? '',
      password: password ?? '',
    });
  }

  async submitRegister(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { username, email, password } = this.registerForm.getRawValue();
    const success = await this.auth.register({
      username: username ?? '',
      email: email ?? '',
      password: password ?? '',
    });

    if (success) {
      this.registerForm.reset();
    }
  }
}
