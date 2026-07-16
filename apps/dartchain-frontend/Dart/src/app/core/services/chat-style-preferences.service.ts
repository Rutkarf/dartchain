import { Injectable, computed, signal } from '@angular/core';

import {
  ChatTextFormat,
  DEFAULT_CHAT_FORMAT,
  normalizeChatTextFormat,
} from '../constants/chat-format.constants';
import {
  CHAT_BUBBLE_STYLE_OPTIONS,
  ChatBubbleStyleKey,
  ChatFontKey,
} from '../constants/chat-style.constants';

const FORMAT_KEY = 'dart_chat_text_format';

@Injectable({ providedIn: 'root' })
export class ChatStylePreferencesService {
  private readonly formatState = signal<ChatTextFormat>(this.loadFormat());

  readonly format = this.formatState.asReadonly();
  readonly fontKey = computed(() => this.formatState().fontKey);
  readonly bubbleStyleKey = computed(() => this.formatState().styleKey);

  patchFormat(patch: Partial<ChatTextFormat>): void {
    const next = normalizeChatTextFormat({ ...this.formatState(), ...patch, textAlign: 'right' });
    this.formatState.set(next);
    localStorage.setItem(FORMAT_KEY, JSON.stringify(next));
  }

  setFont(key: ChatFontKey): void {
    this.patchFormat({ fontKey: key });
  }

  setBubbleStyle(key: ChatBubbleStyleKey): void {
    this.patchFormat({ styleKey: key });
  }

  toggleBold(): void {
    const current = this.formatState();
    this.patchFormat({ bold: !current.bold });
  }

  toggleItalic(): void {
    const current = this.formatState();
    this.patchFormat({ italic: !current.italic });
  }

  toggleUnderline(): void {
    const current = this.formatState();
    this.patchFormat({ underline: !current.underline });
  }

  toggleStrikethrough(): void {
    const current = this.formatState();
    this.patchFormat({ strikethrough: !current.strikethrough });
  }

  cycleBubbleStyle(): void {
    const options = CHAT_BUBBLE_STYLE_OPTIONS;
    const current = this.formatState().styleKey;
    const idx = options.findIndex((o) => o.key === current);
    const next = options[(idx + 1) % options.length];
    this.setBubbleStyle(next.key);
  }

  resetFormat(): void {
    this.formatState.set({ ...DEFAULT_CHAT_FORMAT });
    localStorage.setItem(FORMAT_KEY, JSON.stringify(DEFAULT_CHAT_FORMAT));
  }

  snapshot(): ChatTextFormat {
    return { ...this.formatState() };
  }

  private loadFormat(): ChatTextFormat {
    try {
      const raw = localStorage.getItem(FORMAT_KEY);
      if (!raw) {
        return { ...DEFAULT_CHAT_FORMAT };
      }
      return normalizeChatTextFormat(JSON.parse(raw) as Partial<ChatTextFormat>);
    } catch {
      return { ...DEFAULT_CHAT_FORMAT };
    }
  }
}
