import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { COLLAPSED_SUMMARY_BAR_CLASS } from '../../core/models/collapsed-summary.model';
import { LaunchWorkflowPhase } from '../../core/services/showcase-launch-state.service';
import { ShowcaseLaunchStateService } from '../../core/services/showcase-launch-state.service';

@Component({
  selector: 'app-showcase-launch-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-launch-summary.html',
  styleUrls: ['./showcase-launch-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseLaunchSummaryComponent implements OnInit {
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

  readonly phase = this.launchState.phase;
  readonly statusLabel = this.launchState.statusLabel;
  readonly progressLabel = this.launchState.progressLabel;
  readonly headline = this.launchState.headline;
  readonly progressPercent = this.launchState.progressPercent;
  readonly updatedAgeLabel = this.launchState.updatedAgeLabel;
  readonly loading = this.launchState.loading;
  readonly counts = this.launchState.counts;

  ngOnInit(): void {
    if (this.launchState.projects().length === 0 && !this.launchState.loading()) {
      this.launchState.loadProjects();
    }
  }

  phaseClass(phase: LaunchWorkflowPhase): string {
    return `launch-summary-status--${phase}`;
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.launchState.requestRefresh();
    this.refreshClick.emit();
  }

  onLaunch(event: Event): void {
    event.stopPropagation();
    this.launchState.openLaunchDrawer();
  }
}
