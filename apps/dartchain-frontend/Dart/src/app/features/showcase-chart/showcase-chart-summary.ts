import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { COLLAPSED_SUMMARY_BAR_CLASS } from '../../core/models/collapsed-summary.model';
import {
  ChartSummaryPhase,
  ChartSummaryStateService,
} from '../../core/services/chart-summary-state.service';

@Component({
  selector: 'app-showcase-chart-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-chart-summary.html',
  styleUrls: ['./showcase-chart-summary.css', '../dock-summary/dock-summary-shared.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseChartSummaryComponent implements OnInit, OnDestroy {
  protected readonly state = inject(ChartSummaryStateService);

  @HostBinding('class')
  readonly hostClasses = `${COLLAPSED_SUMMARY_BAR_CLASS} chart-summary-bar__content is-chart`;

  @HostBinding('class.is-collapsed')
  readonly collapsedClass = true;

  readonly phase = this.state.phase;
  readonly statusLabel = this.state.statusLabel;
  readonly title = this.state.title;
  readonly headline = this.state.headline;
  readonly progressLabel = this.state.progressLabel;
  readonly detailLabel = this.state.detailLabel;
  readonly updatedAgeLabel = this.state.updatedAgeLabel;
  readonly loading = this.state.loading;

  ngOnInit(): void {
    window.addEventListener('naivechain-refresh', this.onGlobalRefresh);
  }

  ngOnDestroy(): void {
    window.removeEventListener('naivechain-refresh', this.onGlobalRefresh);
  }

  private onGlobalRefresh = (): void => {
    this.state.refresh();
  };

  statusClass(phase: ChartSummaryPhase): string {
    const map: Record<ChartSummaryPhase, string> = {
      error: 'error',
      loading: 'busy',
      ready: 'ready',
    };
    return `dock-summary-status--${map[phase]}`;
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.state.refresh();
  }
}
