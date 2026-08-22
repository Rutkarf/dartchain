import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { LaunchProject, LaunchStatus } from '@showcase/models/showcase.model';
import { isLaunchpadSwapToken } from '@core/constants/exchange-launchpad.constants';
import { FocusTrapDirective } from '@core/directives/focus-trap.directive';

@Component({
  selector: 'app-showcase-launch-project-drawer',
  standalone: true,
  imports: [CommonModule, FocusTrapDirective],
  templateUrl: './showcase-launch-project-drawer.html',
  styleUrls: ['./showcase-launch-project-drawer.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseLaunchProjectDrawerComponent {
  private readonly drawerPanel = viewChild<ElementRef<HTMLElement>>('drawerPanel');

  readonly project = input<LaunchProject | null>(null);

  readonly closeDrawer = output<void>();
  readonly swap = output<LaunchProject>();

  constructor() {
    effect(() => {
      if (this.project()) {
        queueMicrotask(() => this.drawerPanel()?.nativeElement.focus());
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.project()) {
      this.dismiss();
    }
  }

  dismiss(): void {
    this.closeDrawer.emit();
  }

  statusLabel(status: LaunchStatus): string {
    switch (status) {
      case 'LIVE':
        return 'Live';
      case 'ENDED':
        return 'Ended';
      default:
        return 'Soon';
    }
  }

  initials(project: LaunchProject): string {
    const symbol = project.symbol?.trim() || project.name?.trim() || '?';
    return symbol.slice(0, 2).toUpperCase();
  }

  marketCapLabel(project: LaunchProject): string {
    if (project.target && project.target !== '—') {
      return `${project.raised} / ${project.target}`;
    }
    return project.raised;
  }

  progressPercent(project: LaunchProject): number | null {
    const raised = this.parseAmount(project.raised);
    const target = this.parseAmount(project.target);
    if (raised === null || target === null || target <= 0) {
      return null;
    }
    return Math.min(100, Math.round((raised / target) * 100));
  }

  canSwap(project: LaunchProject): boolean {
    if (project.status !== 'LIVE' && project.status !== 'SOON') {
      return false;
    }
    return isLaunchpadSwapToken(project.symbol);
  }

  openWhitepaper(project: LaunchProject): void {
    const url = project.whitepaperUrl?.trim();
    if (!url) {
      return;
    }
    globalThis.open(url, '_blank', 'noopener,noreferrer');
  }

  openWebsite(project: LaunchProject): void {
    const url = project.website?.trim();
    if (!url) {
      return;
    }
    globalThis.open(url, '_blank', 'noopener,noreferrer');
  }

  private parseAmount(value: string | null | undefined): number | null {
    if (!value || value === '—') {
      return null;
    }
    const normalized = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
