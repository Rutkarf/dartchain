import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

import { R4V3_HUB_PILLARS } from '../../core/constants/r4v3-hub-pillars.constants';
import {
  r4v3FaqCategoryIcon,
  r4v3FaqCategoryLabel,
} from '../../core/constants/r4v3-faq.constants';
import { R4v3FaqEntry } from '../../core/models/r4v3-faq.model';
import {
  CommunityFaqQuestion,
  R4v3HubDrawerPayload,
  R4v3HubPillar,
  R4v3SystemStatus,
} from '../../core/models/r4v3-hub.model';
import { openR4v3Whitepaper } from '../../core/utils/r4v3-whitepaper.util';
import { AuthService } from '../../core/services/auth.service';
import { BrandCryptoSelectionService } from '../../core/services/brand-crypto-selection.service';
import { DockWalletStateService } from '../../core/services/dock-wallet-state.service';
import { R4v3CommunityFaqService } from '../../core/services/r4v3-community-faq.service';
import {
  R4v3FaqCategoryFilter,
  R4v3FaqStateService,
} from '../../core/services/r4v3-faq-state.service';
import { ShellFeedbackService } from '../../core/services/shell-feedback.service';
import { ShowcaseNavigationService } from '../../core/services/showcase-navigation.service';
import { ShowcaseR4v3StateService } from '../../core/services/showcase-r4v3-state.service';
import { ShowcaseHubUiService } from '../../core/services/showcase-hub-ui.service';
import { ShowcaseR4v3HubDrawerComponent } from './showcase-r4v3-hub-drawer';

