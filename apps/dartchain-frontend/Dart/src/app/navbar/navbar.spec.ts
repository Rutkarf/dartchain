import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CommonModule } from '@angular/common';

import { NavbarShellComponent } from './navbar';
import { NavbarNetworkStatusComponent } from './navbar-network-status';
import { NavbarPeerStatusComponent } from './navbar-peer-status';
import { BrandCryptoSelectComponent } from './brand-crypto-select';
import { ExplorerSearchComponent } from './explorer-search';
import { SearchbarComponent } from '../searchbar/searchbar';

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

@Component({ selector: 'app-navbar-node-panel', standalone: true, template: '' })
class MockNavbarNodePanelComponent {}

@Component({ selector: 'app-navbar-ticker-drawer', standalone: true, template: '' })
class MockNavbarTickerDrawerComponent {}

@Component({ selector: '[appNavbarHint]', standalone: true, template: '' })
class MockNavbarHintDirective {}

describe('Navbar', () => {
  let component: NavbarShellComponent;
  let fixture: ComponentFixture<NavbarShellComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarShellComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .overrideComponent(NavbarShellComponent, {
        set: {
          imports: [
            CommonModule,
            NavbarNetworkStatusComponent,
            NavbarPeerStatusComponent,
            BrandCryptoSelectComponent,
            ExplorerSearchComponent,
            SearchbarComponent,
            MockR4v3ThreeComponent,
            MockNavbarNodePanelComponent,
            MockNavbarTickerDrawerComponent,
            MockNavbarHintDirective,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(NavbarShellComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock?.match(() => true).forEach((request) => {
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
