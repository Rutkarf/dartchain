import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostBinding,
  HostListener,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { FocusTrapDirective } from '../../core/directives/focus-trap.directive';
import { NavbarTickerDrawerService } from '../../core/services/navbar-ticker-drawer.service';
import { NavbarTickerStateService } from '../../core/services/navbar-ticker-state.service';

@Component({
  selector: 'app-navbar-ticker-drawer',
  standalone: true,
  imports: [CommonModule, FocusTrapDirective],
  templateUrl: './navbar-ticker-drawer.html',
  styleUrls: ['./navbar-ticker-drawer.css', '../../navbar/navbar-anchor-drawer.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarTickerDrawerComponent {
  readonly drawer = inject(NavbarTickerDrawerService);
  readonly ticker = inject(NavbarTickerStateService);

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

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.drawer.open()) {
      this.drawer.close();
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
}
