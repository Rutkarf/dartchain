import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Block } from '../../core/models/block.model';
import { BottomDockTab } from '../../core/services/dock-navigation.service';
import { ProductConfigService } from '../../core/config/product-config.service';
import { AuthService } from '../../core/services/auth.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { CollapsedBarActionsComponent } from '../../features/collapsed-bar-actions/collapsed-bar-actions';
import { DockBottomSummaryComponent } from '../../features/dock-summary/dock-bottom-summary';
import { WalletPanelComponent } from '../../features/wallet-panel/wallet-panel';
import { FaucetComponent } from '../../features/faucet/faucet';
import { TransactionsDockComponent } from '../../features/transactions-dock/transactions-dock';
import { BlocksListComponent } from '../../features/blocks-list/blocks-list';
import { QuestsPanelComponent } from '../../features/quests-panel/quests-panel';
import { PeerPanelComponent } from '../../features/peer-panel/peer-panel';
import { AdminPanelComponent } from '../../features/admin-panel/admin-panel';

@Component({
  selector: 'app-dock-tabs-dock-tabs',
  standalone: true,
  imports: [
    CommonModule,
    CollapsedBarActionsComponent,
    DockBottomSummaryComponent,
    WalletPanelComponent,
    FaucetComponent,
    TransactionsDockComponent,
    BlocksListComponent,
    QuestsPanelComponent,
    PeerPanelComponent,
    AdminPanelComponent,
  ],
  templateUrl: './dock-tabs-dock-tabs.component.html',
  styleUrl: './dock-tabs-dock-tabs.component.scss',
  host: {
    class: 'app-dock-tabs-section',
    '[class.is-dock-collapsed]': 'dockCollapsed',
  },
})
export class DockTabsDockTabsComponent {
  readonly product = inject(ProductConfigService);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  @Input() activeTab: BottomDockTab = 'wallet';
  @Input() dockCollapsed = true;
  @Input() collapseAriaLabel = 'Replier le dock';
  @Input() refreshBusy = false;

  @Output() readonly tabChange = new EventEmitter<BottomDockTab>();
  @Output() readonly collapseToggle = new EventEmitter<void>();
  @Output() readonly refresh = new EventEmitter<Event>();
  @Output() readonly summaryExpand = new EventEmitter<void>();
  @Output() readonly selectBlock = new EventEmitter<Block>();

  onContentClick(event?: Event): void {
    if (!this.dockCollapsed) {
      return;
    }
    event?.stopPropagation();
    this.summaryExpand.emit();
  }
}
