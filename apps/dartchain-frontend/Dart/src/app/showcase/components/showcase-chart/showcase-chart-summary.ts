import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  inject,
  input,
  output,
} from '@angular/core';

import { COLLAPSED_SUMMARY_BAR_CLASS } from '@core/models/collapsed-summary.model';
import { ChartSummaryStateService } from '@core/services/chart-summary-state.service';
import { CollapsedBarActionsComponent } from '../../../components/collapsed-bar-actions/collapsed-bar-actions';

@Component({
  selector: 'app-showcase-chart-summary',
  standalone: true,
  imports: [CollapsedBarActionsComponent],
  templateUrl: './showcase-chart-summary.html',
  styleUrls: ['./showcase-chart-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseChartSummaryComponent {
  protected readonly state = inject(ChartSummaryStateService);

  readonly collapseAriaLabel = input('Déplier le graphique');
  readonly collapseToggle = output<void>();

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

  onRefresh(event: Event): void {
    event.stopPropagation();
    // Refresh Graph uniquement (pas de broadcast global).
    this.state.refresh();
  }
}
