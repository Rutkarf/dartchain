import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';

import { ChartSummaryStateService } from '../core/services/chart-summary-state.service';
import { NavbarHintDirective } from './navbar-hint.directive';

@Component({
  selector: 'app-navbar-node-panel',
  standalone: true,
  imports: [CommonModule, NavbarHintDirective],
  templateUrl: './navbar-node-panel.html',
  styleUrls: ['./navbar-node-panel.css', './navbar-hint.css'],
})
export class NavbarNodePanelComponent {
  readonly chartSummary = inject(ChartSummaryStateService);

  @Input({ required: true }) networkOnline = true;
  @Input({ required: true }) syncPercentLabel = '…';
}
