import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { LaunchProject, LaunchStatus } from '../../core/models/showcase.model';
import { AuthService } from '../../core/services/auth.service';
import { BrandCryptoSelectionService } from '../../core/services/brand-crypto-selection.service';
import { ShowcaseLaunchStateService } from '../../core/services/showcase-launch-state.service';

type LaunchStatusFilter = 'all' | LaunchStatus;

const LAUNCH_STATUS_FILTERS: LaunchStatusFilter[] = ['all', 'LIVE', 'SOON', 'ENDED'];

@Component({
  selector: 'app-showcase-launch',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-launch.html',
  styleUrls: ['./showcase-launch.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseLaunchComponent {
  @Input() isExpanded = true;

  @HostBinding('class.is-launch')
  readonly isLaunchHost = true;

  @HostBinding('class.is-expanded')
  get isExpandedClass(): boolean {
    return this.isExpanded;
  }

  @HostBinding('class.is-collapsed')
  get isCollapsedClass(): boolean {
    return !this.isExpanded;
  }

  private readonly brandCrypto = inject(BrandCryptoSelectionService);
  protected readonly auth = inject(AuthService);
  protected readonly launchState = inject(ShowcaseLaunchStateService);

  readonly loading = this.launchState.loading;
  readonly error = this.launchState.error;
  readonly successMessage = this.launchState.successMessage;
  readonly projects = this.launchState.projects;
  readonly searchQuery = signal('');
  readonly searchExpanded = signal(false);
  readonly activeStatus = signal<LaunchStatusFilter>('all');
  readonly statusFilters = LAUNCH_STATUS_FILTERS;

  readonly visibleLaunchSlots = 5;

  readonly filteredProjects = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.activeStatus();
    let list = this.projects();

    if (status !== 'all') {
      list = list.filter((project) => project.status === status);
    }

    if (!query) {
      return list;
    }

    return list.filter((project) => {
      const name = project.name.toLowerCase();
      const symbol = project.symbol.toLowerCase();
      return name.includes(query) || symbol.includes(query);
    });
  });

  readonly liveSummary = computed(() => {
    const { live } = this.launchState.counts();
    return `${live} live`;
  });

  readonly launchCtaLabel = computed(() =>
    this.auth.isAuthenticated() ? 'Lancer un projet' : 'CONNEXION REQUISE'
  );

  constructor() {
    if (this.launchState.projects().length === 0 && !this.launchState.loading()) {
      this.launchState.loadProjects();
    }
  }

  protected openDrawer(): void {
    this.launchState.openLaunchDrawer();
  }

  protected refresh(): void {
    this.launchState.requestRefresh();
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  protected openSearch(): void {
    this.searchExpanded.set(true);
  }

  protected closeSearch(event?: Event): void {
    event?.preventDefault();
    if (this.searchQuery().trim()) {
      return;
    }
    this.searchExpanded.set(false);
  }

  protected selectStatus(status: LaunchStatusFilter): void {
    this.activeStatus.set(status);
  }

  protected statusFilterLabel(status: LaunchStatusFilter): string {
    switch (status) {
      case 'all':
        return 'Tous';
      case 'LIVE':
        return 'Live';
      case 'SOON':
        return 'Soon';
      case 'ENDED':
        return 'Ended';
      default:
        return status;
    }
  }

  protected statusLabel(status: LaunchStatus): string {
    switch (status) {
      case 'LIVE':
        return 'Live';
      case 'ENDED':
        return 'Ended';
      default:
        return 'Soon';
    }
  }

  protected isSoon(status: LaunchStatus): boolean {
    return status === 'SOON';
  }

  protected isEnded(status: LaunchStatus): boolean {
    return status === 'ENDED';
  }

  protected projectInitials(project: LaunchProject): string {
    const symbol = project.symbol?.trim() || project.name?.trim() || '?';
    return symbol.slice(0, 2).toUpperCase();
  }

  protected phaseClass(): string {
    return `launch-summary-status--${this.launchState.phase()}`;
  }

  protected swapProject(project: LaunchProject, event: MouseEvent): void {
    event.stopPropagation();

    const symbol = project.symbol.trim().toUpperCase();
    if (!symbol || symbol === 'R4V3') {
      this.brandCrypto.requestExchangeTrade('R4V3', 'PXD');
    } else {
      this.brandCrypto.requestExchangeTrade('R4V3', symbol);
    }

    this.scrollToExchangePanel();
  }

  protected canSwapProject(project: LaunchProject): boolean {
    return project.status === 'LIVE' || project.status === 'SOON';
  }

  private scrollToExchangePanel(): void {
    globalThis.document.querySelector('.app-market-card--swap')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    globalThis.dispatchEvent(new CustomEvent('exchange-panel-focus'));
  }
}
