import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
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
import { NavbarTickerDrawerComponent } from '../features/navbar-ticker-drawer/navbar-ticker-drawer';

@Component({
  selector: 'app-navbar-shell',
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
    NavbarTickerDrawerComponent,
    NavbarHintDirective,
  ],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css', './navbar-chrome.css', './navbar-viewport-compact.css', './navbar-hint.css'],
})
export class NavbarShellComponent implements AfterViewInit {
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);
  private readonly shell = inject(ShellFeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('brandHead', { read: ElementRef })
  brandHeadRef?: ElementRef<HTMLElement>;

  @ViewChild('brandTrack', { read: ElementRef })
  brandTrackRef?: ElementRef<HTMLElement>;

  @ViewChild('brandRow', { read: ElementRef })
  brandRowRef?: ElementRef<HTMLElement>;

  /** Invité : inscription + connexion. Connecté : pseudo + déconnexion uniquement. */
  readonly authStripMode = computed(() =>
    this.auth.isAuthenticated() ? ('logout' as const) : ('guest' as const)
  );

  readonly authLoginActive = computed(
    () => this.auth.drawerOpen() && this.auth.drawerMode() === 'login'
  );

  readonly authRegisterActive = computed(
    () => this.auth.drawerOpen() && this.auth.drawerMode() === 'register'
  );

  readonly authDisplayName = computed(() => {
    const user = this.auth.user();
    if (!user) {
      return '';
    }

    const username = user.username?.trim();
    if (username) {
      return username.startsWith('@') ? username : `@${username}`;
    }

    const email = user.email?.trim();
    if (email) {
      const localPart = email.split('@')[0]?.trim();
      return localPart ? `@${localPart}` : email;
    }

    return 'Compte';
  });

  @ViewChild('logoThree')
  logoThree?: R4v3ThreeComponent;

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

  ngAfterViewInit(): void {
    const track = this.brandTrackRef?.nativeElement;
    const row = this.brandRowRef?.nativeElement;
    if (!track || !row) {
      return;
    }

    const syncBrandTrackWidth = (): void => {
      track.style.removeProperty('width');
      track.style.removeProperty('max-width');

      requestAnimationFrame(() => {
        const width = Math.ceil(row.getBoundingClientRect().width);
        if (width > 0) {
          track.style.width = `${width}px`;
          track.style.maxWidth = `${width}px`;
        }
      });
    };

    syncBrandTrackWidth();

    const observer = new ResizeObserver(() => syncBrandTrackWidth());
    observer.observe(row);

    window.addEventListener('resize', syncBrandTrackWidth);

    this.destroyRef.onDestroy(() => {
      observer.disconnect();
      window.removeEventListener('resize', syncBrandTrackWidth);
    });
  }
}
