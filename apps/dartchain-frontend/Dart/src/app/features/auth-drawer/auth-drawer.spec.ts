import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';

import { AuthDrawerComponent } from './auth-drawer';
import { AuthService } from '../../core/services/auth.service';

describe('AuthDrawer', () => {
  let fixture: ComponentFixture<AuthDrawerComponent>;
  let authService: {
    closeDrawer: ReturnType<typeof vi.fn>;
    setDrawerMode: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    drawerMode: ReturnType<typeof signal<'login' | 'register'>>;
    drawerOpen: ReturnType<typeof signal<boolean>>;
    loading: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();

    authService = {
      closeDrawer: vi.fn(),
      setDrawerMode: vi.fn((mode: 'login' | 'register') => authService.drawerMode.set(mode)),
      login: vi.fn().mockResolvedValue(true),
      register: vi.fn().mockResolvedValue(true),
      drawerMode: signal<'login' | 'register'>('login'),
      drawerOpen: signal(true),
      loading: signal(false),
      error: signal<string | null>(null),
    };

    await TestBed.configureTestingModule({
      imports: [AuthDrawerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthDrawerComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders login form in login mode', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('input[formcontrolname="identifier"]')).toBeTruthy();
    expect(element.querySelector('input[formcontrolname="password"]')).toBeTruthy();
  });

  it('renders register form after switching mode', () => {
    fixture.componentInstance.switchMode('register');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('input[formcontrolname="username"]')).toBeTruthy();
    expect(element.querySelector('input[formcontrolname="email"]')).toBeTruthy();
  });

  it('submits login when form is valid', async () => {
    fixture.componentInstance.loginForm.setValue({
      identifier: 'alice',
      password: 'password123',
    });

    await fixture.componentInstance.submitLogin();

    expect(authService.login).toHaveBeenCalledWith({
      identifier: 'alice',
      password: 'password123',
    });
  });

  it('switches drawer mode through auth service', () => {
    fixture.componentInstance.switchMode('register');
    expect(authService.setDrawerMode).toHaveBeenCalledWith('register');
  });
});
