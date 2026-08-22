import { Injectable, inject, signal, Injector } from '@angular/core';

import { NavbarTickerDrawerService } from '@navbar/services/navbar-ticker-drawer.service';

export type NavbarDrawerId = 'status' | 'node' | 'ticker';

@Injectable({ providedIn: 'root' })
export class ShellFeedbackService {
  private readonly injector = inject(Injector);

  readonly bannerError = signal<string | null>(null);
  readonly statusPanelOpen = signal(false);
  readonly nodePanelOpen = signal(false);
  readonly r4v3SceneVisible = signal(false);

  setBannerError(message: string | null): void {
    this.bannerError.set(message);
  }

  closeNavbarDrawers(except?: NavbarDrawerId): void {
    if (except !== 'status') {
      this.statusPanelOpen.set(false);
    }
    if (except !== 'node') {
      this.nodePanelOpen.set(false);
    }
    if (except !== 'ticker') {
      this.injector.get(NavbarTickerDrawerService).close();
    }
  }

  toggleStatusPanel(): void {
    const next = !this.statusPanelOpen();
    if (next) {
      this.closeNavbarDrawers('status');
    }
    this.statusPanelOpen.set(next);
  }

  toggleNodePanel(): void {
    const next = !this.nodePanelOpen();
    if (next) {
      this.closeNavbarDrawers('node');
    }
    this.nodePanelOpen.set(next);
  }

  toggleR4v3Scene(): void {
    this.r4v3SceneVisible.update((visible) => !visible);
  }
}
