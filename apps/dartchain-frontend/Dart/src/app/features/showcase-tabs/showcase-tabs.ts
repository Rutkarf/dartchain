import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  SHOWCASE_TABS,
  ShowcaseTab,
} from '../../core/models/showcase-tab.model';
import { ShowcaseNewsStateService } from '../../core/services/showcase-news-state.service';
import { ShowcaseR4v3StateService } from '../../core/services/showcase-r4v3-state.service';

@Component({
  selector: 'app-showcase-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-tabs.html',
  styleUrls: ['./showcase-tabs.css'],
})
export class ShowcaseTabsComponent {
  private readonly newsState = inject(ShowcaseNewsStateService);
  private readonly r4v3State = inject(ShowcaseR4v3StateService);

  readonly tabs = SHOWCASE_TABS;

  @Input() activeTab: ShowcaseTab = 'tours';

  @Output() readonly tabChange = new EventEmitter<ShowcaseTab>();

  constructor() {
    if (this.r4v3State.items().length === 0 && !this.r4v3State.loading()) {
      this.r4v3State.load(false);
    }
  }

  unreadNewsCount(): number {
    return this.newsState.unreadCount();
  }

  unreadR4v3Count(): number {
    return this.r4v3State.unreadCount();
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
