import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  SHOWCASE_TABS,
  ShowcaseTab,
} from '@showcase/models/showcase-tab.model';
import { ShowcaseNewsStateService } from '@showcase/services/showcase-news-state.service';
import { BadgeDigit3dComponent } from '../../../components/badge-digit-3d/badge-digit-3d';

@Component({
  selector: 'app-showcase-tabs',
  standalone: true,
  imports: [CommonModule, BadgeDigit3dComponent],
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

  unreadBadgeLabel(): string {
    const count = this.unreadNewsCount();
    return count > 99 ? '99+' : String(count);
  }

  newsToastLive(): boolean {
    return this.newsState.newItemsToast() || this.newsState.refreshPulse();
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

  tabAriaLabel(tab: { id: ShowcaseTab; label: string }): string {
    if (tab.id === 'tours') {
      const count = this.unreadNewsCount();
      if (count > 0) {
        return `${tab.label}, ${count} non lue${count > 1 ? 's' : ''}`;
      }
    }

    return tab.label;
  }
}
