import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostBinding,
  HostListener,
  afterNextRender,
  computed,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { FocusTrapDirective } from '../../core/directives/focus-trap.directive';
import { NavbarTickerDrawerService } from '@navbar/services/navbar-ticker-drawer.service';
import { NavbarTickerStateService } from '@navbar/services/navbar-ticker-state.service';
import {
  scheduleNavbarDrawerPin,
  unpinNavbarDrawer,
} from '../navbar-drawer-viewport.util';

@Component({
  selector: 'app-navbar-ticker-drawer',
  standalone: true,
  imports: [CommonModule, FocusTrapDirective],
  templateUrl: './navbar-ticker-drawer.html',
  styleUrls: ['./navbar-ticker-drawer.css', '../navbar-anchor-drawer.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarTickerDrawerComponent {
  readonly drawer = inject(NavbarTickerDrawerService);
  readonly ticker = inject(NavbarTickerStateService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly drawerMetrics = computed(() => {
    const metrics = this.drawer.activeSegment()?.detail?.metrics ?? [];
    if (metrics.length === 0) {
      return [];
    }
    return metrics.slice(0, 3);
  });

  @HostBinding('class.is-drawer-open')
  get drawerOpen(): boolean {
    return this.drawer.open();
  }

  constructor() {
    effect(() => {
      if (this.drawer.open()) {
        afterNextRender(() => this.syncDrawerViewport());
      } else {
        this.clearDrawerViewport();
      }
    });

    this.destroyRef.onDestroy(() => this.clearDrawerViewport());
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.drawer.open()) {
      this.drawer.close();
    }
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChange(): void {
    if (this.drawer.open()) {
      this.syncDrawerViewport();
    }
  }

  onDrawerClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  refresh(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.ticker.refresh();
  }

  close(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.drawer.close();
  }

  private syncDrawerViewport(): void {
    scheduleNavbarDrawerPin(
      () => ({
        anchor: this.resolveActiveChipAnchor(),
        drawer: this.host.nativeElement.querySelector(
          '.nv-anchor-drawer--ticker'
        ) as HTMLElement | null,
      }),
      {
        align: 'anchor-left',
        pad: 12,
        maxWidth: 268,
        fitContent: true,
        contentKind: 'generic',
      }
    );
  }

  private resolveActiveChipAnchor(): HTMLElement | null {
    const segmentId = this.drawer.activeSegmentId();
    if (!segmentId) {
      return null;
    }

    const activeChips = document.querySelectorAll(
      `.bandeau-accueil__chip--${segmentId}.bandeau-accueil__chip--active`
    );
    for (const chip of activeChips) {
      if (!(chip instanceof HTMLElement)) {
        continue;
      }
      if (chip.closest('[aria-hidden="true"]')) {
        continue;
      }
      return chip;
    }

    const chips = document.querySelectorAll(`.bandeau-accueil__chip--${segmentId}`);
    for (const chip of chips) {
      if (!(chip instanceof HTMLElement)) {
        continue;
      }
      if (chip.closest('[aria-hidden="true"]')) {
        continue;
      }
      return chip;
    }

    return null;
  }

  private clearDrawerViewport(): void {
    const drawer = this.host.nativeElement.querySelector(
      '.nv-anchor-drawer--ticker'
    ) as HTMLElement | null;
    if (drawer) {
      unpinNavbarDrawer(drawer);
    }
  }
}
