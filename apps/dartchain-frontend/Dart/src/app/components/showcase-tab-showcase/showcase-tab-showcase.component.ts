import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ShowcaseTab } from '../../core/models/showcase-tab.model';
import { ProductConfigService } from '../../core/config/product-config.service';
import { ShowcaseTabsComponent } from '../../features/showcase-tabs/showcase-tabs';
import { ShowcasePanelComponent } from '../../features/showcase-panel/showcase-panel';
import { CollapsedBarActionsComponent } from '../../features/collapsed-bar-actions/collapsed-bar-actions';

@Component({
  selector: 'app-showcase-tab-showcase',
  standalone: true,
  imports: [
    CommonModule,
    ShowcaseTabsComponent,
    ShowcasePanelComponent,
    CollapsedBarActionsComponent,
  ],
  templateUrl: './showcase-tab-showcase.component.html',
  styleUrl: './showcase-tab-showcase.component.scss',
  host: {
    class: 'app-showcase-tab-showcase-section',
    '[class.is-showcase-collapsed]': 'showcaseCollapsed',
    '[class.is-showcase-disabled]': '!product.showcaseEnabled',
  },
})
export class ShowcaseTabShowcaseComponent {
  readonly product = inject(ProductConfigService);

  @Input() activeTab: ShowcaseTab = 'tours';
  @Input() showcaseCollapsed = true;
  @Input() collapseAriaLabel = 'Replier le showcase';
  @Input() refreshBusy = false;

  @Output() readonly tabChange = new EventEmitter<ShowcaseTab>();
  @Output() readonly collapseToggle = new EventEmitter<void>();
  @Output() readonly refresh = new EventEmitter<Event>();
  @Output() readonly summaryExpand = new EventEmitter<void>();
  @Output() readonly selectBlock = new EventEmitter<number>();

  onBandClick(event?: Event): void {
    if (!this.showcaseCollapsed) {
      return;
    }
    event?.stopPropagation();
    this.summaryExpand.emit();
  }
}
