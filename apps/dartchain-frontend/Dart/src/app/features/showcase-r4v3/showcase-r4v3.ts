import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, take } from 'rxjs';

import { NewsItem, R4v3TokenQuote } from '../../core/models/showcase.model';
import {
  EXCHANGE_LAUNCHPAD_SWAP_TOKENS,
  EXCHANGE_NATIVE_TOKEN,
} from '../../core/constants/exchange-launchpad.constants';
import { AuthService } from '../../core/services/auth.service';
import { BlockchainApiService } from '../../core/services/blockchain-api.service';
import { BrandCryptoSelectionService } from '../../core/services/brand-crypto-selection.service';
import { DockWalletStateService } from '../../core/services/dock-wallet-state.service';
import { formatR4v3Amount } from '../../core/utils/r4v3-amount.util';
import { QuestsPanelService } from '../quests-panel/quests-panel.service';
import { QuestsProgressService } from '../../core/services/quests-progress.service';
import { ShellFeedbackService } from '../../core/services/shell-feedback.service';
import { ShowcaseApiService } from '../../core/services/showcase-api.service';
import { ShowcaseNavigationService } from '../../core/services/showcase-navigation.service';
import { ShowcaseNewsStateService } from '../../core/services/showcase-news-state.service';
import { ShowcaseR4v3StateService } from '../../core/services/showcase-r4v3-state.service';
import { WalletSessionService } from '../../core/services/wallet-session.service';
import { DockNavigationService } from '../../core/services/dock-navigation.service';
import { ShowcaseNewsDrawerComponent } from '../showcase-news/showcase-news-drawer';

export type R4v3PinKind = 'quest' | 'quote' | 'wallet' | 'swap' | 'token';

export interface R4v3PinPanelState {
  kind: R4v3PinKind;
  token?: R4v3TokenQuote;
}

