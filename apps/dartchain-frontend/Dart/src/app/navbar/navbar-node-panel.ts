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

import { FocusTrapDirective } from '../core/directives/focus-trap.directive';
import { ChartSummaryStateService } from '../core/services/chart-summary-state.service';
import { ShellFeedbackService } from '../core/services/shell-feedback.service';
import {
  R4V3_PEG_DISPLAY_DELTA,
  R4V3_PEG_DISPLAY_PRICE,
} from '../core/constants/r4v3-token.constants';
import { stripUsdFromMarketLabel } from '../core/utils/market-display.util';
import {
  scheduleNavbarDrawerPin,
  unpinNavbarDrawer,
} from './navbar-drawer-viewport.util';

@Component({
  selector: 'app-navbar-node-panel',
  standalone: true,
  imports: [CommonModule, FocusTrapDirective],
  templateUrl: './navbar-node-panel.html',
  styleUrls: ['./navbar-node-panel.css', './navbar-brand-chip.css', './navbar-anchor-drawer.css'],
})
export class NavbarNodePanelComponent {
  readonly chartSummary = inject(ChartSummaryStateService);
  private readonly shell = inject(ShellFeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly popoverOpen = this.shell.nodePanelOpen;

  readonly isR4v3Token = computed(
    () => this.chartSummary.symbolLabel().trim().toUpperCase() === 'R4V3'
  );

  readonly pulseDeltaLabel = computed(() => {
    if (this.isR4v3Token()) {
      return R4V3_PEG_DISPLAY_DELTA;
    }

    const delta = this.chartSummary.delta();
    if (!delta || delta === '—') {
      return delta || '—';
    }
    return delta.replace(/(\.\d)0%$/, '$1%');
  });

  readonly pulseRangeLabel = computed(() =>
    this.chartSummary.rangeBadge().replace(/^(\d+)H$/, '$1H')
  );

  readonly displayPrice = computed(() => {
    if (this.chartSummary.phase() === 'loading') {
      return '...';
    }
    if (this.isR4v3Token()) {
      return R4V3_PEG_DISPLAY_PRICE;
    }
    const price = stripUsdFromMarketLabel(this.chartSummary.price());
    return price?.trim() ? price : 'N/A';
  });

  readonly displayDelta = computed(() => {
    if (this.chartSummary.phase() === 'loading') {
      return '...';
    }
    if (this.chartSummary.phase() === 'error') {
      return 'N/A';
    }
    if (this.isR4v3Token()) {
      return R4V3_PEG_DISPLAY_DELTA;
    }
    const delta = this.pulseDeltaLabel();
    return delta?.trim() ? delta : '—';
  });

  readonly displayVolume = computed(() => {
    if (this.chartSummary.phase() === 'loading') {
      return '...';
    }
    const volume = stripUsdFromMarketLabel(this.chartSummary.volume());
    return volume?.trim() ? volume : '—';
  });

  @HostBinding('class.is-drawer-open')
  get drawerOpen(): boolean {
    return this.popoverOpen();
  }

  @ViewChild('panelRoot') panelRoot?: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      if (this.popoverOpen()) {
        afterNextRender(() => this.syncDrawerViewport());
      } else {
        this.clearDrawerViewport();
      }
    });

    effect(() => {
      this.displayPrice();
      this.displayDelta();
      this.displayVolume();
      if (this.popoverOpen()) {
        queueMicrotask(() => this.syncDrawerViewport());
      }
    });

    this.destroyRef.onDestroy(() => this.clearDrawerViewport());
  }

  togglePopover(event: MouseEvent): void {
    event.stopPropagation();
    const wasOpen = this.popoverOpen();
    this.shell.toggleNodePanel();
    if (!wasOpen) {
      this.chartSummary.refresh();
      this.syncDrawerViewport();
    }
  }

  closePopover(event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.shell.nodePanelOpen.set(false);
  }

  onDrawerClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  refreshMarket(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.chartSummary.refresh();
    queueMicrotask(() => this.syncDrawerViewport());
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.popoverOpen()) {
      this.closePopover();
    }
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onWindowResize(): void {
    if (this.popoverOpen()) {
      this.syncDrawerViewport();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.popoverOpen()) {
      return;
    }

    const root = this.panelRoot?.nativeElement;
    if (root && !root.contains(event.target as Node)) {
      this.closePopover();
    }
  }

  private syncDrawerViewport(): void {
    scheduleNavbarDrawerPin(
      () => {
        const root = this.panelRoot?.nativeElement;
        return {
          anchor: root?.querySelector('.nv-drawer-led-anchor') ?? null,
          drawer: root?.querySelector('.nv-anchor-drawer--node') ?? null,
        };
      },
      { align: 'anchor-left', fitContent: true, contentKind: 'market' }
    );
  }

  private clearDrawerViewport(): void {
    const drawer = this.panelRoot?.nativeElement?.querySelector(
      '.nv-anchor-drawer--node'
    ) as HTMLElement | null;
    if (drawer) {
      unpinNavbarDrawer(drawer);
    }
  }
}
