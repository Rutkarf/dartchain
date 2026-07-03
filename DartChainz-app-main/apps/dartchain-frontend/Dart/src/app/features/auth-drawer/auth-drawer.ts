import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { AuthService } from '../../core/services/auth.service';
import { AuthMode } from '../../core/models/auth.model';

@Component({
  selector: 'app-auth-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth-drawer.html',
  styleUrl: './auth-drawer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthDrawerComponent {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly showPassword = signal(false);

  readonly loginForm = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
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
    this.auth.closeDrawer();
  }

  switchMode(mode: AuthMode): void {
    this.auth.setDrawerMode(mode);
  }

  togglePassword(): void {
    this.showPassword.update((value) => !value);
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
