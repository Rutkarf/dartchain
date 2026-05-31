import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';

import { ShowcaseTab } from '../../core/models/showcase-tab.model';
import { ShowcaseTerminalComponent } from '../showcase-terminal/showcase-terminal';

@Component({
  selector: 'app-showcase-window',
  standalone: true,
  imports: [ShowcaseTerminalComponent],
  templateUrl: './showcase-window.html',
  styleUrls: ['./showcase-window.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseWindowComponent {
  @Input() activeTab: ShowcaseTab = 'tours';
  @Input() collapsed = false;

  readonly selectBlock = output<number>();

  onSelectBlock(index: number): void {
    this.selectBlock.emit(index);
  }
}
