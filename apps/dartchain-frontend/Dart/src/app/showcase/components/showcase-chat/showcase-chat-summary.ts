import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  OnDestroy,
  OnInit,
  Output,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { COLLAPSED_SUMMARY_BAR_CLASS } from '@dock/models/collapsed-summary.model';
import { ShowcaseChatStateService } from '@showcase/services/showcase-chat-state.service';
import { ShowcaseChatService } from '@showcase/services/showcase-chat.service';

@Component({
  selector: 'app-showcase-chat-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-chat-summary.html',
  styleUrls: ['./showcase-chat-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseChatSummaryComponent implements OnInit, OnDestroy {
  private static readonly MESSAGE_TRANSITION_MS = 320;

  private readonly chat = inject(ShowcaseChatService);
  protected readonly chatState = inject(ShowcaseChatStateService);
  private transitionTimer: number | null = null;
  private lastAnimatedMessageId: string | null = null;
  private lastRenderedAuthor = '';
  private lastRenderedText = '';
  private lastRenderedUnreadCount = 0;

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
  readonly lastMessage = this.chatState.lastMessage;
  readonly lastPreviewAuthor = this.chatState.lastPreviewAuthor;
  readonly lastPreviewText = this.chatState.lastPreviewText;
  readonly refreshing = this.chatState.refreshing;
  readonly previousPreviewAuthor = signal('');
  readonly previousPreviewText = signal('');
  readonly previousUnreadCount = signal(0);
  readonly isMessageTransitioning = signal(false);

  constructor() {
    effect(() => {
      const message = this.lastMessage();
      const currentId = message?.id ?? null;
      const currentAuthor = this.chatState.lastPreviewAuthor();
      const currentText = this.chatState.lastPreviewText();
      const currentUnreadCount = this.unreadCount();

      if (!currentId) {
        this.lastAnimatedMessageId = null;
        this.lastRenderedAuthor = '';
        this.lastRenderedText = '';
        this.lastRenderedUnreadCount = 0;
        this.isMessageTransitioning.set(false);
        this.previousPreviewAuthor.set('');
        this.previousPreviewText.set('');
        this.previousUnreadCount.set(0);
        return;
      }

      if (this.lastAnimatedMessageId === null) {
        this.lastAnimatedMessageId = currentId;
        this.lastRenderedAuthor = currentAuthor;
        this.lastRenderedText = currentText;
        this.lastRenderedUnreadCount = currentUnreadCount;
        return;
      }

      if (currentId === this.lastAnimatedMessageId) {
        this.lastRenderedAuthor = currentAuthor;
        this.lastRenderedText = currentText;
        this.lastRenderedUnreadCount = currentUnreadCount;
        return;
      }

      this.previousPreviewAuthor.set(this.lastRenderedAuthor);
      this.previousPreviewText.set(this.lastRenderedText);
      this.previousUnreadCount.set(this.lastRenderedUnreadCount);
      this.lastAnimatedMessageId = currentId;
      this.lastRenderedAuthor = currentAuthor;
      this.lastRenderedText = currentText;
      this.lastRenderedUnreadCount = currentUnreadCount;
      this.isMessageTransitioning.set(true);

      if (this.transitionTimer !== null) {
        window.clearTimeout(this.transitionTimer);
      }
      this.transitionTimer = window.setTimeout(() => {
        this.isMessageTransitioning.set(false);
        this.previousPreviewAuthor.set('');
        this.previousPreviewText.set('');
        this.previousUnreadCount.set(0);
        this.transitionTimer = null;
      }, ShowcaseChatSummaryComponent.MESSAGE_TRANSITION_MS);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.chat.connect();
  }

  ngOnDestroy(): void {
    if (this.transitionTimer !== null) {
      window.clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    void this.chatState.refreshMessages();
    this.refreshClick.emit();
  }
}