@Component({
  selector: 'app-showcase-r4v3',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ShowcaseNewsDrawerComponent],
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

  protected readonly state = inject(ShowcaseR4v3StateService);
  private readonly api = inject(ShowcaseApiService);
  private readonly blockchain = inject(BlockchainApiService);
  private readonly nav = inject(ShowcaseNavigationService);
  private readonly dockNav = inject(DockNavigationService);
  private readonly newsState = inject(ShowcaseNewsStateService);
  private readonly brandCrypto = inject(BrandCryptoSelectionService);
  private readonly walletState = inject(DockWalletStateService);
  private readonly walletSession = inject(WalletSessionService);
  private readonly auth = inject(AuthService);
  private readonly quests = inject(QuestsPanelService);
  private readonly questProgress = inject(QuestsProgressService);
  private readonly shell = inject(ShellFeedbackService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  private readonly contentPanel = viewChild<ElementRef<HTMLElement>>('contentPanel');
  private readonly swapFooter = viewChild<ElementRef<HTMLElement>>('swapFooter');
  private readonly pinPanel = viewChild<ElementRef<HTMLElement>>('pinPanel');
  private lastBrandTapAt = 0;

  readonly selectedItem = signal<NewsItem | null>(null);
  readonly detailItem = signal<NewsItem | null>(null);
  readonly detailLoading = signal(false);
  readonly keyboardFocusIndex = signal(-1);
  readonly swapDirection = signal<'buy' | 'sell'>('buy');
  readonly swapCounterToken = signal<string>(EXCHANGE_LAUNCHPAD_SWAP_TOKENS[0]);
  readonly fromBalance = signal(0);
  readonly swapping = signal(false);
  readonly swapMessage = signal('');
  readonly swapError = signal(false);
  readonly activePin = signal<R4v3PinPanelState | null>(null);

  readonly panel = this.state.panel;
  readonly launchTokens = this.state.launchTokens;
  readonly swapStats = this.state.swapStats;
  readonly ratesLatencyMs = this.state.ratesLatencyMs;
  readonly loading = this.state.loading;
  readonly loadingMore = this.state.loadingMore;
  readonly error = this.state.error;
  readonly filteredItems = this.state.filteredItems;
  readonly refreshPulse = this.state.refreshPulse;

  readonly walletBalanceLabel = computed(() => {
    if (!this.walletState.hasWallet()) {
      return '—';
    }

    const balance = this.walletState.balance();
    return balance !== null ? formatR4v3Amount(balance) : '…';
  });

  readonly missionProgress = computed(() => this.quests.missionProgress());
  readonly swapQuestLabel = computed(() => {
    const task = this.quests.snapshot().tasks['swap-tokens'];
    if (!task) {
      return '0/10 swap';
    }

    return `${Math.min(task.progress, 10)}/10 swap`;
  });

  readonly swapForm = this.fb.nonNullable.group({
    amount: ['', [Validators.required]],
  });

  readonly selectedIndex = computed(() => {
    const selected = this.selectedItem();
    if (!selected) {
      return -1;
    }

    return this.filteredItems().findIndex((item) => item.id === selected.id);
  });

  readonly canNavigatePrev = computed(() => this.selectedIndex() > 0);
  readonly canNavigateNext = computed(() => {
    const index = this.selectedIndex();
    return index >= 0 && index < this.filteredItems().length - 1;
  });

  readonly swapFromToken = computed(() =>
    this.swapDirection() === 'buy' ? this.swapCounterToken() : EXCHANGE_NATIVE_TOKEN
  );

  readonly swapToToken = computed(() =>
    this.swapDirection() === 'buy' ? EXCHANGE_NATIVE_TOKEN : this.swapCounterToken()
  );

  readonly liveAriaLabel = computed(() => {
    const quote = this.panel();
    if (!quote) {
      return 'R4V3 — double tap pour la scène 3D';
    }

    return `R4V3 ${quote.value} ${quote.change} — double tap pour la scène 3D`;
  });

  readonly launchTokenOptions = computed(() => {
    const fromApi = this.launchTokens().map((token) => token.symbol);
    const merged = new Set([...EXCHANGE_LAUNCHPAD_SWAP_TOKENS, ...fromApi]);
    return [...merged];
  });

  protected pinRowCount = computed(() => {
    let count = 3;
    if (this.swapStats()) {
      count += 1;
    }
    return count;
  });

  readonly newsOffset = computed(() => this.pinRowCount() + this.launchTokens().length);

  constructor() {
    effect(() => {
      if (this.activePin()) {
        queueMicrotask(() => this.pinPanel()?.nativeElement.focus());
      }
    });

    if (this.state.items().length === 0 && !this.state.loading()) {
      this.state.load();
    }

    this.walletState.load().catch(() => undefined);
    this.loadSwapPanel();

    this.state.refresh$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.state.load());

    interval(15_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.pollNews());

    interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.state.load(false);
        void this.walletState.load();
      });

    window.addEventListener('naivechain-refresh', this.onChainRefresh);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('naivechain-refresh', this.onChainRefresh);
    });
  }

  private readonly onChainRefresh = (): void => {
    this.state.load(false);
    this.loadSwapPanel();
    void this.walletState.load();
  };

  protected refresh(): void {
    this.state.load();
    void this.walletState.load();
    this.loadSwapPanel();
  }

  protected refreshAriaLabel(): string {
    return this.loading() ? 'Actualisation R4V3…' : 'Actualiser R4V3';
  }

  protected sourceIcon(item: NewsItem): string {
    return item.source === 'CHAIN' ? '⛓' : '✎';
  }

  protected sourceLabel(item: NewsItem): string {
    return item.source === 'CHAIN' ? 'On' : 'Edit';
  }

  protected focusSwap(): void {
    this.openPinPanel({ kind: 'swap' });
    queueMicrotask(() => {
      this.scrollIntoViewSafe(this.swapFooter()?.nativeElement, {
        behavior: 'smooth',
        block: 'nearest',
      });
      const input = this.swapFooter()?.nativeElement.querySelector(
        '.showcase-r4v3__swap-input'
      ) as HTMLInputElement | null;
      input?.focus();
    });
  }

  private scrollToBottomDock(): void {
    queueMicrotask(() => {
      this.scrollIntoViewSafe(
        document.querySelector('.app-bottom-stack') as HTMLElement | null
      );
    });
  }

  private scrollIntoViewSafe(
    element: HTMLElement | null | undefined,
    options?: ScrollIntoViewOptions
  ): void {
    if (typeof element?.scrollIntoView === 'function') {
      element.scrollIntoView(options);
    }
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

  protected openQuests(): void {
    this.openPinPanel({ kind: 'quest' });
    this.dockNav.requestTab('quests');
    this.scrollToBottomDock();
  }

  protected openWallet(): void {
    this.openPinPanel({ kind: 'wallet' });
    this.dockNav.requestTab('wallet');
    this.scrollToBottomDock();
  }

  protected openChart(): void {
    this.openPinPanel({ kind: 'quote' });
    this.brandCrypto.select(EXCHANGE_NATIVE_TOKEN);
    window.dispatchEvent(new CustomEvent('hub-rate-panel-focus'));
  }

  protected openTokenPanel(token: R4v3TokenQuote): void {
    this.openPinPanel({ kind: 'token', token });
    this.swapCounterToken.set(token.symbol);
    this.loadSwapPanel();
  }

  protected openPinPanel(state: R4v3PinPanelState): void {
    this.activePin.set(state);
    this.closeItem();
  }

  protected closePinPanel(): void {
    this.activePin.set(null);
  }

  protected pinTitle(pin: R4v3PinPanelState): string {
    switch (pin.kind) {
      case 'quest':
        return 'Quêtes';
      case 'quote':
        return 'R4V3 · Hub marché';
      case 'wallet':
        return 'Wallet';
      case 'swap':
        return 'Swap R4V3';
      case 'token':
        return pin.token?.symbol ?? 'Token';
      default:
        return 'R4V3';
    }
  }

  protected pinBody(pin: R4v3PinPanelState): string {
    switch (pin.kind) {
      case 'quest':
        return `Mission ${this.missionProgress()}% · ${this.swapQuestLabel()}. Complète les tâches pour gagner des R4V3.`;
      case 'quote': {
        const quote = this.panel();
        if (!quote) {
          return 'Cours indisponible pour le moment.';
        }
        const latency =
          this.ratesLatencyMs() !== null ? ` Latence API ${this.ratesLatencyMs()}ms.` : '';
        return `${quote.value} (${quote.change}) — graphique et paires marché.${latency}`;
      }
      case 'wallet':
        return this.walletState.hasWallet()
          ? `Solde actuel : ${this.walletBalanceLabel()} R4V3.`
          : 'Aucun wallet actif. Crée ou importe un wallet pour swap et récompenses.';
      case 'swap': {
        const stats = this.swapStats();
        if (!stats) {
          return 'Swap R4V3 ↔ launch tokens depuis le footer.';
        }
        return `${stats.swapNewsCount} swap(s) récents${stats.lastSwapSummary !== '—' ? ` · ${stats.lastSwapSummary}` : ''}.`;
      }
      case 'token':
        if (!pin.token) {
          return '';
        }
        return `${pin.token.priceVsR4v3} (${pin.token.change}) vs R4V3.`;
      default:
        return '';
    }
  }

  protected pinActionLabel(pin: R4v3PinPanelState): string {
    switch (pin.kind) {
      case 'quest':
        return 'Ouvrir quêtes';
      case 'quote':
        return 'Voir graphique';
      case 'wallet':
        return 'Ouvrir wallet';
      case 'swap':
        return 'Swap maintenant';
      case 'token':
        return 'Configurer swap';
      default:
        return 'Ouvrir';
    }
  }

  protected runPinAction(): void {
    const pin = this.activePin();
    if (!pin) {
      return;
    }

    switch (pin.kind) {
      case 'quest':
        this.dockNav.requestTab('quests');
        this.closePinPanel();
        this.scrollToBottomDock();
        break;
      case 'quote':
        this.brandCrypto.select(EXCHANGE_NATIVE_TOKEN);
        window.dispatchEvent(new CustomEvent('hub-rate-panel-focus'));
        this.closePinPanel();
        break;
      case 'wallet':
        this.dockNav.requestTab('wallet');
        this.closePinPanel();
        this.scrollToBottomDock();
        break;
      case 'swap':
        this.closePinPanel();
        this.focusSwap();
        break;
      case 'token':
        if (pin.token) {
          this.tradeToken(pin.token, 'buy');
        }
        break;
      default:
        break;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.activePin()) {
      this.closePinPanel();
    }
  }

  protected isPinActive(kind: R4v3PinKind, tokenSymbol?: string): boolean {
    const pin = this.activePin();
    if (!pin || pin.kind !== kind) {
      return false;
    }

    if (kind === 'token') {
      return pin.token?.symbol === tokenSymbol;
    }

    return true;
  }

  protected setSourceFilter(value: string): void {
    const source = value === 'CHAIN' || value === 'EDITORIAL' ? value : 'all';
    this.state.setSourceFilter(source);
    this.closePinPanel();
  }

  protected markAllRead(): void {
    this.newsState.markAllRead(this.state.items().map((item) => item.id));
    this.keyboardFocusIndex.set(-1);
  }

  protected setSwapCounter(symbol: string): void {
    this.swapCounterToken.set(symbol);
    this.brandCrypto.requestExchangeTrade(this.swapFromToken(), this.swapToToken());
    this.loadSwapPanel();
    this.swapMessage.set('');
    this.swapError.set(false);
  }

  protected onSearchInput(value: string): void {
    this.state.onSearchInput(value);
  }

  protected loadMore(): void {
    this.state.loadMore();
  }

  protected tradeToken(token: R4v3TokenQuote, side: 'buy' | 'sell'): void {
    this.openPinPanel({ kind: 'token', token });
    this.swapCounterToken.set(token.symbol);
    this.swapDirection.set(side);
    this.brandCrypto.requestExchangeTrade(
      side === 'buy' ? token.symbol : EXCHANGE_NATIVE_TOKEN,
      side === 'buy' ? EXCHANGE_NATIVE_TOKEN : token.symbol
    );
    this.loadSwapPanel();
    this.focusSwap();
    window.dispatchEvent(new CustomEvent('exchange-panel-focus'));
    this.scrollIntoViewSafe(
      document.querySelector('.app-market-card--swap') as HTMLElement | null,
      { behavior: 'smooth', block: 'center' }
    );
  }

  protected flipSwapDirection(event?: Event): void {
    event?.stopPropagation();
    this.swapDirection.update((value) => (value === 'buy' ? 'sell' : 'buy'));
    this.brandCrypto.requestExchangeTrade(this.swapFromToken(), this.swapToToken());
    this.loadSwapPanel();
    this.swapMessage.set('');
    this.swapError.set(false);
  }

  protected submitSwap(): void {
    this.swapMessage.set('');
    this.swapError.set(false);

    const address = this.walletSession.address();
    if (!address) {
      this.swapError.set(true);
      this.swapMessage.set('Wallet requis');
      this.nav.dispatchNewsAction('OPEN_WALLET');
      return;
    }

    if (!this.auth.isAuthenticated()) {
      this.swapError.set(true);
      this.swapMessage.set('Connexion requise');
      this.auth.openDrawer('login');
      return;
    }

    const raw = this.swapForm.controls.amount.value.trim().replace(',', '.');
    const amount = Number.parseFloat(raw);
    if (!Number.isFinite(amount) || amount <= 0 || amount > this.fromBalance()) {
      this.swapError.set(true);
      this.swapMessage.set('Montant invalide');
      return;
    }

    this.swapping.set(true);

    this.blockchain
      .swapExchangeTokens({
        fromToken: this.swapFromToken(),
        toToken: this.swapToToken(),
        amount,
        walletAddress: address,
      })
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.fromBalance.set(response.fromBalance);
          this.swapMessage.set(
            response.message ||
              `Reçu ${response.amountOut} ${response.toToken}`
          );
          this.swapError.set(false);
          this.swapForm.reset({ amount: '' });
          this.swapping.set(false);
          this.walletSession.requestBalanceRefresh();
          void this.walletState.load();
          void this.questProgress.recordSwap(response.fromToken, response.toToken);
          this.state.load(false);
          window.dispatchEvent(new CustomEvent('naivechain-refresh'));
        },
        error: () => {
          this.swapError.set(true);
          this.swapMessage.set('Swap impossible');
          this.swapping.set(false);
        },
      });
  }

  protected isUnread(item: NewsItem): boolean {
    return this.newsState.isUnread(item.id);
  }

  protected isFeatured(item: NewsItem): boolean {
    return item.featured;
  }

  protected openItem(item: NewsItem): void {
    this.closePinPanel();
    this.selectedItem.set(item);
    this.keyboardFocusIndex.set(
      this.filteredItems().findIndex((entry) => entry.id === item.id)
    );
    this.newsState.markRead(item.id);
    this.loadDetail(item.id);
  }

  protected closeItem(): void {
    this.selectedItem.set(null);
    this.detailItem.set(null);
    this.detailLoading.set(false);
  }

  protected navigatePrev(): void {
    const index = this.selectedIndex();
    if (index <= 0) {
      return;
    }

    this.openItem(this.filteredItems()[index - 1]);
  }

  protected navigateNext(): void {
    const index = this.selectedIndex();
    const items = this.filteredItems();
    if (index < 0 || index >= items.length - 1) {
      return;
    }

    this.openItem(items[index + 1]);
  }

  protected runAction(item: NewsItem): void {
    this.nav.dispatchNewsAction(item.actionType, item.actionTarget);
  }

  protected copySummary(item: NewsItem): void {
    const text = `${item.title}\n\n${item.body || item.summary}`;
    navigator.clipboard.writeText(text).catch(() => undefined);
  }

  protected isKeyboardFocused(index: number): boolean {
    return !this.selectedItem() && this.keyboardFocusIndex() === index;
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

    if (this.selectedItem()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeItem();
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
          this.activateNavIndex(index);
        }
        break;
      default:
        break;
    }
  }

  private pollNews(): void {
    const previousTopId = this.state.items()[0]?.id ?? null;

    this.api
      .getR4v3Dashboard({
        source: this.state.sourceFilter(),
        limit: 10,
        offset: 0,
      })
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payload) => {
          if (!payload) {
            return;
          }

          const nextTopId = payload.news.items[0]?.id ?? null;
          if (nextTopId && nextTopId !== previousTopId) {
            this.state.load(false);
            this.scrollToFirstUnread();
          }
        },
      });
  }

  private scrollToFirstUnread(): void {
    queueMicrotask(() => {
      const panel = this.contentPanel()?.nativeElement;
      const firstUnread = panel?.querySelector(
        '.showcase-r4v3__item--unread .showcase-r4v3__item-btn'
      ) as HTMLElement | null;
      firstUnread?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  private activateNavIndex(index: number): void {
    const button = this.getNavButtons()[index];
    if (!button) {
      return;
    }

    const newsIndex = button.closest('.showcase-r4v3__item:not(.showcase-r4v3__item--pin):not(.showcase-r4v3__item--token):not(.showcase-r4v3__item--empty)');
    if (newsIndex) {
      const items = this.filteredItems();
      const rowIndex = Array.from(
        this.contentPanel()?.nativeElement.querySelectorAll(
          '.showcase-r4v3__item:not(.showcase-r4v3__item--pin):not(.showcase-r4v3__item--token):not(.showcase-r4v3__item--empty)'
        ) ?? []
      ).indexOf(newsIndex as Element);
      const item = items[rowIndex];
      if (item) {
        this.openItem(item);
        return;
      }
    }

    button.click();
  }

  private getNavButtons(): HTMLElement[] {
    const panel = this.contentPanel()?.nativeElement;
    if (!panel) {
      return [];
    }

    return Array.from(
      panel.querySelectorAll('.showcase-r4v3__item-btn:not(.showcase-r4v3__item-btn--static)')
    ) as HTMLElement[];
  }

  private scrollToNavIndex(index: number): void {
    queueMicrotask(() => {
      this.getNavButtons()[index]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  private loadSwapPanel(): void {
    const address = this.walletSession.address() ?? undefined;

    this.blockchain
      .getExchangePanel({
        walletAddress: address,
        fromToken: this.swapFromToken(),
        toToken: this.swapToToken(),
      })
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (panel) => {
          this.fromBalance.set(panel.fromBalance ?? 0);
        },
        error: () => {
          this.fromBalance.set(0);
        },
      });
  }

  private loadDetail(id: string): void {
    this.detailLoading.set(true);

    this.api
      .getNewsItem(id)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (item) => {
          this.detailItem.set(item ?? this.selectedItem());
          this.detailLoading.set(false);
        },
        error: () => {
          this.detailItem.set(this.selectedItem());
          this.detailLoading.set(false);
        },
      });
  }
}
