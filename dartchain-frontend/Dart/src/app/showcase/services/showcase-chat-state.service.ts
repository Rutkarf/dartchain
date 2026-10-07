import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';

import {
  formatChatDisplayName,
  formatChatMessageTime,
} from '@core/constants/chat-display.constants';
import { ChatMessage } from '@showcase/models/showcase.model';
import { ShowcaseChatService } from './showcase-chat.service';

export type ChatLiveTone = 'active' | 'pending' | 'offline';

@Injectable({ providedIn: 'root' })
export class ShowcaseChatStateService {
  private readonly chat = inject(ShowcaseChatService);
  private readonly refreshRequested = new Subject<void>();
  private readonly lastSeenMessageId = signal<string | null>(null);

  readonly refresh$ = this.refreshRequested.asObservable();
  readonly refreshing = signal(false);
  readonly roomLabel = signal('Salon global');

  readonly connected = this.chat.connected;
  readonly messages = this.chat.messages;
  readonly sendError = this.chat.sendError;

  readonly unreadCount = computed(() => {
    const messages = this.messages();
    const seenId = this.lastSeenMessageId();
    const seenIndex = seenId ? messages.findIndex((entry) => entry.id === seenId) : -1;
    const afterSeen = seenIndex >= 0 ? messages.slice(seenIndex + 1) : messages;
    return afterSeen.filter((message) => !message.self).length;
  });

  readonly hasUnread = computed(() => this.unreadCount() > 0);

  readonly lastMessage = computed(() => {
    const messages = this.messages();
    return messages.length > 0 ? messages[messages.length - 1] : null;
  });

  readonly lastPreviewAuthor = computed(() => {
    const message = this.lastMessage();
    return message ? formatChatDisplayName(message.author) : '';
  });

  readonly lastPreviewText = computed(() => {
    const message = this.lastMessage();
    return message ? message.text.trim() : '';
  });

  readonly chatLiveTone = computed((): ChatLiveTone => {
    if (this.refreshing() || this.chat.refreshingHistory()) {
      return 'pending';
    }

    if (this.connected()) {
      return 'active';
    }

    return 'offline';
  });

  readonly previewHeadline = computed(() => {
    const messages = this.messages();
    if (messages.length === 0) {
      return '';
    }

    const formatLine = (message: ChatMessage) => {
      const author = formatChatDisplayName(message.author);
      const text = message.text.trim();
      const time = formatChatMessageTime(message.sentAt);
      const body = `${author}: ${text}`;
      return time ? `${body} · ${time}` : body;
    };

    if (messages.length === 1) {
      return formatLine(messages[0]);
    }

    const last = messages[messages.length - 1];
    const prev = messages[messages.length - 2];
    return `${formatLine(last)}  |  ${formatChatDisplayName(prev.author)}: ${prev.text.trim()}`;
  });

  readonly lastTimeLabel = computed(() => {
    const message = this.lastMessage();
    return message ? formatChatMessageTime(message.sentAt) : '';
  });

  readonly statusLabel = computed(() => {
    switch (this.chatLiveTone()) {
      case 'active':
        return 'Chat disponible';
      case 'pending':
        return 'Synchronisation…';
      case 'offline':
        return 'Chat indisponible';
    }
  });

  chatLedClass(): string {
    return `showcase-chat__live-led showcase-chat__live-led--${this.chatLiveTone()}`;
  }

  markAsRead(): void {
    const messages = this.messages();
    const last = messages[messages.length - 1];
    if (last) {
      this.lastSeenMessageId.set(last.id);
    }
  }

  requestRefresh(): void {
    void this.refreshMessages();
  }

  async refreshMessages(): Promise<void> {
    if (this.refreshing()) {
      return;
    }

    this.refreshing.set(true);

    try {
      await this.chat.refreshMessages();
      this.refreshRequested.next();
    } finally {
      this.refreshing.set(false);
    }
  }
}
