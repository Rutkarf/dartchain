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
import { PendingTransactionsComponent } from '../pending-transactions/pending-transactions';
import { BlockComposerComponent } from '../block-composer/block-composer';
import { BlocksListComponent } from '../blocks-list/blocks-list';
import { DockPendingSummaryComponent } from '../dock-summary/dock-pending-summary';
import { DockBlockSummaryComponent } from '../dock-summary/dock-block-summary';
import { DockChainSummaryComponent } from '../dock-summary/dock-chain-summary';
import { MiniBarSlideIndicatorComponent } from '../mini-bar-slide-indicator/mini-bar-slide-indicator';

@Component({
  selector: 'app-dock-panel',
  standalone: true,
  imports: [
    PendingTransactionsComponent,
    BlockComposerComponent,
    BlocksListComponent,
    DockPendingSummaryComponent,
    DockBlockSummaryComponent,
    DockChainSummaryComponent,
    MiniBarSlideIndicatorComponent,
  ],
  templateUrl: './dock-panel.html',
  styleUrls: ['./dock-panel.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockPanelComponent {
  @Input() activePanel: OverlayPanel = 'pending';
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

  @HostBinding('class.is-chain')
  get isChainClass(): boolean {
    return this.activePanel === 'chain';
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

  get isChainCollapsed(): boolean {
    return this.collapsed && this.activePanel === 'chain';
  }

  onChainBlockSelect(block: Block): void {
    this.selectBlock.emit(block);
  }
}
