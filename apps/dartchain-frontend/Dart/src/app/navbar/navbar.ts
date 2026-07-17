import { Component, EventEmitter, Output, ViewChild, computed, inject } from '@angular/core';
import { Block } from '../core/models/block.model';
import { CommonModule } from '@angular/common';
import { NavbarNetworkStatusComponent } from './navbar-network-status';
import { NavbarPeerStatusComponent } from './navbar-peer-status';
import { BrandCryptoSelectComponent } from './brand-crypto-select';
import { ExplorerSearchComponent } from './explorer-search';
import { SearchbarComponent } from '../searchbar/searchbar';
import { R4v3ThreeComponent } from '../features/r4v3-three/r4v3-three';
import { AuthService } from '../core/services/auth.service';
import { ShellFeedbackService } from '../core/services/shell-feedback.service';
import { LocaleService } from '../core/i18n/locale.service';
import { NavbarNodePanelComponent } from './navbar-node-panel';
import { NavbarHintDirective } from './navbar-hint.directive';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    NavbarNetworkStatusComponent,
    NavbarPeerStatusComponent,
    BrandCryptoSelectComponent,
    ExplorerSearchComponent,
    SearchbarComponent,
    R4v3ThreeComponent,
    NavbarNodePanelComponent,
    NavbarHintDirective,
  ],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css', './navbar-chrome.css', './navbar-viewport-compact.css', './navbar-hint.css'],
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);
  private readonly shell = inject(ShellFeedbackService);

  /** Une seule variante auth visible : logout OU (connexion + inscription), jamais les deux. */
  readonly authStripMode = computed(() => {
    if (this.auth.drawerOpen()) {
      return 'hidden' as const;
    }

    return this.auth.isAuthenticated() ? ('logout' as const) : ('guest' as const);
  });

  @ViewChild('logoThree')
  logoThree?: R4v3ThreeComponent;

  @ViewChild('networkStatus')
  networkStatus!: NavbarNetworkStatusComponent;

  @Output() exploreBlock = new EventEmitter<Block>();
  @Output() explorePending = new EventEmitter<void>();

  logoClicked = false;

  private clickPulseTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastLogoClickAt = 0;

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
    const now = Date.now();
    if (now - this.lastLogoClickAt < 420) {
      this.shell.toggleR4v3Scene();
    }
    this.lastLogoClickAt = now;

    this.logoClicked = false;
    requestAnimationFrame(() => {
      this.logoClicked = true;
    });

    if (this.clickPulseTimeout) clearTimeout(this.clickPulseTimeout);
    this.clickPulseTimeout = setTimeout(() => {
      this.logoClicked = false;
    }, 520);
  }

  onToggleLocale(): void {
    this.locale.toggle();
  }

  /** Compatibilité — le panneau NODE gère désormais l’ouverture réseau en secondaire. */
  onNodePanelToggle(): void {
    this.shell.toggleStatusPanel();
  }

  networkOnline(): boolean {
    return this.networkStatus?.health().ok ?? true;
  }

  networkSyncLabel(): string {
    return this.networkStatus?.syncPercentLabel() ?? '…';
  }
}
