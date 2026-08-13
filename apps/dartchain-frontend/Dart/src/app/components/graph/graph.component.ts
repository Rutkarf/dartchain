import { Component, EventEmitter, Input, Output } from '@angular/core';

import { RatePanelComponent } from '../../features/rate-panel/rate-panel';

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [RatePanelComponent],
  templateUrl: './graph.component.html',
  styleUrl: './graph.component.scss',
  host: {
    class: 'app-graph-section',
    '[class.is-chart-collapsed]': 'chartCollapsed',
  },
})
export class GraphComponent {
  @Input() chartCollapsed = false;
  @Input() collapseAriaLabel = 'Replier le graphique';

  @Output() readonly collapseToggle = new EventEmitter<void>();
  @Output() readonly summaryExpand = new EventEmitter<void>();

  onCardClick(): void {
    if (this.chartCollapsed) {
      this.summaryExpand.emit();
    }
  }
}
