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
import { ChatMessage } from '../../core/models/showcase.model';
import {
  CHAT_FORMAT_STYLE_PRESETS,
  CHAT_THEME_COLOR_GRID,
  CHAT_THEME_HIGHLIGHT_GRID,
  ChatTextFormat,
  formatFromMessage,
  textNgStyle,
  textNgStyleForLine,
} from '../../core/constants/chat-format.constants';
import {
  CHAT_BUBBLE_STYLE_OPTIONS,
  CHAT_FONT_OPTIONS,
  ChatFontKey,
} from '../../core/constants/chat-style.constants';
import {
  formatChatDisplayName,
  formatChatMessageTime,
} from '../../core/constants/chat-display.constants';
import { ChatRoleMeta, chatRoleFor } from '../../core/constants/chat-role.constants';
import { ChatStylePreferencesService } from '../../core/services/chat-style-preferences.service';
import { AuthService } from '../../core/services/auth.service';
import { ShowcaseChatService } from '../../core/services/showcase-chat.service';
import { ShowcaseChatStateService } from '../../core/services/showcase-chat-state.service';

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

  @ViewChild('messagesEnd') messagesEnd?: ElementRef<HTMLDivElement>;

  readonly fontOptions = CHAT_FONT_OPTIONS;
  readonly fontColorGrid = CHAT_THEME_COLOR_GRID;
  readonly highlightGrid = CHAT_THEME_HIGHLIGHT_GRID;
  readonly stylePresets = CHAT_FORMAT_STYLE_PRESETS;

  readonly messages = this.chat.messages;
  readonly openMenu = signal<ChatMenuId>(null);
  readonly searchQuery = signal('');
  readonly searchExpanded = signal(false);

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

  readonly sendButtonLabel = computed(() =>
    this.auth.isAuthenticated() ? 'Envoyer' : 'CONNEXION REQUISE'
  );

  ngOnInit(): void {
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

  protected applyStylePreset(patch: Partial<ChatTextFormat>): void {
    this.prefs.patchFormat(patch);
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

  protected refreshToolbar(): void {
    this.closeMenu();
    this.prefs.resetFormat();
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

  protected sendMessage(): void {
    if (!this.auth.promptLogin()) {
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

    this.chat.sendMessage(text);
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

  protected bubbleStylePreview(): string {
    const key = this.prefs.bubbleStyleKey();
    return CHAT_BUBBLE_STYLE_OPTIONS.find((o) => o.key === key)?.preview ?? '◆';
  }

  protected bubbleStyleTitle(): string {
    const key = this.prefs.bubbleStyleKey();
    const opt = CHAT_BUBBLE_STYLE_OPTIONS.find((o) => o.key === key);
    return opt ? `Style de message : ${opt.label}` : 'Style de message';
  }

  private scrollToBottom(): void {
    const element = this.messagesEnd?.nativeElement;
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }
}
