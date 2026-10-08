import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostBinding,
  HostListener,
  ViewChild,
  afterNextRender,
  computed,
  effect,
  inject,
} from '@angular/core';

import { AuthService } from '@auth/services/auth.service';
import { FocusTrapDirective } from '../core/directives/focus-trap.directive';
import { NetworkTrustService } from '@navbar/services/network-trust.service';
import { ShellFeedbackService } from '@core/services/shell-feedback.service';
import { StatusOverlayComponent } from './status-overlay/status-overlay';
import {
  scheduleNavbarDrawerPin,
  unpinNavbarDrawer,
} from './navbar-drawer-viewport.util';

/** Couleur LED pastille Direct : session + santé API. */
export type NetworkLedTone = 'orange' | 'green' | 'red' | 'checking';

@Component({
  selector: 'app-navbar-network-status',
  standalone: true,
  imports: [CommonModule, FocusTrapDirective, StatusOverlayComponent],
  templateUrl: './navbar-network-status.html',
  styleUrls: ['./navbar-network-status.css', './navbar-brand-chip.css', './navbar-anchor-drawer.css'],
})
export class NavbarNetworkStatusComponent {
  readonly trust = inject(NetworkTrustService);
  readonly auth = inject(AuthService);
  private readonly shell = inject(ShellFeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly panelOpen = this.shell.statusPanelOpen;

  /**
   * Rouge = backend / admin / API KO.
   * Vert = session connectée + API OK.
   * Orange = invité (non connecté) + API OK.
   */
  readonly ledTone = computed((): NetworkLedTone => {
    const state = this.trust.trustState();
    if (state === 'checking') {
      return 'checking';
    }
    if (state === 'offline' || !this.trust.apiOk()) {
      return 'red';
    }
    return this.auth.isAuthenticated() ? 'green' : 'orange';
  });

  readonly chipAria = computed(() => {
    const tone = this.ledTone();
    const session =
      tone === 'green' ? 'connecté' : tone === 'orange' ? 'anonyme' : tone === 'red' ? 'indisponible' : 'vérification';
    return `${this.trust.chipAriaLabel()} Voyant ${session}.`;
  });

  @HostBinding('class.is-drawer-open')
  get drawerOpen(): boolean {
    return this.panelOpen();
  }

  @ViewChild('anchorRoot') anchorRoot?: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      if (this.panelOpen()) {
        afterNextRender(() => this.syncDrawerViewport());
      } else {
        this.clearDrawerViewport();
      }
    });

    this.destroyRef.onDestroy(() => this.clearDrawerViewport());
  }

  openDetails(event: MouseEvent): void {
    event.stopPropagation();
    const wasOpen = this.panelOpen();
    this.shell.toggleStatusPanel();
    if (!wasOpen) {
      void this.trust.refresh();
      this.syncDrawerViewport();
    }
  }

  onDrawerClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChange(): void {
    if (this.panelOpen()) {
      this.syncDrawerViewport();
    }
  }

  private syncDrawerViewport(): void {
    scheduleNavbarDrawerPin(
      () => ({
        anchor:
          this.anchorRoot?.nativeElement?.querySelector('.nv-drawer-led-anchor') ??
          null,
        drawer:
          this.anchorRoot?.nativeElement?.querySelector('.nv-anchor-drawer--live') ??
          null,
      }),
      { align: 'anchor-left', fitContent: true, contentKind: 'network' }
    );
  }

  private clearDrawerViewport(): void {
    const drawer = this.anchorRoot?.nativeElement?.querySelector(
      '.nv-anchor-drawer--live'
    ) as HTMLElement | null;
    if (drawer) {
      unpinNavbarDrawer(drawer);
    }
  }
}
