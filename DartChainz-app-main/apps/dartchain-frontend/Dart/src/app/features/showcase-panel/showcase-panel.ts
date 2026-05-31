import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  output,
} from '@angular/core';

import { ShowcaseTab } from '../../core/models/showcase-tab.model';
import { ShowcaseWindowComponent } from '../showcase-window/showcase-window';

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

  panelTitle(tab: ShowcaseTab): string {
    const match = {
      tours: 'TOURS',
      reseau: 'RÉSEAU',
      rv23: 'RV23',
      peers: 'PEERS',
      dao: 'D.A.O',
    } satisfies Record<ShowcaseTab, string>;
    return match[tab];
  }

  onSelectBlock(index: number): void {
    this.selectBlock.emit(index);
  }
}
