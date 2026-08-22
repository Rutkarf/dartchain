import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChatMessage } from '@showcase/models/showcase.model';
import {
  CHAT_THEME_COLOR_GRID,
  CHAT_THEME_HIGHLIGHT_GRID,
  ChatTextFormat,
  formatFromMessage,
  textNgStyle,
  textNgStyleForLine,
} from '@core/constants/chat-format.constants';
import {
  CHAT_FONT_OPTIONS,
  ChatFontKey,
} from '@core/constants/chat-style.constants';
import {
  CHAT_ANONYMOUS_AUTHOR,
  chatLineGradientStyle,
  formatChatDisplayName,
  formatChatMessageTime,
} from '@core/constants/chat-display.constants';
import { ChatRoleMeta, chatRoleFor } from '@core/constants/chat-role.constants';
import { ChatStylePreferencesService } from '@showcase/services/chat-style-preferences.service';
import { AuthService } from '@auth/services/auth.service';
import { ShowcaseChatService } from '@showcase/services/showcase-chat.service';
import { ShowcaseChatStateService } from '@showcase/services/showcase-chat-state.service';
import {
  SHOWCASE_REFRESH_EVENT,
  refreshEventMatchesTab,
} from '@core/constants/panel-refresh.constants';

type ChatMenuId = 'colors' | null;

