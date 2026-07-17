import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { COLLAPSED_SUMMARY_BAR_CLASS } from '../../core/models/collapsed-summary.model';
import { ShowcaseChatStateService } from '../../core/services/showcase-chat-state.service';
import { ShowcaseChatService } from '../../core/services/showcase-chat.service';

@Component({
  selector: 'app-showcase-chat-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-chat-summary.html',
  styleUrls: ['./showcase-chat-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseChatSummaryComponent implements OnInit {
  private readonly chat = inject(ShowcaseChatService);
  protected readonly chatState = inject(ShowcaseChatStateService);

  @Output() readonly refreshClick = new EventEmitter<void>();

  @HostBinding(`class.${COLLAPSED_SUMMARY_BAR_CLASS}`)
  readonly collapsedSummaryBar = true;

  @HostBinding('class.showcase-chat-bar__content')
  readonly contentClass = true;

  @HostBinding('class.is-chat')
  readonly isChatClass = true;

  @HostBinding('class.is-collapsed')
  readonly isCollapsedClass = true;

  readonly unreadCount = this.chatState.unreadCount;
  readonly hasUnread = this.chatState.hasUnread;
  readonly roomLabel = this.chatState.roomLabel;
  readonly connected = this.chatState.connected;
  readonly statusLabel = this.chatState.statusLabel;
  readonly previewHeadline = this.chatState.previewHeadline;
  readonly lastTimeLabel = this.chatState.lastTimeLabel;
  readonly lastPreviewAuthor = this.chatState.lastPreviewAuthor;
  readonly lastPreviewText = this.chatState.lastPreviewText;
  readonly refreshing = this.chatState.refreshing;

  ngOnInit(): void {
    this.chat.connect();
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    void this.chatState.refreshMessages();
    this.refreshClick.emit();
  }
}
