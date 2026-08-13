import { Component } from '@angular/core';

import { ExchangePanelComponent } from '../../features/exchange-panel/exchange-panel';

@Component({
  selector: 'app-swap',
  standalone: true,
  imports: [ExchangePanelComponent],
  templateUrl: './swap.component.html',
  styleUrl: './swap.component.scss',
  host: {
    class: 'app-swap-section',
  },
})
export class SwapComponent {}
