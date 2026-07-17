import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';

import { COLLAPSED_SUMMARY_BAR_CLASS } from '../../core/models/collapsed-summary.model';
import { ChartSummaryStateService } from '../../core/services/chart-summary-state.service';

@Component({
  selector: 'app-showcase-chart-summary',
  standalone: true,
  templateUrl: './showcase-chart-summary.html',
  styleUrls: ['./showcase-chart-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseChartSummaryComponent implements OnInit, OnDestroy {
  protected readonly state = inject(ChartSummaryStateService);

  @HostBinding('class')
  readonly hostClasses = `${COLLAPSED_SUMMARY_BAR_CLASS} chart-summary-bar__host is-chart`;

  @HostBinding('class.is-collapsed')
  readonly collapsedClass = true;

  readonly symbolLabel = this.state.symbolLabel;
  readonly price = this.state.price;
  readonly delta = this.state.delta;
  readonly positive = this.state.positive;
  readonly rangeBadge = this.state.rangeBadge;
  readonly volume = this.state.volume;
  readonly highLowLabel = this.state.highLowLabel;
  readonly sparklineSegments = this.state.sparklineSegments;
  readonly sparklineHead = this.state.sparklineHead;
  readonly loading = this.state.loading;
  readonly error = this.state.error;

  ngOnInit(): void {
    window.addEventListener('naivechain-refresh', this.onGlobalRefresh);
  }

  ngOnDestroy(): void {
    window.removeEventListener('naivechain-refresh', this.onGlobalRefresh);
  }

  private onGlobalRefresh = (): void => {
    this.state.refresh();
  };

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.state.refresh();
  }
}
