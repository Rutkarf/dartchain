import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  R4V3_FAQ_CATEGORIES,
  r4v3FaqCategoryIcon,
  r4v3FaqCategoryLabel,
} from '../../core/constants/r4v3-faq.constants';
import { R4v3FaqEntry } from '../../core/models/r4v3-faq.model';
import { R4v3HubDrawerPayload } from '../../core/models/r4v3-hub.model';
import { AuthService } from '../../core/services/auth.service';
import { R4v3CommunityFaqService } from '../../core/services/r4v3-community-faq.service';
import {
  R4v3FaqCategoryFilter,
  R4v3FaqStateService,
} from '../../core/services/r4v3-faq-state.service';
import { FocusTrapDirective } from '../../core/directives/focus-trap.directive';
import { copyTextToClipboard } from '../../core/utils/clipboard.util';

@Component({
  selector: 'app-showcase-r4v3-hub-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, FocusTrapDirective],
  templateUrl: './showcase-r4v3-hub-drawer.html',
  styleUrls: ['./showcase-r4v3-hub-drawer.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseR4v3HubDrawerComponent implements OnDestroy {
  private readonly drawerPanel = viewChild<ElementRef<HTMLElement>>('drawerPanel');
  private copyResetTimer: number | null = null;
  private successResetTimer: number | null = null;

  @HostBinding('class.r4v3-hub-drawer-host--open')
  get drawerHostOpen(): boolean {
    return this.payload() != null;
  }

  private readonly faq = inject(R4v3FaqStateService);
  private readonly community = inject(R4v3CommunityFaqService);
  private readonly auth = inject(AuthService);

  readonly copied = signal(false);
  readonly copyFailed = signal(false);
  readonly formSuccess = signal(false);
  readonly wikiSearchQuery = signal('');
  readonly askTitle = signal('');
  readonly askBody = signal('');
  readonly askCategory = signal('');

  readonly wikiCategories = R4V3_FAQ_CATEGORIES;
  readonly wikiCategoryOptions = [
    { id: '', label: 'Sans catégorie' },
    ...R4V3_FAQ_CATEGORIES.map((category) => ({ id: category.id, label: category.label })),
  ];

  readonly payload = input<R4v3HubDrawerPayload | null>(null);
  readonly showBackToWiki = input(false);
  readonly canPrev = input(false);
  readonly canNext = input(false);
  readonly itemIndex = input(-1);
  readonly itemTotal = input(0);

  readonly closeDrawer = output<void>();
  readonly backToWiki = output<void>();
  readonly navigatePrev = output<void>();
  readonly navigateNext = output<void>();
  readonly runAction = output<R4v3HubDrawerPayload>();
  readonly selectOfficialEntry = output<R4v3FaqEntry>();
  readonly communityQuestionSubmitted = output<void>();

  readonly communitySubmitMessage = this.community.submitMessage;
  readonly isAuthenticated = this.auth.isAuthenticated;

  readonly filteredWikiEntries = computed(() => {
    const query = this.wikiSearchQuery().trim().toLowerCase();
    const entries = this.faq.filteredEntries();

    if (!query) {
      return entries;
    }

    return entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) ||
        entry.summary.toLowerCase().includes(query) ||
        entry.body.toLowerCase().includes(query)
    );
  });

  readonly titleLength = computed(() => this.askTitle().trim().length);

  readonly canSubmitForm = computed(() => this.askTitle().trim().length >= 8);

  readonly communityQuestionLive = computed(() => {
    const item = this.payload();
    if (item?.kind !== 'community') {
      return null;
    }

    return (
      this.community.questions().find((question) => question.id === item.question.id) ??
      item.question
    );
  });

  readonly positionLabel = computed(() => {
    const index = this.itemIndex();
    const total = this.itemTotal();
    if (index < 0 || total <= 0) {
      return '';
    }
    return `${index + 1}/${total}`;
  });

  readonly drawerTitle = computed(() => {
    const item = this.payload();
    if (!item) {
      return '';
    }

    switch (item.kind) {
      case 'pillar':
        return item.pillar.drawerTitle;
      case 'faq':
        return item.entry.title;
      case 'community':
        return item.question.title;
      case 'official-wiki':
        return 'Wiki';
      case 'community-form':
        return 'Proposer une question';
    }
  });

  readonly drawerEyebrow = computed(() => {
    const item = this.payload();
    if (!item) {
      return '';
    }

    switch (item.kind) {
      case 'pillar':
        return 'Pilier R4V3';
      case 'faq':
        return r4v3FaqCategoryLabel(item.entry.categoryId);
      case 'community':
        return item.question.status === 'open' ? 'Communauté · Ouvert' : 'Communauté';
      case 'official-wiki':
        return 'Wiki R4V3';
      case 'community-form':
        return 'FAQ communautaire · DEX';
    }
  });

  readonly drawerIcon = computed(() => {
    const item = this.payload();
    if (!item) {
      return '◆';
    }

    switch (item.kind) {
      case 'pillar':
        return item.pillar.icon;
      case 'faq':
        return r4v3FaqCategoryIcon(item.entry.categoryId);
      case 'community':
        return '?';
      case 'official-wiki':
        return '◆';
      case 'community-form':
        return '✦';
    }
  });

  readonly showNavigation = computed(() => {
    const item = this.payload();
    return item != null && ['pillar', 'faq', 'community'].includes(item.kind);
  });

  readonly showFooterActions = computed(() => {
    const item = this.payload();
    return item != null && item.kind !== 'official-wiki' && item.kind !== 'community-form';
  });

  constructor() {
    effect(() => {
      const item = this.payload();
      if (item?.kind === 'community-form') {
        this.askTitle.set('');
        this.askBody.set('');
        this.askCategory.set('');
        this.formSuccess.set(false);
      }

      if (item?.kind === 'official-wiki') {
        this.wikiSearchQuery.set('');
      }

      if (item) {
        this.copied.set(false);
        this.copyFailed.set(false);
        queueMicrotask(() => this.drawerPanel()?.nativeElement.focus());
      }
    });
  }

  ngOnDestroy(): void {
    if (this.copyResetTimer !== null) {
      window.clearTimeout(this.copyResetTimer);
    }
    if (this.successResetTimer !== null) {
      window.clearTimeout(this.successResetTimer);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.payload()) {
      this.closeDrawer.emit();
    }
  }

  @HostListener('document:keydown.arrowleft')
  onArrowLeft(): void {
    if (this.payload() && this.canPrev()) {
      this.navigatePrev.emit();
    }
  }

  @HostListener('document:keydown.arrowright')
  onArrowRight(): void {
    if (this.payload() && this.canNext()) {
      this.navigateNext.emit();
    }
  }

  protected drawerShellClass(kind: R4v3HubDrawerPayload['kind']): string {
    switch (kind) {
      case 'pillar':
        return 'r4v3-hub-drawer--pillar';
      case 'official-wiki':
        return 'r4v3-hub-drawer--wiki';
      case 'community-form':
        return 'r4v3-hub-drawer--community';
      default:
        return 'r4v3-hub-drawer--detail';
    }
  }

  protected dismiss(): void {
    this.closeDrawer.emit();
  }

  protected voteCommunityQuestion(direction: 'UP' | 'DOWN'): void {
    const question = this.communityQuestionLive();
    if (!question) {
      return;
    }

    this.community.voteQuestion(question.id, direction);
  }

  protected onWikiSearchInput(value: string): void {
    this.wikiSearchQuery.set(value);
  }

  protected wikiCategoryIcon(categoryId: R4v3FaqEntry['categoryId']): string {
    return r4v3FaqCategoryIcon(categoryId);
  }

  protected isWikiCategoryActive(categoryId: R4v3FaqCategoryFilter): boolean {
    return this.faq.categoryFilter() === categoryId;
  }

  protected selectWikiCategory(categoryId: R4v3FaqCategoryFilter): void {
    this.faq.setCategoryFilter(categoryId);
  }

  protected openWikiEntry(entry: R4v3FaqEntry): void {
    this.selectOfficialEntry.emit(entry);
  }

  protected promptLoginForQuestion(): void {
    this.auth.openDrawer('login');
  }

  protected submitCommunityForm(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.auth.isAuthenticated()) {
      this.promptLoginForQuestion();
      return;
    }

    if (!this.canSubmitForm()) {
      return;
    }

    const title = this.askTitle().trim();
    let body = this.askBody().trim();
    const categoryLabel =
      this.wikiCategoryOptions.find((option) => option.id === this.askCategory())?.label ?? '';

    if (this.askCategory() && categoryLabel && categoryLabel !== 'Sans catégorie') {
      body = body ? `[${categoryLabel}] ${body}` : `[${categoryLabel}] ${title}`;
    }

    if (body.length < 12) {
      body = body || title;
    }

    const ok = this.community.askQuestion(title, body);
    if (!ok) {
      return;
    }

    this.formSuccess.set(true);
    this.askTitle.set('');
    this.askBody.set('');
    this.askCategory.set('');
    this.communityQuestionSubmitted.emit();

    if (this.successResetTimer !== null) {
      window.clearTimeout(this.successResetTimer);
    }
    this.successResetTimer = window.setTimeout(() => {
      this.formSuccess.set(false);
      this.successResetTimer = null;
    }, 4_500);
  }

  protected actionLabel(): string | null {
    const item = this.payload();
    if (!item || item.kind !== 'faq' || !item.entry.actionType || item.entry.actionType === 'NONE') {
      return null;
    }

    return item.entry.actionLabel ?? 'Action';
  }

  protected copyButtonLabel(): string {
    if (this.copied()) {
      return 'Copié ✓';
    }
    if (this.copyFailed()) {
      return 'Échec';
    }
    return 'Copier';
  }

  protected buildCopyText(): string {
    const item = this.payload();
    if (!item) {
      return '';
    }

    switch (item.kind) {
      case 'pillar':
        return [
          item.pillar.drawerTitle,
          item.pillar.drawerSummary,
          ...item.pillar.sections.map((s) => `${s.title}\n${s.body}`),
        ].join('\n\n');
      case 'faq':
        return `${item.entry.title}\n\n${item.entry.body}`;
      case 'community': {
        const q = item.question;
        const answers = q.answers.map((a) => `${a.authorName}: ${a.body}`).join('\n\n');
        return `${q.title}\n\n${q.body}${answers ? `\n\n---\n${answers}` : ''}`;
      }
      case 'official-wiki':
      case 'community-form':
        return '';
    }
  }

  protected async onCopy(event: Event): Promise<void> {
    event.stopPropagation();

    const ok = await copyTextToClipboard(this.buildCopyText());

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

  protected onPrimaryAction(): void {
    const item = this.payload();
    if (item) {
      this.runAction.emit(item);
    }
  }
}
