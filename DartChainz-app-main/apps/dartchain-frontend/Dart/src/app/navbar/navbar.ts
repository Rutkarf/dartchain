import { Component, EventEmitter, Output, ViewChild, inject } from '@angular/core';
import { Block } from '../core/models/block.model';
import { CommonModule } from '@angular/common';
import { NavbarNetworkStatusComponent } from './navbar-network-status';
import { NavbarPeerStatusComponent } from './navbar-peer-status';
import { BrandCryptoSelectComponent } from './brand-crypto-select';
import { ExplorerSearchComponent } from './explorer-search';
import { R4v3ThreeComponent } from '../features/r4v3-three/r4v3-three';
import { AuthDrawerComponent } from '../features/auth-drawer/auth-drawer';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    NavbarNetworkStatusComponent,
    NavbarPeerStatusComponent,
    BrandCryptoSelectComponent,
    ExplorerSearchComponent,
    R4v3ThreeComponent,
    AuthDrawerComponent,
  ],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css', './navbar-chrome.css', './navbar-viewport-compact.css'],
})
export class NavbarComponent {
  readonly auth = inject(AuthService);

  @ViewChild('logoThree')
  logoThree?: R4v3ThreeComponent;

  @Output() exploreBlock = new EventEmitter<Block>();
  @Output() explorePending = new EventEmitter<void>();

  logoClicked = false;

  private clickPulseTimeout: ReturnType<typeof setTimeout> | null = null;

  onRegister(): void {
    this.auth.openDrawer('register');
  }

  onLogin(): void {
    this.auth.openDrawer('login');
  }

  onLogout(): void {
    void this.auth.logout();
  }

  onLogoPulse(): void {
    this.logoClicked = false;
    requestAnimationFrame(() => {
      this.logoClicked = true;
    });

    if (this.clickPulseTimeout) clearTimeout(this.clickPulseTimeout);
    this.clickPulseTimeout = setTimeout(() => {
      this.logoClicked = false;
    }, 520);
  }
}
