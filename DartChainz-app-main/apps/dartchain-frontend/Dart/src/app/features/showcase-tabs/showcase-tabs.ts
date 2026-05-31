import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  SHOWCASE_TABS,
  ShowcaseTab,
} from '../../core/models/showcase-tab.model';
import { ShowcaseNewsStateService } from '../../core/services/showcase-news-state.service';

@Component({
  selector: 'app-showcase-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-tabs.html',
  styleUrls: ['./showcase-tabs.css'],
})
export class ShowcaseTabsComponent {
  private readonly newsState = inject(ShowcaseNewsStateService);

  readonly tabs = SHOWCASE_TABS;

  @Input() activeTab: ShowcaseTab = 'tours';

  @Output() readonly tabChange = new EventEmitter<ShowcaseTab>();

  unreadNewsCount(): number {
    return this.newsState.unreadCount();
  }

  selectTab(tab: ShowcaseTab): void {
    if (tab === this.activeTab) {
      return;
    }

    this.tabChange.emit(tab);
  }

  isActive(tab: ShowcaseTab): boolean {
    return this.activeTab === tab;
  }
}
