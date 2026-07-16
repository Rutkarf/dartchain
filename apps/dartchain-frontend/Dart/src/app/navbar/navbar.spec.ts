import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { NavbarComponent } from './navbar';
import { NavbarNetworkStatusComponent } from './navbar-network-status';
import { NavbarPeerStatusComponent } from './navbar-peer-status';
import { BrandCryptoSelectComponent } from './brand-crypto-select';
import { ExplorerSearchComponent } from './explorer-search';
import { SearchbarComponent } from '../searchbar/searchbar';
import { AuthDrawerComponent } from '../features/auth-drawer/auth-drawer';

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

describe('Navbar', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
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

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.match(() => true).forEach((request) => {
      try {
        request.flush(request.request.method === 'GET' ? { ok: true } : {});
      } catch {
        // already handled
      }
    });
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
