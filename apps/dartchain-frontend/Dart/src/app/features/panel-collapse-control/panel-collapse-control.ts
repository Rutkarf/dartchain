import { booleanAttribute, Component, input, output } from '@angular/core';

import { IconRelief3dComponent } from '../../components/icon-relief-3d/icon-relief-3d';

@Component({
  selector: 'app-panel-collapse-control',
  standalone: true,
  imports: [IconRelief3dComponent],
  host: {
    class: 'panel-collapse-control-host',
    '[class.is-collapsed]': 'collapsed()',
  },
  templateUrl: './panel-collapse-control.html',
  styleUrl: './panel-collapse-control.css',
})
export class PanelCollapseControlComponent {
  /** true = panneau replié */
  readonly collapsed = input(false, { transform: booleanAttribute });
  /** aria-label contextuel (pas de libellé visible) */
  readonly ariaLabel = input.required<string>();

  readonly toggle = output<void>();

  onActivate(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.toggle.emit();
  }
}
