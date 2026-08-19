import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { COLLAPSED_SUMMARY_BAR_CLASS } from '../../core/models/collapsed-summary.model';
import { ShowcaseNavigationService } from '../../core/services/showcase-navigation.service';
import { ShowcaseHubUiService } from '../../core/services/showcase-hub-ui.service';
import { ShowcaseNewsStateService } from '../../core/services/showcase-news-state.service';
import { buildNewsCopyText, copyTextToClipboard } from '../../core/utils/clipboard.util';
import {
  formatNewsDisplayTitle,
  newsCategoryAbbrev,
  normalizeNewsCategorySlug,
} from './showcase-news-display.util';

@Component({
  selector: 'app-showcase-news-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-news-summary.html',
  styleUrls: ['./showcase-news-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseNewsSummaryComponent implements OnInit, OnDestroy {
  private static readonly ROTATION_MS = 5000;
  private static readonly TRANSITION_MS = 520;

  protected readonly newsState = inject(ShowcaseNewsStateService);
  private readonly hubUi = inject(ShowcaseHubUiService);
  private readonly nav = inject(ShowcaseNavigationService);
  private rotationTimer: number | null = null;
  private transitionTimer: number | null = null;
  private copyResetTimer: number | null = null;

  @HostBinding(`class.${COLLAPSED_SUMMARY_BAR_CLASS}`)
  readonly collapsedSummaryBar = true;

  @HostBinding('class.news-summary-bar__host')
  readonly hostClass = true;

  @HostBinding('class.is-news')
  readonly isNewsClass = true;

  @HostBinding('class.is-collapsed')
  readonly isCollapsedClass = true;

  readonly unreadCount = this.newsState.unreadCount;
  readonly loading = this.newsState.loading;
  readonly hasUnread = this.newsState.hasUnread;
  readonly activeHeadlineIndex = signal(0);
  readonly previousHeadlineTitle = signal('');
  readonly previousHeadlineAge = signal('');
  readonly isTransitioning = signal(false);
  readonly copied = signal(false);
  readonly copyFailed = signal(false);

  readonly rotationItems = computed(() => {
    const items = this.newsState.feedItems();
    return items.length > 0 ? items : [];
  });

  readonly activeItem = computed(() => {
    const items = this.rotationItems();
    if (items.length === 0) {
      return null;
    }
    const index = this.activeHeadlineIndex() % items.length;
    return items[index] ?? items[0] ?? null;
  });

  readonly headlineTitle = computed(() => {
    const item = this.activeItem();
    return item ? formatNewsDisplayTitle(item) : this.newsState.collapsedHeadlineTitle();
  });

  readonly headlineAge = computed(() => {
    const item = this.activeItem();
    return item ? this.formatRelativeTime(item.relativeTime) : this.newsState.collapsedHeadlineAge();
  });

  readonly isUnreadToastLive = computed(
    () => this.newsState.newItemsToast() || this.newsState.refreshPulse()
  );

  ngOnInit(): void {
    this.newsState.ensureFeedLoaded();
    this.startRotation();
  }

  ngOnDestroy(): void {
    this.stopRotation();
    this.stopTransition();
    if (this.copyResetTimer !== null) {
      window.clearTimeout(this.copyResetTimer);
      this.copyResetTimer = null;
    }
  }

  barAriaLabel(): string {
    const title = this.headlineTitle();
    const age = this.headlineAge();
    const chain = this.newsState.chainStatusPrimary();
    const unread = this.unreadCount();
    const unreadPart = unread > 0 ? `${unread} non lues. ` : '';
    return `${unreadPart}${title}${age ? `, ${age}` : ''}. ${chain}. Cliquer pour développer.`;
  }

  onBarClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.news-summary-bar__action-btn')) {
      return;
    }
    this.hubUi.requestExpand();
  }

  onBarKeydown(event: Event): void {
    event.preventDefault();
    this.hubUi.requestExpand();
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.newsState.refreshFeed(true);
  }

  private startRotation(): void {
    this.stopRotation();
    this.rotationTimer = window.setInterval(() => {
      const items = this.rotationItems();
      if (items.length <= 1) {
        this.activeHeadlineIndex.set(0);
        return;
      }
      const nextIndex = (this.activeHeadlineIndex() + 1) % items.length;
      this.runHeadlineTransition(nextIndex);
    }, ShowcaseNewsSummaryComponent.ROTATION_MS);
  }

  private stopRotation(): void {
    if (this.rotationTimer !== null) {
      window.clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  private runHeadlineTransition(nextIndex: number): void {
    this.stopTransition();
    this.previousHeadlineTitle.set(this.headlineTitle());
    this.previousHeadlineAge.set(this.headlineAge());
    this.activeHeadlineIndex.set(nextIndex);
    this.isTransitioning.set(true);
    this.transitionTimer = window.setTimeout(() => {
      this.isTransitioning.set(false);
      this.previousHeadlineTitle.set('');
      this.previousHeadlineAge.set('');
      this.transitionTimer = null;
    }, ShowcaseNewsSummaryComponent.TRANSITION_MS);
  }

  private stopTransition(): void {
    if (this.transitionTimer !== null) {
      window.clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    this.isTransitioning.set(false);
  }

  private formatRelativeTime(raw: string | null | undefined): string {
    const value = raw?.trim() ?? '';
    if (!value) {
      return '';
    }

    const stripped = value.replace(/^il y a\s+/i, '').trim();
    if (/^(à l['’]instant|now|instant)$/i.test(stripped)) {
      return '0s';
    }

    const match = stripped.match(
      /^(\d+)\s*(s|sec|secs?|secondes?|m|min|mins?|minutes?|h|hrs?|heures?|j|d|jours?|days?)?\.?$/i
    );
    if (!match) {
      return stripped.replace(/(\d)\s+(\w)/g, '$1$2');
    }

    const n = match[1];
    const unit = (match[2] ?? 's').toLowerCase();
    if (unit.startsWith('s') || unit.startsWith('sec')) {
      return `${n}s`;
    }
    if (unit === 'm' || unit.startsWith('min')) {
      return `${n}min`;
    }
    if (unit.startsWith('h')) {
      return `${n}h`;
    }
    if (unit.startsWith('j') || unit.startsWith('d') || unit.startsWith('jour') || unit.startsWith('day')) {
      return `${n}j`;
    }
    return stripped.replace(/(\d)\s+(\w)/g, '$1$2');
  }

  unreadBadgeLabel(): string {
    const count = this.unreadCount();
    return count > 99 ? '99+' : String(count);
  }

  unreadToastAriaLabel(): string {
    const count = this.unreadCount();
    return `${count} actualité${count > 1 ? 's' : ''} non lue${count > 1 ? 's' : ''}. Cliquer pour ouvrir le showcase.`;
  }

  onUnreadToastClick(event: Event): void {
    event.stopPropagation();
    this.newsState.dismissNewItemsToast();
    this.hubUi.requestExpand();
  }

  categoryBadge(): string {
    const item = this.activeItem();
    if (!item) {
      return 'INFO';
    }
    return newsCategoryAbbrev(item.category, item.source);
  }

  categorySlug(): string {
    const item = this.activeItem();
    return normalizeNewsCategorySlug(item?.category ?? 'info');
  }

  canNavigatePrev(): boolean {
    return this.rotationItems().length > 1;
  }

  canNavigateNext(): boolean {
    return this.rotationItems().length > 1;
  }

  navigatePrev(event: Event): void {
    event.stopPropagation();
    const items = this.rotationItems();
    if (items.length <= 1) {
      return;
    }
    const nextIndex =
      (this.activeHeadlineIndex() - 1 + items.length) % items.length;
    this.runHeadlineTransition(nextIndex);
  }

  navigateNext(event: Event): void {
    event.stopPropagation();
    const items = this.rotationItems();
    if (items.length <= 1) {
      return;
    }
    const nextIndex = (this.activeHeadlineIndex() + 1) % items.length;
    this.runHeadlineTransition(nextIndex);
  }

  async copyCurrent(event: Event): Promise<void> {
    event.stopPropagation();
    const item = this.activeItem();
    if (!item) {
      return;
    }

    const ok = await copyTextToClipboard(buildNewsCopyText(item));
    if (this.copyResetTimer !== null) {
      window.clearTimeout(this.copyResetTimer);
      this.copyResetTimer = null;
    }

    if (ok) {
      this.copied.set(true);
      this.copyFailed.set(false);
      this.copyResetTimer = window.setTimeout(() => {
        this.copied.set(false);
        this.copyResetTimer = null;
      }, 2_000);
      return;
    }

    this.copied.set(false);
    this.copyFailed.set(true);
    this.copyResetTimer = window.setTimeout(() => {
      this.copyFailed.set(false);
      this.copyResetTimer = null;
    }, 2_000);
  }

  copyButtonLabel(): string {
    if (this.copied()) {
      return 'Copié';
    }
    if (this.copyFailed()) {
      return 'Échec';
    }
    return 'Copier';
  }

  runAction(event: Event): void {
    event.stopPropagation();
    const item = this.activeItem();
    if (!item) {
      return;
    }
    this.nav.dispatchNewsAction(item.actionType, item.actionTarget);
  }
}
