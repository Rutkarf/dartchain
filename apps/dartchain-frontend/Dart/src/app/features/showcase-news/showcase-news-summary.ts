import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { COLLAPSED_SUMMARY_BAR_CLASS } from '../../core/models/collapsed-summary.model';
import { ShowcaseHubUiService } from '../../core/services/showcase-hub-ui.service';
import { ShowcaseNewsStateService } from '../../core/services/showcase-news-state.service';

@Component({
  selector: 'app-showcase-news-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-news-summary.html',
  styleUrls: ['./showcase-news-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseNewsSummaryComponent implements OnInit {
  protected readonly newsState = inject(ShowcaseNewsStateService);
  private readonly hubUi = inject(ShowcaseHubUiService);

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

  readonly headlineAge = computed(() => this.newsState.collapsedHeadlineAge());

  readonly isUnreadToastLive = computed(
    () => this.newsState.newItemsToast() || this.newsState.refreshPulse()
  );

  ngOnInit(): void {
    this.newsState.ensureFeedLoaded();
  }

  barAriaLabel(): string {
    const title = this.newsState.collapsedHeadlineTitle();
    const age = this.headlineAge();
    const chain = this.newsState.chainStatusPrimary();
    const unread = this.unreadCount();
    const unreadPart = unread > 0 ? `${unread} non lues. ` : '';
    return `${unreadPart}${title}${age ? `, ${age}` : ''}. ${chain}. Cliquer pour développer.`;
  }

  onBarClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.news-summary-bar__refresh')) {
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
}
