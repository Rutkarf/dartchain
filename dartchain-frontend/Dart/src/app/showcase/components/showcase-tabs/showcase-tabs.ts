import { Component, EventEmitter, Input, OnDestroy, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  SHOWCASE_TABS,
  ShowcaseTab,
} from '@showcase/models/showcase-tab.model';
import { ShowcaseNewsStateService } from '@showcase/services/showcase-news-state.service';
import { BadgeDigit3dComponent } from '../../../components/badge-digit-3d/badge-digit-3d';
import { DepthRailComponent } from '../../../components/depth-rail/depth-rail';
import { TabCollapseGesture } from '../../../components/tab-collapse-gesture';

@Component({
  selector: 'app-showcase-tabs',
  standalone: true,
  imports: [CommonModule, BadgeDigit3dComponent, DepthRailComponent],
  templateUrl: './showcase-tabs.html',
  styleUrls: ['./showcase-tabs.css'],
})
export class ShowcaseTabsComponent implements OnDestroy {
  private readonly newsState = inject(ShowcaseNewsStateService);
  private readonly collapseGesture = new TabCollapseGesture();

  readonly tabs = SHOWCASE_TABS;

  @Input() activeTab: ShowcaseTab = 'tours';
  /** Conservé pour l’état replié du panneau. Les onglets restent une rangée plate. */
  @Input() collapsed = false;

  @Output() readonly tabChange = new EventEmitter<ShowcaseTab>();
  /** Double-clic : état replié cible (inverse de l'état au début du geste). */
  @Output() readonly tabDoubleClick = new EventEmitter<boolean>();

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

  tabIndex(): number {
    const index = this.tabs.findIndex((tab) => tab.id === this.activeTab);
    return index < 0 ? 0 : index;
  }

  onRailIndex(index: number): void {
    const tab = this.tabs[index];
    if (tab) {
      this.selectTab(tab.id);
    }
  }

  ngOnDestroy(): void {
    this.collapseGesture.dispose();
  }

  onTabPointerDown(event: PointerEvent): void {
    if (!this.isTabEvent(event)) {
      return;
    }
    this.collapseGesture.notePointerDown(this.collapsed);
  }

  onTabDoubleClick(event: MouseEvent): void {
    if (!this.isTabEvent(event)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.tabDoubleClick.emit(this.collapseGesture.resolveDoubleClick(this.collapsed));
  }

  selectTab(tab: ShowcaseTab): void {
    // Même onglet déjà déplié : no-op pour ne pas casser le dblclick (repli).
    if (tab === this.activeTab && !this.collapsed) {
      return;
    }

    this.tabChange.emit(tab);
  }

  isActive(tab: ShowcaseTab): boolean {
    return this.activeTab === tab;
  }

  private isTabEvent(event: Event): boolean {
    const target = event.target;
    return target instanceof Element && Boolean(target.closest('.showcase-tab'));
  }
}
