import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  Output,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { ShowcaseNewsStateService } from '../../core/services/showcase-news-state.service';

@Component({
  selector: 'app-showcase-news-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-news-summary.html',
  styleUrls: ['./showcase-news-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseNewsSummaryComponent {
  private readonly newsState = inject(ShowcaseNewsStateService);

  @Output() readonly refreshClick = new EventEmitter<void>();

  @HostBinding('class.showcase-news-bar__content')
  readonly contentClass = true;

  @HostBinding('class.is-news')
  readonly isNewsClass = true;

  @HostBinding('class.is-collapsed')
  readonly isCollapsedClass = true;

  readonly unreadCount = this.newsState.unreadCount;
  readonly previews = this.newsState.unreadPreviews;
  readonly liveActivity = this.newsState.liveActivity;
  readonly liveAgeLabel = this.newsState.liveAgeLabel;
  readonly loading = this.newsState.loading;
  readonly hasUnread = this.newsState.hasUnread;

  readonly previewHeadline = computed(() => {
    const items = this.previews();
    if (items.length === 0) {
      return '';
    }

    const format = (item: (typeof items)[number]) =>
      item.relativeTime ? `${item.title} · ${item.relativeTime}` : item.title;

    if (items.length === 1) {
      return format(items[0]);
    }

    return `${format(items[0])}  |  ${items[1].title}`;
  });

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.newsState.requestRefresh();
    this.refreshClick.emit();
  }
}
