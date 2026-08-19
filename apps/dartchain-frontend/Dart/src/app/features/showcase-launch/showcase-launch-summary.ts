import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  OnDestroy,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { LaunchProject } from '../../core/models/showcase.model';
import { COLLAPSED_SUMMARY_BAR_CLASS } from '../../core/models/collapsed-summary.model';
import { ShowcaseLaunchStateService } from '../../core/services/showcase-launch-state.service';

@Component({
  selector: 'app-showcase-launch-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-launch-summary.html',
  styleUrls: ['./showcase-launch-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseLaunchSummaryComponent implements OnInit, OnDestroy {
  private static readonly CAROUSEL_MS = 5000;

  protected readonly launchState = inject(ShowcaseLaunchStateService);

  @Output() readonly refreshClick = new EventEmitter<void>();

  @HostBinding(`class.${COLLAPSED_SUMMARY_BAR_CLASS}`)
  readonly collapsedSummaryBar = true;

  @HostBinding('class.launch-summary-bar__content')
  readonly contentClass = true;

  @HostBinding('class.is-launch')
  readonly isLaunchClass = true;

  @HostBinding('class.is-collapsed')
  readonly isCollapsedClass = true;

  readonly loading = this.launchState.loading;
  readonly updatedAgeLabel = this.launchState.updatedAgeLabel;
  readonly collapsedStatusLabel = this.launchState.collapsedStatusLabel;
  readonly collapsedStatusHeadline = this.launchState.collapsedStatusHeadline;

  readonly carouselIndex = signal(0);
  readonly carouselAnimating = signal(false);

  private carouselTimer: number | null = null;
  private animationTimer: number | null = null;

  readonly carouselProjects = computed(() => this.launchState.collapsedTickerProjects());

  readonly carouselProject = computed(() => {
    const projects = this.carouselProjects();
    if (projects.length === 0) {
      return null;
    }
    const index = this.carouselIndex() % projects.length;
    return projects[index] ?? projects[0];
  });

  readonly carouselProjectMeta = computed(() => {
    const project = this.carouselProject();
    if (!project) {
      return '';
    }

    const parts = [this.marketCapLabel(project)];
    if (project.chain?.trim()) {
      parts.push(project.chain.trim());
    } else if (project.launchDate?.trim()) {
      parts.push(project.launchDate.trim());
    }
    return parts.filter(Boolean).join(' · ');
  });

  ngOnInit(): void {
    if (this.launchState.projects().length === 0 && !this.launchState.loading()) {
      this.launchState.loadProjects();
    }
    this.startCarousel();
  }

  ngOnDestroy(): void {
    this.stopCarousel();
    if (this.animationTimer !== null) {
      window.clearTimeout(this.animationTimer);
    }
  }

  phaseClass(): string {
    return `launch-summary-status--${this.launchState.collapsedPhaseClass()}`;
  }

  marketCapLabel(project: LaunchProject): string {
    return this.launchState.marketCapLabel(project);
  }

  projectDisplayName(project: LaunchProject): string {
    return project.name?.trim() || project.symbol?.trim() || 'Projet';
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.launchState.requestRefresh();
    this.refreshClick.emit();
  }

  private startCarousel(): void {
    this.stopCarousel();
    this.carouselTimer = window.setInterval(() => {
      const projects = this.carouselProjects();
      if (projects.length <= 1 || this.launchState.collapsedStatusKey() !== 'LIVE') {
        return;
      }

      this.carouselAnimating.set(true);
      if (this.animationTimer !== null) {
        window.clearTimeout(this.animationTimer);
      }
      this.animationTimer = window.setTimeout(() => this.carouselAnimating.set(false), 320);

      this.carouselIndex.update((index) => (index + 1) % projects.length);
    }, ShowcaseLaunchSummaryComponent.CAROUSEL_MS);
  }

  private stopCarousel(): void {
    if (this.carouselTimer !== null) {
      window.clearInterval(this.carouselTimer);
      this.carouselTimer = null;
    }
  }
}
