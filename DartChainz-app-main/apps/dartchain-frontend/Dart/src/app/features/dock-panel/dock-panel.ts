import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';

import { Block } from '../../core/models/block.model';
import { OverlayPanel } from '../dock-tabs/dock-tabs';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel';
import { PendingTransactionsComponent } from '../pending-transactions/pending-transactions';
import { BlockComposerComponent } from '../block-composer/block-composer';
import { BlocksListComponent } from '../blocks-list/blocks-list';
import { PeerPanelComponent } from '../peer-panel/peer-panel';
import { DockPendingSummaryComponent } from '../dock-summary/dock-pending-summary';
import { DockBlockSummaryComponent } from '../dock-summary/dock-block-summary';
import { DockWalletSummaryComponent } from '../dock-summary/dock-wallet-summary';
import { DockChainSummaryComponent } from '../dock-summary/dock-chain-summary';
import { DockPeersSummaryComponent } from '../dock-summary/dock-peers-summary';
import { MiniBarSlideIndicatorComponent } from '../mini-bar-slide-indicator/mini-bar-slide-indicator';

@Component({
  selector: 'app-dock-panel',
  standalone: true,
  imports: [
    WalletPanelComponent,
    PendingTransactionsComponent,
    BlockComposerComponent,
    BlocksListComponent,
    PeerPanelComponent,
    DockPendingSummaryComponent,
    DockBlockSummaryComponent,
    DockWalletSummaryComponent,
    DockChainSummaryComponent,
    DockPeersSummaryComponent,
    MiniBarSlideIndicatorComponent,
  ],
  templateUrl: './dock-panel.html',
  styleUrls: ['./dock-panel.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockPanelComponent {
  @Input() activePanel: OverlayPanel = 'wallet';
  @Input() collapsed = false;

  @Output() readonly selectBlock = new EventEmitter<Block>();

  @HostBinding('class.is-collapsed')
  get isCollapsedClass(): boolean {
    return this.collapsed;
  }

  @HostBinding('class.is-expanded')
  get isExpandedClass(): boolean {
    return !this.collapsed;
  }

  @HostBinding('class.is-pending')
  get isPendingClass(): boolean {
    return this.activePanel === 'pending';
  }

  @HostBinding('class.is-block')
  get isBlockClass(): boolean {
    return this.activePanel === 'composer';
  }

  @HostBinding('class.is-wallet')
  get isWalletClass(): boolean {
    return this.activePanel === 'wallet';
  }

  @HostBinding('class.is-chain')
  get isChainClass(): boolean {
    return this.activePanel === 'chain';
  }

  @HostBinding('class.is-peers')
  get isPeersClass(): boolean {
    return this.activePanel === 'peers';
  }

  @HostBinding('attr.data-active-panel')
  get activePanelAttr(): OverlayPanel {
    return this.activePanel;
  }

  get isPendingCollapsed(): boolean {
    return this.collapsed && this.activePanel === 'pending';
  }

  get isBlockCollapsed(): boolean {
    return this.collapsed && this.activePanel === 'composer';
  }

  get isWalletCollapsed(): boolean {
    return this.collapsed && this.activePanel === 'wallet';
  }

  get isChainCollapsed(): boolean {
    return this.collapsed && this.activePanel === 'chain';
  }

  get isPeersCollapsed(): boolean {
    return this.collapsed && this.activePanel === 'peers';
  }

  onChainBlockSelect(block: Block): void {
    this.selectBlock.emit(block);
  }
}
