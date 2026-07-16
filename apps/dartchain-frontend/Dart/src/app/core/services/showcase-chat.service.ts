import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ChatMessage } from '../models/showcase.model';
import { formatChatDisplayName, isGuestChatAuthor } from '../constants/chat-display.constants';
import { ChatTextFormat, formatFromMessage } from '../constants/chat-format.constants';
import { ShowcaseApiService } from './showcase-api.service';
import { ChatStylePreferencesService } from './chat-style-preferences.service';
import { readStoredAuthToken } from '../auth/auth-session.storage';

const USERNAME_KEY = 'dart_chat_username';
const CLIENT_ID_KEY = 'dart_chat_client_id';

type ChatWsEnvelope =
  | { type: 'history'; data: ChatMessage[] }
  | { type: 'chat'; data: ChatMessage }
  | { type: 'error'; message: string };

@Injectable({
  providedIn: 'root',
})
export class ShowcaseChatService {
  private readonly api = inject(ShowcaseApiService);
  private readonly chatStyle = inject(ChatStylePreferencesService);
  private readonly wsUrl = environment.chatWsUrl.replace(/\/+$/, '');

  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private shouldStayConnected = false;
  private readonly messagesSignal = signal<ChatMessage[]>([]);
  private readonly connectedSignal = signal(false);
  private readonly sendErrorSignal = signal<string | null>(null);

  readonly messages = this.messagesSignal.asReadonly();
  readonly connected = this.connectedSignal.asReadonly();
  readonly sendError = this.sendErrorSignal.asReadonly();

  getUsername(): string {
    const stored = localStorage.getItem(USERNAME_KEY)?.trim();
    if (stored) {
      if (isGuestChatAuthor(stored)) {
        localStorage.setItem(USERNAME_KEY, 'Anonymous');
        return 'Anonymous';
      }
      return stored;
    }

    localStorage.setItem(USERNAME_KEY, 'Anonymous');
    return 'Anonymous';
  }

  setUsername(username: string): void {
    const value = username.trim();
    if (value) {
      localStorage.setItem(USERNAME_KEY, value);
    }
  }

  getClientId(): string {
    const stored = localStorage.getItem(CLIENT_ID_KEY);
    if (stored) {
      return stored;
    }

    const generated = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, generated);
    return generated;
  }

  connect(): void {
    this.shouldStayConnected = true;
    this.openSocket();
  }

  private openSocket(): void {
    if (!this.shouldStayConnected) {
      return;
    }

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.loadHistoryFallback();

    this.socket = new WebSocket(this.buildWsUrl());

    this.socket.onopen = () => {
      this.connectedSignal.set(true);
      this.reconnectAttempt = 0;
    };

    this.socket.onmessage = (event: MessageEvent<string>) => {
      const envelope = this.parseEnvelope(event.data);
      if (!envelope) {
        return;
      }

      if (envelope.type === 'history') {
        this.messagesSignal.set(this.markSelf(envelope.data));
        return;
      }

      if (envelope.type === 'chat') {
        this.appendMessage(envelope.data);
        return;
      }

      if (envelope.type === 'error') {
        this.sendErrorSignal.set(envelope.message || "Impossible d'envoyer le message.");
      }
    };

    this.socket.onerror = () => {
      this.connectedSignal.set(false);
    };

    this.socket.onclose = () => {
      this.connectedSignal.set(false);
      this.socket = null;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (!this.shouldStayConnected || this.reconnectTimer) {
      return;
    }

    const delay = Math.min(30_000, 1_000 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempt = 0;
  }

  disconnect(): void {
    this.shouldStayConnected = false;
    this.clearReconnect();

    if (!this.socket) {
      this.connectedSignal.set(false);
      return;
    }

    this.socket.close();
    this.socket = null;
    this.connectedSignal.set(false);
  }

  sendMessage(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    this.sendErrorSignal.set(null);

    const author = this.getUsername();
    const clientId = this.getClientId();
    const format = this.chatStyle.snapshot();
    const payload = {
      type: 'message',
      author,
      text: trimmed,
      clientId,
      roomId: 'global',
      ...format,
    };

    const optimistic = this.buildLocalMessage(author, trimmed, format);
    this.appendMessage(optimistic);

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
      return;
    }

    this.api
      .postChatMessage({
        author,
        text: trimmed,
        clientId,
        roomId: 'global',
        ...format,
      })
      .subscribe({
        next: (message) => {
          this.sendErrorSignal.set(null);
          this.appendMessage(message);
        },
        error: (error: unknown) => {
          this.removeMessageById(optimistic.id);
          this.sendErrorSignal.set(this.resolveSendError(error));
        },
      });
  }

  clearSendError(): void {
    this.sendErrorSignal.set(null);
  }

  setSendError(message: string | null): void {
    this.sendErrorSignal.set(message);
  }

  private buildWsUrl(): string {
    const token = readStoredAuthToken();
    if (!token) {
      return this.wsUrl;
    }

    const separator = this.wsUrl.includes('?') ? '&' : '?';
    return `${this.wsUrl}${separator}access_token=${encodeURIComponent(token)}`;
  }

  private buildLocalMessage(author: string, text: string, format: ChatTextFormat): ChatMessage {
    return {
      id: `local-${crypto.randomUUID()}`,
      roomId: 'global',
      author,
      text,
      sentAt: new Date().toISOString(),
      self: true,
      ...format,
    };
  }

  private loadHistoryFallback(): void {
    this.api.getChatMessages(50).subscribe({
      next: (history) => {
        if (this.messagesSignal().length === 0) {
          this.messagesSignal.set(this.markSelf(history.messages));
        }
      },
    });
  }

  private removeMessageById(id: string): void {
    this.messagesSignal.update((current) => current.filter((entry) => entry.id !== id));
  }

  private resolveSendError(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return "Impossible d'envoyer le message. Vérifie ta connexion ou reconnecte-toi.";
  }

  private appendMessage(message: ChatMessage): void {
    const marked = this.markSelf([message])[0];

    this.messagesSignal.update((current) => {
      if (current.some((entry) => entry.id === marked.id)) {
        return current;
      }

      const localIndex = current.findIndex(
        (entry) =>
          entry.id.startsWith('local-') &&
          entry.author === marked.author &&
          entry.text === marked.text
      );

      if (localIndex >= 0) {
        const next = [...current];
        next[localIndex] = marked;
        return next;
      }

      return [...current, marked];
    });
  }

  private markSelf(messages: ChatMessage[]): ChatMessage[] {
    const username = this.getUsername();

    return messages.map((message) => ({
      ...this.normalizeIncoming(message),
      self: formatChatDisplayName(message.author) === username,
    }));
  }

  private normalizeIncoming(message: ChatMessage): ChatMessage {
    return {
      ...message,
      ...formatFromMessage(message),
    };
  }

  private parseEnvelope(raw: string): ChatWsEnvelope | null {
    try {
      return JSON.parse(raw) as ChatWsEnvelope;
    } catch {
      return null;
    }
  }
}