@Component({
  selector: 'app-showcase-r4v3',
  standalone: true,
  imports: [CommonModule, ShowcaseR4v3HubDrawerComponent],
  templateUrl: './showcase-r4v3.html',
  styleUrls: ['./showcase-r4v3.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseR4v3Component {
  @Input() isExpanded = true;

  @HostBinding('class.is-r4v3')
  readonly isR4v3Host = true;

  @HostBinding('class.is-expanded')
  get isExpandedClass(): boolean {
    return this.isExpanded;
  }

  @HostBinding('class.is-collapsed')
  get isCollapsedClass(): boolean {
    return !this.isExpanded;
  }

  protected readonly faq = inject(R4v3FaqStateService);
  protected readonly community = inject(R4v3CommunityFaqService);
  protected readonly state = inject(ShowcaseR4v3StateService);
  protected readonly auth = inject(AuthService);
  private readonly nav = inject(ShowcaseNavigationService);
  private readonly brandCrypto = inject(BrandCryptoSelectionService);
  private readonly walletState = inject(DockWalletStateService);
  private readonly shell = inject(ShellFeedbackService);
  private readonly hubUi = inject(ShowcaseHubUiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly contentPanel = viewChild<ElementRef<HTMLElement>>('contentPanel');
  private lastBrandTapAt = 0;

  readonly pillars = R4V3_HUB_PILLARS;
  readonly drawerPayload = signal<R4v3HubDrawerPayload | null>(null);
  readonly drawerOpenedFromWiki = signal(false);
  readonly keyboardFocusIndex = signal(-1);
  readonly keyboardFocusZone = signal<'official' | 'community'>('official');
  readonly whitepaperLoading = signal(false);
  readonly whitepaperFeedback = signal('');

  readonly panel = this.state.panel;
  readonly loading = this.state.loading;
  readonly refreshing = this.state.refreshing;
  readonly error = this.state.error;
  readonly refreshPulse = this.state.refreshPulse;
  readonly systemStatus = this.state.systemStatus;
  readonly pegDisplayLabel = this.state.pegDisplayLabel;
  readonly liveValueLabel = this.state.liveValueLabel;
  readonly liveChangeLabel = this.state.liveChangeLabel;
  readonly liveChangePositive = this.state.liveChangePositive;

  readonly filteredEntries = this.faq.filteredEntries;
  readonly categories = this.faq.categories;
  readonly communityQuestions = this.community.filteredQuestions;

  readonly faqCountLabel = computed(() => `${this.faq.totalCount()} officielles`);
  readonly communityCountLabel = computed(
    () => `${this.communityQuestions().length} · ${this.community.openCount()} ouvertes`
  );

  readonly drawerNavIndex = computed(() => {
    const payload = this.drawerPayload();
    if (!payload) {
      return -1;
    }

    switch (payload.kind) {
      case 'pillar':
        return this.pillars.findIndex((p) => p.id === payload.pillar.id);
      case 'faq':
        return this.filteredEntries().findIndex((e) => e.id === payload.entry.id);
      case 'community':
        return this.communityQuestions().findIndex((q) => q.id === payload.question.id);
      case 'official-wiki':
      case 'community-form':
        return -1;
    }
  });

  readonly drawerNavTotal = computed(() => {
    const payload = this.drawerPayload();
    if (!payload) {
      return 0;
    }

    switch (payload.kind) {
      case 'pillar':
        return this.pillars.length;
      case 'faq':
        return this.filteredEntries().length;
      case 'community':
        return this.communityQuestions().length;
      case 'official-wiki':
      case 'community-form':
        return 0;
    }
  });

  readonly canNavigatePrev = computed(() => this.drawerNavIndex() > 0);
  readonly canNavigateNext = computed(() => {
    const index = this.drawerNavIndex();
    return index >= 0 && index < this.drawerNavTotal() - 1;
  });

  readonly liveAriaLabel = computed(() => {
    const status = this.systemStatusLabel(this.systemStatus());
    return `${this.pegDisplayLabel()} ${this.liveValueLabel()} ${this.liveChangeLabel()} · ${status}`;
  });

  readonly headerRefreshing = computed(() => this.loading() || this.refreshing() || this.community.refreshing());

  constructor() {
    if (!this.state.panel() && !this.state.loading()) {
      this.state.load(false);
    }

    this.community.load(false);
    this.walletState.load().catch(() => undefined);

    this.hubUi.r4v3SwapFocusRequested$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        window.setTimeout(() => this.focusSwapInline(), 120);
      });

    interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.state.load(false);
        this.community.load(false);
        void this.walletState.load();
      });
  }

  protected refresh(): void {
    this.state.refresh();
    this.community.load(false);
    void this.walletState.load();
  }

  protected refreshAriaLabel(): string {
    return this.headerRefreshing() ? 'Actualisation du hub R4V3…' : 'Actualiser le hub R4V3';
  }

  protected systemStatusClass(status: R4v3SystemStatus): string {
    return `showcase-r4v3__status-led--${status}`;
  }

  protected systemStatusLabel(status: R4v3SystemStatus): string {
    switch (status) {
      case 'ok':
        return 'Système opérationnel';
      case 'degraded':
        return 'Maintenance ou latence';
      case 'incident':
        return 'Incident réseau';
    }
  }

  protected categoryLabel(categoryId: R4v3FaqEntry['categoryId']): string {
    return r4v3FaqCategoryLabel(categoryId);
  }

  protected categoryIcon(categoryId: R4v3FaqEntry['categoryId']): string {
    return r4v3FaqCategoryIcon(categoryId);
  }

  protected isCategoryActive(categoryId: R4v3FaqCategoryFilter): boolean {
    return this.faq.categoryFilter() === categoryId;
  }

  protected selectCategory(categoryId: R4v3FaqCategoryFilter): void {
    this.faq.setCategoryFilter(categoryId);
    this.keyboardFocusIndex.set(-1);
  }

  protected pillarAccentClass(pillar: R4v3HubPillar): string {
    return `showcase-r4v3__pillar--${pillar.accent}`;
  }

  protected async openWhitepaper(event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();

    if (this.whitepaperLoading()) {
      return;
    }

    this.whitepaperLoading.set(true);
    this.whitepaperFeedback.set('');

    const result = await openR4v3Whitepaper();
    this.whitepaperLoading.set(false);

    if (!result.ok) {
      this.whitepaperFeedback.set(result.message ?? 'White paper indisponible');
      window.setTimeout(() => this.whitepaperFeedback.set(''), 4_000);
    }
  }

  protected focusSwapInline(): void {
    window.dispatchEvent(new CustomEvent('exchange-panel-focus'));
  }

  protected onBrandTap(event: Event): void {
    const now = Date.now();
    if (now - this.lastBrandTapAt < 350) {
      event.preventDefault();
      event.stopPropagation();
      this.shell.toggleR4v3Scene();
      this.lastBrandTapAt = 0;
      return;
    }

    this.lastBrandTapAt = now;
  }

  protected onSearchInput(value: string): void {
    this.faq.onSearchInput(value);
    this.keyboardFocusIndex.set(-1);
    this.keyboardFocusZone.set('official');
  }

  protected onCommunitySearchInput(value: string): void {
    this.community.onSearchInput(value);
    this.keyboardFocusIndex.set(-1);
    this.keyboardFocusZone.set('community');
  }

  protected openOfficialWiki(): void {
    this.drawerOpenedFromWiki.set(false);
    this.drawerPayload.set({ kind: 'official-wiki' });
  }

  protected openCommunityFormDrawer(): void {
    this.drawerOpenedFromWiki.set(false);
    this.drawerPayload.set({ kind: 'community-form' });
  }

  protected backToOfficialWiki(): void {
    this.drawerOpenedFromWiki.set(false);
    this.drawerPayload.set({ kind: 'official-wiki' });
  }

  protected onCommunityQuestionSubmitted(): void {
    this.community.refreshLatestTicker();
  }

  protected openPillar(pillar: R4v3HubPillar): void {
    this.drawerPayload.set({ kind: 'pillar', pillar });
  }

  protected openEntry(entry: R4v3FaqEntry, fromWiki = false): void {
    this.drawerOpenedFromWiki.set(fromWiki);
    this.drawerPayload.set({ kind: 'faq', entry });
    this.keyboardFocusZone.set('official');
    this.keyboardFocusIndex.set(
      this.filteredEntries().findIndex((item) => item.id === entry.id)
    );
  }

  protected openCommunityQuestion(question: CommunityFaqQuestion): void {
    this.community.markRead(question.id);
    this.drawerPayload.set({ kind: 'community', question });
    this.keyboardFocusZone.set('community');
    this.keyboardFocusIndex.set(
      this.communityQuestions().findIndex((item) => item.id === question.id)
    );
  }

  protected closeDrawer(): void {
    this.drawerPayload.set(null);
    this.drawerOpenedFromWiki.set(false);
  }

  protected navigatePrev(): void {
    const payload = this.drawerPayload();
    const index = this.drawerNavIndex();
    if (!payload || index <= 0) {
      return;
    }

    switch (payload.kind) {
      case 'pillar':
        this.openPillar(this.pillars[index - 1]);
        break;
      case 'faq':
        this.openEntry(this.filteredEntries()[index - 1]);
        break;
      case 'community':
        this.openCommunityQuestion(this.communityQuestions()[index - 1]);
        break;
    }
  }

  protected navigateNext(): void {
    const payload = this.drawerPayload();
    const index = this.drawerNavIndex();
    if (!payload || index < 0 || index >= this.drawerNavTotal() - 1) {
      return;
    }

    switch (payload.kind) {
      case 'pillar':
        this.openPillar(this.pillars[index + 1]);
        break;
      case 'faq':
        this.openEntry(this.filteredEntries()[index + 1]);
        break;
      case 'community':
        this.openCommunityQuestion(this.communityQuestions()[index + 1]);
        break;
    }
  }

  protected runDrawerAction(payload: R4v3HubDrawerPayload): void {
    if (payload.kind !== 'faq') {
      return;
    }

    const entry = payload.entry;
    switch (entry.actionType) {
      case 'OPEN_FAUCET':
        this.nav.dispatchNewsAction('OPEN_FAUCET', null);
        break;
      case 'OPEN_SWAP':
        this.brandCrypto.selectFromRatePanel('R4V3', null);
        this.focusSwapInline();
        break;
      case 'OPEN_WHITEPAPER':
        void this.openWhitepaper(new Event('click'));
        break;
      default:
        break;
    }

    this.closeDrawer();
  }

  protected voteCommunityQuestion(
    question: CommunityFaqQuestion,
    direction: 'UP' | 'DOWN',
    event: Event
  ): void {
    event.preventDefault();
    event.stopPropagation();
    this.community.voteQuestion(question.id, direction);
  }

  protected promptLoginForQuestion(): void {
    this.auth.openDrawer('login');
  }

  protected communityStatusLabel(question: CommunityFaqQuestion): string {
    if (question.status === 'pinned') {
      return 'Épinglé';
    }
    if (question.pendingStaffReview) {
      return 'En revue';
    }
    if (question.status === 'open') {
      return 'Ouvert';
    }
    return 'Répondu';
  }

  protected isKeyboardFocused(index: number, zone: 'official' | 'community'): boolean {
    return !this.drawerPayload() && this.keyboardFocusZone() === zone && this.keyboardFocusIndex() === index;
  }

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.isExpanded) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    if (this.drawerPayload()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeDrawer();
      }
      return;
    }

    const navCount = this.getNavButtons().length;
    if (navCount === 0) {
      return;
    }

    let index = this.keyboardFocusIndex();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        index = index < 0 ? 0 : Math.min(index + 1, navCount - 1);
        this.keyboardFocusIndex.set(index);
        this.scrollToNavIndex(index);
        break;
      case 'ArrowUp':
        event.preventDefault();
        index = index < 0 ? 0 : Math.max(index - 1, 0);
        this.keyboardFocusIndex.set(index);
        this.scrollToNavIndex(index);
        break;
      case 'Enter':
        if (index >= 0 && index < navCount) {
          event.preventDefault();
          this.getNavButtons()[index]?.click();
        }
        break;
      default:
        break;
    }
  }

  private getNavButtons(): HTMLElement[] {
    const panel = this.contentPanel()?.nativeElement;
    if (!panel) {
      return [];
    }

    const zone = this.keyboardFocusZone();
    const selector =
      zone === 'community' ? '.showcase-r4v3__community-btn' : '.showcase-r4v3__faq-btn';

    return Array.from(panel.querySelectorAll(selector)) as HTMLElement[];
  }

  private scrollToNavIndex(index: number): void {
    queueMicrotask(() => {
      this.getNavButtons()[index]?.focus({ preventScroll: true });
    });
  }
}
