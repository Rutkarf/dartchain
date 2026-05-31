import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostBinding,
  Input,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

import {
  CreateLaunchProjectRequest,
  LaunchProject,
  LaunchStatus,
} from '../../core/models/showcase.model';
import { LaunchDrawerService } from '../../core/services/launch-drawer.service';
import { ShowcaseApiService } from '../../core/services/showcase-api.service';
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

  private readonly api = inject(ShowcaseApiService);
  private readonly launchDrawer = inject(LaunchDrawerService);
  protected readonly launchState = inject(ShowcaseLaunchStateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = this.launchState.loading;
  readonly error = this.launchState.error;
  readonly successMessage = this.launchState.successMessage;
  readonly projects = this.launchState.projects;
  readonly searchQuery = signal('');
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

  constructor() {
    this.launchState.loadProjects();

    this.launchDrawer.onCreate$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((request) => this.onCreate(request));
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

  private onCreate(request: CreateLaunchProjectRequest): void {
    this.launchDrawer.setSubmitting(true);
    this.launchDrawer.setError(null);

    this.api
      .createLaunchProject(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (project) => {
          this.successMessage.set(`Projet ${project.symbol} créé (Soon).`);
          this.launchDrawer.setSubmitting(false);
          this.launchDrawer.close();
          this.launchState.loadProjects();
        },
        error: (error: unknown) => {
          this.launchDrawer.setError(this.resolveError(error));
          this.launchDrawer.setSubmitting(false);
        },
      });
  }

  private resolveError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) {
        return error.error?.message ?? 'Ce symbole est déjà utilisé.';
      }
      return error.error?.message ?? 'Création impossible.';
    }

    return 'Création impossible.';
  }
}
