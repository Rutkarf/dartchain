import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  output,
} from '@angular/core';

import { ShowcaseTab, isNewsShowcaseTab, isR4v3ShowcaseTab } from '../../core/models/showcase-tab.model';
import { ShowcaseWindowComponent } from '@showcase/components/showcase-window/showcase-window';

@Component({
  selector: 'app-showcase-panel',
  standalone: true,
  imports: [ShowcaseWindowComponent],
  templateUrl: './showcase-panel.html',
  styleUrls: ['./showcase-panel.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcasePanelComponent {
  @Input() activeTab: ShowcaseTab = 'tours';
  @Input() collapsed = false;

  readonly selectBlock = output<number>();

  @HostBinding('class.is-collapsed')
  get isCollapsedClass(): boolean {
    return this.collapsed;
  }

  @HostBinding('class.is-expanded')
  get isExpandedClass(): boolean {
    return !this.collapsed;
  }

  @HostBinding('attr.data-active-tab')
  get activeTabAttr(): ShowcaseTab {
    return this.activeTab;
  }

  @HostBinding('class.is-news')
  get isNewsTab(): boolean {
    return isNewsShowcaseTab(this.activeTab);
  }

  @HostBinding('class.is-chat')
  get isChatTab(): boolean {
    return this.activeTab === 'rv23';
  }

  @HostBinding('class.is-launch')
  get isLaunchTab(): boolean {
    return this.activeTab === 'dao';
  }

  @HostBinding('class.is-r4v3')
  get isR4v3Tab(): boolean {
    return isR4v3ShowcaseTab(this.activeTab);
  }

  isSmartTab(_tab: ShowcaseTab): boolean {
    return true;
  }

  panelTitle(tab: ShowcaseTab): string {
    const match = {
      tours: 'TOUS',
      r4v3: 'R4V3',
      rv23: 'CHAT',
      dao: 'LABZ',
      daonews: 'D.A.O',
      market: 'MARCHÉ',
    } satisfies Record<ShowcaseTab, string>;
    return match[tab];
  }

  onSelectBlock(index: number): void {
    this.selectBlock.emit(index);
  }
}
