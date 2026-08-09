import { booleanAttribute, Component, input, output } from '@angular/core';

import { PanelCollapseControlComponent } from '../panel-collapse-control/panel-collapse-control';

@Component({
  selector: 'app-collapsed-bar-actions',
  standalone: true,
  imports: [PanelCollapseControlComponent],
  templateUrl: './collapsed-bar-actions.html',
  styleUrl: './collapsed-bar-actions.css',
})
export class CollapsedBarActionsComponent {
  readonly collapsed = input(true, { transform: booleanAttribute });
  readonly collapseAriaLabel = input.required<string>();
  readonly refreshAriaLabel = input('Actualiser');
  readonly refreshBusy = input(false, { transform: booleanAttribute });

  readonly refresh = output<MouseEvent>();
  readonly collapseToggle = output<void>();

  onRefresh(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.refresh.emit(event);
  }
}