@Component({
  selector: 'app-showcase-chat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './showcase-chat.html',
  styleUrls: ['./showcase-chat.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseChatComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() isExpanded = true;

  @HostBinding('class.is-chat')
  readonly isChatHost = true;

  @HostBinding('class.is-expanded')
  get isExpandedClass(): boolean {
    return this.isExpanded;
  }

  @HostBinding('class.is-collapsed')
  get isCollapsedClass(): boolean {
    return !this.isExpanded;
  }

  private readonly chat = inject(ShowcaseChatService);
  protected readonly auth = inject(AuthService);
  protected readonly chatState = inject(ShowcaseChatStateService);
  readonly prefs = inject(ChatStylePreferencesService);

  @ViewChild('messagesList') messagesList?: ElementRef<HTMLUListElement>;

  readonly fontOptions = CHAT_FONT_OPTIONS;
  readonly fontColorGrid = CHAT_THEME_COLOR_GRID;
  readonly highlightGrid = CHAT_THEME_HIGHLIGHT_GRID;

  readonly messages = this.chat.messages;
  readonly openMenu = signal<ChatMenuId>(null);
  readonly searchQuery = signal('');
  readonly searchExpanded = signal(false);
  /** Poster sous le pseudonyme Anonymous (compte connecté requis). */
  readonly postAsAnonymous = signal(false);

  readonly filteredMessages = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.messages();

    if (!query) {
      return list;
    }

    return list.filter((msg) => {
      const author = msg.author?.toLowerCase() ?? '';
      const text = msg.text?.toLowerCase() ?? '';
      return author.includes(query) || text.includes(query);
    });
  });

  readonly messageControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(500)],
  });

  readonly postIdentityLabel = computed(() => {
    const username = this.auth.user()?.username?.trim();
    if (username) {
      return formatChatDisplayName(username);
    }
    return 'Compte';
  });

  readonly postIdentityTitle = computed(() => {
    const username = this.auth.user()?.username?.trim();
    if (username) {
      return `Poster en tant que ${formatChatDisplayName(username)}`;
    }
    return 'Poster avec votre compte (connexion requise)';
  });

  readonly postAnonymousTitle = computed(() =>
    this.auth.isAuthenticated()
      ? 'Poster en Anonymous (compte connecté)'
      : 'Connexion requise pour poster en Anonymous'
  );

  readonly sendButtonLabel = computed(() => {
    const author = this.postAsAnonymous()
      ? CHAT_ANONYMOUS_AUTHOR
      : this.postIdentityLabel();
    return `Envoyer le message en tant que ${author}`;
  });

  readonly composerPlaceholder = computed(() => {
    if (!this.auth.isAuthenticated()) {
      return 'Connexion requise pour écrire…';
    }
    if (this.postAsAnonymous()) {
      return 'Message anonyme…';
    }
    return 'Tape ton message…';
  });

  ngOnInit(): void {
    const username = this.auth.user()?.username?.trim();
    if (username) {
      this.chat.setUsername(username);
    }
    this.chat.connect();
    if (this.isExpanded) {
      this.chatState.markAsRead();
    }
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.chat.disconnect();
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.openMenu()) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      this.closeMenu();
      return;
    }

    if (target.closest('.showcase-chat__dropdown')) {
      return;
    }

    this.closeMenu();
  }

  protected formatFor(msg: ChatMessage): ChatTextFormat {
    return formatFromMessage(msg);
  }

  protected textStyle(msg: ChatMessage): Record<string, string> {
    return textNgStyleForLine(this.formatFor(msg));
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  protected openSearch(): void {
    this.searchExpanded.set(true);
  }

  protected closeSearch(event?: Event): void {
    event?.preventDefault();
    if (this.searchQuery().trim()) {
      return;
    }
    this.searchExpanded.set(false);
  }

  protected dismissSendError(): void {
    this.chat.clearSendError();
  }

  protected clearChat(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!globalThis.confirm('Vider tout le chat ?')) {
      return;
    }

    void this.chat.clearChat();
    this.searchQuery.set('');
    this.searchExpanded.set(false);
  }

  protected composerTextStyle(): Record<string, string> {
    return textNgStyle(this.prefs.format());
  }

  protected roleFor(msg: ChatMessage): ChatRoleMeta {
    return chatRoleFor(msg);
  }

  protected displayAuthor(msg: ChatMessage): string {
    return formatChatDisplayName(msg.author);
  }

  protected messageTime(msg: ChatMessage): string {
    return formatChatMessageTime(msg.sentAt);
  }

  protected messageLedOnline(msg: ChatMessage): boolean {
    if (msg.self) {
      return this.chat.connected();
    }

    return !msg.id.startsWith('local-');
  }

  protected lineNgClass(msg: ChatMessage): Record<string, boolean> {
    const format = this.formatFor(msg);
    return {
      'showcase-chat__line': true,
      'showcase-chat__line--self': !!msg.self,
      [`showcase-chat__line--font-${format.fontKey}`]: true,
    };
  }

  protected lineStyle(msg: ChatMessage): Record<string, string> {
    return chatLineGradientStyle(msg.id);
  }

  protected composerBubbleClass(): Record<string, boolean> {
    const format = this.prefs.format();
    return {
      'showcase-chat__composer-inner': true,
      [`showcase-chat__bubble--font-${format.fontKey}`]: true,
      [`showcase-chat__bubble--style-${format.styleKey}`]: true,
    };
  }

  protected isMenuOpen(id: ChatMenuId): boolean {
    return id !== null && this.openMenu() === id;
  }

  protected toggleMenu(event: Event, id: ChatMenuId): void {
    event.preventDefault();
    event.stopPropagation();

    const next = this.openMenu() === id ? null : id;
    this.openMenu.set(next);
  }

  protected closeMenu(): void {
    this.openMenu.set(null);
  }

  protected stopMenuClick(event: Event): void {
    event.stopPropagation();
  }

  protected onFontChange(event: Event): void {
    this.prefs.setFont((event.target as HTMLSelectElement).value as ChatFontKey);
  }

  protected pickFontColor(value: string, event: Event): void {
    event.stopPropagation();
    this.prefs.patchFormat({ fontColor: value });
  }

  protected pickHighlight(value: string, event: Event): void {
    event.stopPropagation();
    this.prefs.patchFormat({ highlightColor: value });
  }

  protected clearHighlight(event: Event): void {
    event.stopPropagation();
    this.prefs.patchFormat({ highlightColor: 'transparent' });
  }

  protected refreshMessages(): void {
    void this.chatState.refreshMessages();
  }

  @HostListener(`window:${SHOWCASE_REFRESH_EVENT}`, ['$event'])
  onShowcaseRefresh(event: Event): void {
    if (refreshEventMatchesTab(event, 'rv23')) {
      this.refreshMessages();
    }
  }

  protected refreshAriaLabel(): string {
    return this.chatState.refreshing() ? 'Actualisation du chat…' : 'Actualiser le chat';
  }

  protected onCustomFontColor(event: Event): void {
    event.stopPropagation();
    const value = (event.target as HTMLInputElement).value;
    this.prefs.patchFormat({ fontColor: value });
  }

  protected onComposerSubmit(event: Event): void {
    event.preventDefault();
    this.sendMessage();
  }

  protected setPostMode(anonymous: boolean, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (anonymous && !this.auth.promptLogin()) {
      this.chat.setSendError('Connectez-vous pour poster en Anonymous.');
      return;
    }

    this.postAsAnonymous.set(anonymous);
    this.chat.clearSendError();
  }

  protected togglePostAsAnonymous(event?: Event): void {
    this.setPostMode(!this.postAsAnonymous(), event);
  }

  protected sendMessage(): void {
    if (!this.auth.promptLogin() || !this.auth.isAuthenticated()) {
      this.postAsAnonymous.set(false);
      this.chat.setSendError('Connectez-vous pour envoyer un message.');
      return;
    }

    if (this.messageControl.invalid) {
      return;
    }

    const text = this.messageControl.value.trim();
    if (!text) {
      return;
    }

    const asAnonymous = this.postAsAnonymous();
    if (asAnonymous) {
      this.chat.sendMessage(text, { anonymous: true, author: CHAT_ANONYMOUS_AUTHOR });
    } else {
      const username = this.auth.user()?.username?.trim();
      if (!username) {
        this.chat.setSendError('Connectez-vous pour envoyer un message.');
        return;
      }
      this.chat.setUsername(username);
      this.chat.sendMessage(text, { anonymous: false, author: username });
    }

    this.messageControl.reset();
    queueMicrotask(() => this.scrollToBottom());
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  protected isTransparentHighlight(value: string): boolean {
    return value === 'transparent';
  }

  private scrollToBottom(): void {
    const list = this.messagesList?.nativeElement;
    if (!list) {
      return;
    }
    list.scrollTop = list.scrollHeight;
  }
}
