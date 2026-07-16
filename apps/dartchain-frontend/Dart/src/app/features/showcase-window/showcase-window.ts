import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';

import { ShowcaseTab } from '../../core/models/showcase-tab.model';
import { ShowcaseNewsSummaryComponent } from '../showcase-news/showcase-news-summary';
import { ShowcaseNewsComponent } from '../showcase-news/showcase-news';
import { ShowcaseChatSummaryComponent } from '../showcase-chat/showcase-chat-summary';
import { ShowcaseChatComponent } from '../showcase-chat/showcase-chat';
import { ShowcaseLaunchSummaryComponent } from '../showcase-launch/showcase-launch-summary';
import { ShowcaseLaunchComponent } from '../showcase-launch/showcase-launch';
import { ShowcaseR4v3SummaryComponent } from '../showcase-r4v3/showcase-r4v3-summary';
import { ShowcaseR4v3Component } from '../showcase-r4v3/showcase-r4v3';
import { ShowcaseTerminalComponent } from '../showcase-terminal/showcase-terminal';
import { ShowcaseTerminalSummaryComponent } from '../showcase-terminal/showcase-terminal-summary';

@Component({
  selector: 'app-showcase-window',
  standalone: true,
  imports: [
    ShowcaseTerminalComponent,
    ShowcaseNewsComponent,
    ShowcaseNewsSummaryComponent,
    ShowcaseChatComponent,
    ShowcaseChatSummaryComponent,
    ShowcaseLaunchComponent,
    ShowcaseLaunchSummaryComponent,
    ShowcaseR4v3Component,
    ShowcaseR4v3SummaryComponent,
    ShowcaseTerminalSummaryComponent,
  ],
  templateUrl: './showcase-window.html',
  styleUrls: ['./showcase-window.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseWindowComponent {
  @Input() activeTab: ShowcaseTab = 'tours';
  @Input() collapsed = false;

  readonly selectBlock = output<number>();

  windowAriaLabel(): string {
    switch (this.activeTab) {
      case 'tours':
        return 'Actualités showcase — toutes';
      case 'r4v3':
        return 'Token natif R4V3 — cours, swap et actualités';
      case 'daonews':
        return 'Actualités showcase — D.A.O';
      case 'rv23':
        return 'Chat showcase';
      case 'dao':
        return 'LaunchLab showcase';
      default:
        return 'Terminal showcase';
    }
  }

  onSelectBlock(index: number): void {
    this.selectBlock.emit(index);
  }
}
