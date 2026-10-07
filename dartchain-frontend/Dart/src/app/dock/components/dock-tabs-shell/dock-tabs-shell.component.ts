import { Component, EventEmitter, Input, OnDestroy, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Block } from '@blockchain/models/block.model';
import { BottomDockTab } from '@dock/services/dock-navigation.service';
import { ProductConfigService } from '@core/config/product-config.service';
import { AuthService } from '@auth/services/auth.service';
import { LocaleService } from '@core/i18n/locale.service';
import { CollapsedBarActionsComponent } from '@components/collapsed-bar-actions/collapsed-bar-actions';
import { DockBottomSummaryComponent } from '@dock/components/dock-summary/dock-bottom-summary';
import { DockQuestsStateService } from '@dock/services/dock-quests-state.service';
import { WalletPanelComponent } from '@wallet/wallet-panel/wallet-panel';
import { FaucetComponent } from '@faucet/faucet/faucet';
import { TransactionsDockComponent } from '@dock/components/transactions-dock/transactions-dock';
import { BlocksListComponent } from '@blockchain/blocks-list/blocks-list';
import { QuestsPanelComponent } from '@quests/quests-panel/quests-panel';
import { PeerPanelComponent } from '@peers/peer-panel/peer-panel';
import { AdminPanelComponent } from '@admin/admin-panel/admin-panel';
import { BadgeDigit3dComponent } from '../../../components/badge-digit-3d/badge-digit-3d';
import { TabCollapseGesture } from '../../../components/tab-collapse-gesture';

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
    BadgeDigit3dComponent,
  ],
  templateUrl: './dock-tabs-shell.component.html',
  styleUrl: './dock-tabs-shell.component.scss',
  host: {
    class: 'app-dock-tabs-section',
    '[class.is-dock-collapsed]': 'dockCollapsed',
  },
})
export class DockTabsDockTabsComponent implements OnDestroy {
  readonly product = inject(ProductConfigService);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);
  readonly questsState = inject(DockQuestsStateService);
  private readonly collapseGesture = new TabCollapseGesture();

  claimableBadgeLabel(): string {
    const count = this.questsState.claimableCount();
    return count > 99 ? '99+' : String(count);
  }

  @Input() activeTab: BottomDockTab = 'wallet';
  @Input() dockCollapsed = true;
  @Input() collapseAriaLabel = 'Replier le dock';
  @Input() refreshBusy = false;

  @Output() readonly tabChange = new EventEmitter<BottomDockTab>();
  @Output() readonly tabDoubleClick = new EventEmitter<boolean>();
  @Output() readonly collapseToggle = new EventEmitter<void>();
  @Output() readonly refresh = new EventEmitter<Event>();
  @Output() readonly summaryExpand = new EventEmitter<void>();
  @Output() readonly selectBlock = new EventEmitter<Block>();

  ngOnDestroy(): void {
    this.collapseGesture.dispose();
  }

  onTabPointerDown(event: PointerEvent): void {
    if (!this.isTabEvent(event)) {
      return;
    }
    this.collapseGesture.notePointerDown(this.dockCollapsed);
  }

  onTabDoubleClick(event: MouseEvent): void {
    if (!this.isTabEvent(event)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.tabDoubleClick.emit(this.collapseGesture.resolveDoubleClick(this.dockCollapsed));
  }

  /** Clic onglet : change / déplie, mais no-op si déjà actif et déplié (préserve le dblclick). */
  selectDockTab(tab: BottomDockTab): void {
    if (tab === this.activeTab && !this.dockCollapsed) {
      return;
    }
    this.tabChange.emit(tab);
  }

  private isTabEvent(event: Event): boolean {
    const target = event.target;
    return target instanceof Element && Boolean(target.closest('.showcase-tab'));
  }

  onContentClick(event?: Event): void {
    if (!this.dockCollapsed) {
      return;
    }
    event?.stopPropagation();
    this.summaryExpand.emit();
  }
}
