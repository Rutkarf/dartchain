import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';

import { SHOWCASE_TABS, ShowcaseTab } from '@showcase/models/showcase-tab.model';
import { DepthRailComponent } from '@components/depth-rail/depth-rail';
import { ShowcaseNewsSummaryComponent } from '@showcase/components/showcase-news/showcase-news-summary';
import { ShowcaseNewsComponent } from '@showcase/components/showcase-news/showcase-news';
import { ShowcaseChatSummaryComponent } from '@showcase/components/showcase-chat/showcase-chat-summary';
import { ShowcaseChatComponent } from '@showcase/components/showcase-chat/showcase-chat';
import { ShowcaseLaunchSummaryComponent } from '@showcase/components/showcase-launch/showcase-launch-summary';
import { ShowcaseLaunchComponent } from '@showcase/components/showcase-launch/showcase-launch';
import { ShowcaseDaoSummaryComponent } from '@showcase/components/showcase-dao/showcase-dao-summary';
import { ShowcaseDaoComponent } from '@showcase/components/showcase-dao/showcase-dao';
import { ShowcaseR4v3SummaryComponent } from '@showcase/components/showcase-r4v3/showcase-r4v3-summary';
import { ShowcaseR4v3Component } from '@showcase/components/showcase-r4v3/showcase-r4v3';
import { DockMarketSummaryComponent } from '@dock/components/dock-summary/dock-market-summary';
import { MarketPanelComponent } from '@showcase/components/market-panel/market-panel';

@Component({
  selector: 'app-showcase-window',
  standalone: true,
  imports: [
    ShowcaseNewsComponent,
    ShowcaseNewsSummaryComponent,
    ShowcaseChatComponent,
    ShowcaseChatSummaryComponent,
    ShowcaseLaunchComponent,
    ShowcaseLaunchSummaryComponent,
    ShowcaseDaoComponent,
    ShowcaseDaoSummaryComponent,
    ShowcaseR4v3Component,
    ShowcaseR4v3SummaryComponent,
    DockMarketSummaryComponent,
    MarketPanelComponent,
    DepthRailComponent,
  ],
  templateUrl: './showcase-window.html',
  styleUrls: ['./showcase-window.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseWindowComponent {
  @Input() activeTab: ShowcaseTab = 'tours';
  @Input() collapsed = false;

  readonly selectBlock = output<number>();
  readonly tabChange = output<ShowcaseTab>();

  tabIndex(): number {
    const index = SHOWCASE_TABS.findIndex((tab) => tab.id === this.activeTab);
    return index < 0 ? 0 : index;
  }

  onRailIndex(index: number): void {
    const tab = SHOWCASE_TABS[index];
    if (tab && tab.id !== this.activeTab) {
      this.tabChange.emit(tab.id);
    }
  }

  windowAriaLabel(): string {
    switch (this.activeTab) {
      case 'tours':
        return 'Actualités showcase — toutes';
      case 'r4v3':
        return 'Token natif R4V3 — cours, swap et actualités';
      case 'daonews':
        return 'Gouvernance D.A.O — DAO communautaires';
      case 'rv23':
        return 'Chat showcase';
      case 'dao':
        return 'Vitrine du laboratoire';
      case 'market':
        return 'Marché — tokens et liquidité';
      default:
        return 'Showcase';
    }
  }

  onSelectBlock(index: number): void {
    this.selectBlock.emit(index);
  }
}
