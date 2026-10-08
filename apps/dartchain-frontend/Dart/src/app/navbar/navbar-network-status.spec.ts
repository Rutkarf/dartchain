import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from '@auth/services/auth.service';
import { NetworkTrustService } from '@navbar/services/network-trust.service';
import { NavbarNetworkStatusComponent } from './navbar-network-status';

describe('NavbarNetworkStatusComponent', () => {
  let component: NavbarNetworkStatusComponent;
  let fixture: ComponentFixture<NavbarNetworkStatusComponent>;
  let apiOk: ReturnType<typeof signal<boolean>>;
  let trustState: ReturnType<typeof signal<'checking' | 'live' | 'slow' | 'offline'>>;
  let authenticated: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    apiOk = signal(true);
    trustState = signal<'checking' | 'live' | 'slow' | 'offline'>('live');
    authenticated = signal(false);

    await TestBed.configureTestingModule({
      imports: [NavbarNetworkStatusComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: NetworkTrustService,
          useValue: {
            apiOk: apiOk.asReadonly(),
            trustState: trustState.asReadonly(),
            streamLive: signal(false).asReadonly(),
            chipLabel: signal('Direct').asReadonly(),
            latencyLabel: signal('12ms').asReadonly(),
            chipAriaLabel: signal('État réseau').asReadonly(),
            refresh: async () => undefined,
          },
        },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: authenticated.asReadonly(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarNetworkStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('LED orange pour invité quand API OK', () => {
    authenticated.set(false);
    trustState.set('live');
    apiOk.set(true);
    expect(component.ledTone()).toBe('orange');
  });

  it('LED verte pour session connectée quand API OK', () => {
    authenticated.set(true);
    trustState.set('live');
    apiOk.set(true);
    expect(component.ledTone()).toBe('green');
  });

  it('LED rouge quand API / backend KO', () => {
    authenticated.set(true);
    trustState.set('offline');
    apiOk.set(false);
    expect(component.ledTone()).toBe('red');
  });

  it('LED checking pendant la vérification santé', () => {
    trustState.set('checking');
    apiOk.set(false);
    expect(component.ledTone()).toBe('checking');
  });
});
