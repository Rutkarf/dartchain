import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CommonModule } from '@angular/common';

import { AppComponent } from './app';
import { AuthDrawerComponent } from './features/auth-drawer/auth-drawer';
import { NavbarComponent } from './navbar/navbar';
import { BrandCryptoSelectComponent } from './navbar/brand-crypto-select';
import { ExplorerSearchComponent } from './navbar/explorer-search';
import { NavbarNetworkStatusComponent } from './navbar/navbar-network-status';
import { NavbarPeerStatusComponent } from './navbar/navbar-peer-status';
import { SearchbarComponent } from './searchbar/searchbar';

@Component({
  selector: 'app-r4v3-three',
  standalone: true,
  template: '',
})
class MockR4v3ThreeComponent {
  @Input() externalRotation?: { x: number; y: number; z: number };
  @Input() modelTargetSize = 16;
  @Input() cameraFitFactor = 1.72;
  @Input() frameBiasX = 0;
  @Input() frameBiasY = 0;
  @Input() enableOrbit = true;
  @Input() presentation: 'default' | 'navbar' = 'default';

  randomizeFromParentClick(): void {}
}

describe('AppComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .overrideComponent(NavbarComponent, {
        set: {
          imports: [
            CommonModule,
            NavbarNetworkStatusComponent,
            NavbarPeerStatusComponent,
            BrandCryptoSelectComponent,
            ExplorerSearchComponent,
            SearchbarComponent,
            MockR4v3ThreeComponent,
            AuthDrawerComponent,
          ],
        },
      })
      .compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.match(() => true).forEach((request) => {
      try {
        const url = request.request.url;
        if (url.includes('/crypto-rates/chart')) {
          request.flush({
            symbol: 'BTC',
            range: '24h',
            currency: 'usd',
            low: '100',
            high: '110',
            points: [{ t: 1, v: 0.5 }],
          });
          return;
        }
        if (url.includes('/chart')) {
          request.flush({
            pair: 'R4V3-EUR',
            range: '24h',
            currentPrice: '100',
            changePercent: 1.2,
            positive: true,
            high: '110',
            low: '90',
            volume: '1000',
            points: [{ t: 1, v: 0.5 }],
          });
          return;
        }
        request.flush(request.request.method === 'GET' ? [] : {});
      } catch {
        // already handled
      }
    });
    httpMock.verify();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the app shell and showcase block', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    httpMock.match(() => true).forEach((request) => {
      const url = request.request.url;

      if (url.includes('/exchange-panel')) {
        request.flush({
          fromToken: 'BTC',
          toToken: 'R4V3',
          availableTokens: ['R4V3', 'BTC'],
          fromBalance: 0,
          toBalance: 0,
          rate: 48000,
          testnet: true,
        });
        return;
      }

      if (url.includes('/showcase/launch/projects')) {
        request.flush([]);
        return;
      }

      if (url.includes('/crypto-rates/chart')) {
        request.flush({
          symbol: 'BTC',
          range: '24h',
          currency: 'usd',
          low: '100',
          high: '110',
          points: [{ t: 1, v: 0.5 }],
        });
        return;
      }

      if (url.includes('/chart')) {
        request.flush({
          pair: 'DART-R4V3',
          range: '24h',
          currentPrice: '100',
          changePercent: 1.2,
          positive: true,
          high: '110',
          low: '90',
          volume: '1000',
          points: [{ t: 1, v: 0.5 }],
        });
        return;
      }

      if (url.includes('/banner')) {
        request.flush({
          message1: 'Bienvenue',
          lastTransaction: 'tx-1',
          lastTransactionShort: 'tx-1',
          userCount: 1,
        });
        return;
      }

      request.flush(request.request.method === 'GET' ? [] : {});
    });

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-shell')).toBeTruthy();
    expect(compiled.querySelector('.app-hub')).toBeTruthy();
    expect(compiled.querySelector('.app-hub-showcase-block')).toBeTruthy();
    expect(compiled.querySelector('app-showcase-tabs')).toBeTruthy();
    expect(compiled.querySelector('app-showcase-panel')).toBeTruthy();
  });
});
