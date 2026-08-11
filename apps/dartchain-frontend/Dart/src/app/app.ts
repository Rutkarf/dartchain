import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';

import { Block } from './core/models/block.model';
import {
  ShowcaseNavigationService,
  ShowcaseNewsAction,
} from './core/services/showcase-navigation.service';
import { BlockchainApiService } from './core/services/blockchain-api.service';

import { ParticleBackgroundComponent } from './particle-background/particle-background';
import { NavbarComponent } from './navbar/navbar';
import { BandeauAccueilComponent } from './features/bandeau-accueil/bandeau-accueil';

import { ExchangePanelComponent } from './features/exchange-panel/exchange-panel';
import { RatePanelComponent } from './features/rate-panel/rate-panel';
import {
  ShowcaseTab,
  isNewsShowcaseTab,
  newsCategoryForTab,
  normalizeShowcaseTab,
} from './core/models/showcase-tab.model';
import { ShowcaseTabsComponent } from './features/showcase-tabs/showcase-tabs';
import { ShowcasePanelComponent } from './features/showcase-panel/showcase-panel';
import { WalletPanelComponent } from './features/wallet-panel/wallet-panel';
import { FaucetComponent } from './features/faucet/faucet';
import { PeerPanelComponent } from './features/peer-panel/peer-panel';
import { QuestsPanelComponent } from './features/quests-panel/quests-panel';
import { TransactionsDockComponent } from './features/transactions-dock/transactions-dock';
import { BlocksListComponent } from './features/blocks-list/blocks-list';
import {
  BottomDockTab,
  DockNavigationService,
  QuestNavigateAction,
} from './core/services/dock-navigation.service';
import { QuestsProgressService } from './core/services/quests-progress.service';
import { ShellFeedbackService } from './core/services/shell-feedback.service';
import { LocaleService } from './core/i18n/locale.service';
import { OverlayPanel } from './features/dock-tabs/dock-tabs';
import { ErrorBannerComponent } from './features/error-banner/error-banner';
import { R4v3SceneComponent } from './r4v3-scene/r4v3-scene';
import { BlockDetailDrawerComponent } from './features/block-detail-drawer/block-detail-drawer';
import { LaunchFormDrawerComponent } from './features/launch-form-drawer/launch-form-drawer';
import { LaunchDrawerService } from './core/services/launch-drawer.service';
import { ThreeFloor } from './three-floor/three-floor';
import { bindViewportCompactClass } from './core/viewport-compact';
import { ProductConfigService } from './core/config/product-config.service';
import { FocusTrapDirective } from './core/directives/focus-trap.directive';
import { AuthService } from './core/services/auth.service';
import { ShowcaseNewsStateService } from './core/services/showcase-news-state.service';
import { ShowcaseHubUiService } from './core/services/showcase-hub-ui.service';
import { AdminPanelComponent } from './features/admin-panel/admin-panel';
import { DockBottomSummaryComponent } from './features/dock-summary/dock-bottom-summary';
import { AuthDrawerComponent } from './features/auth-drawer/auth-drawer';
import { FaucetRuntimeService } from './core/services/faucet-runtime.service';
import { CollapsedBarActionsComponent } from './features/collapsed-bar-actions/collapsed-bar-actions';
import { ChartSummaryStateService } from './core/services/chart-summary-state.service';
import { ShowcaseR4v3StateService } from './core/services/showcase-r4v3-state.service';
import { ShowcaseChatStateService } from './core/services/showcase-chat-state.service';
import { ShowcaseLaunchStateService } from './core/services/showcase-launch-state.service';
import { ShowcaseDaoStateService } from './core/services/showcase-dao-state.service';
import {
  DOCK_REFRESH_EVENT,
  SHOWCASE_REFRESH_EVENT,
} from './core/constants/panel-refresh.constants';
import { DockWalletStateService } from './core/services/dock-wallet-state.service';
import { TransactionsDataService } from './core/services/transactions-data.service';
import { DockChainStateService } from './core/services/dock-chain-state.service';
import { ChainDataService } from './core/services/chain-data.service';
import { MarketDataService } from './core/services/market-data.service';
import { QuestsDataService } from './core/services/quests-data.service';
import { PeersDataService } from './core/services/peers-data.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    ParticleBackgroundComponent,
    NavbarComponent,
    BandeauAccueilComponent,
    ExchangePanelComponent,
    RatePanelComponent,
    ShowcaseTabsComponent,
    ShowcasePanelComponent,
    WalletPanelComponent,
    FaucetComponent,
    PeerPanelComponent,
    QuestsPanelComponent,
    TransactionsDockComponent,
    BlocksListComponent,
    ErrorBannerComponent,
    R4v3SceneComponent,
    BlockDetailDrawerComponent,
    LaunchFormDrawerComponent,
    ThreeFloor,
    FocusTrapDirective,
    AdminPanelComponent,
    DockBottomSummaryComponent,
    AuthDrawerComponent,
    CollapsedBarActionsComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  private readonly faucetRuntime = inject(FaucetRuntimeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly launchDrawer = inject(LaunchDrawerService);
  readonly locale = inject(LocaleService);
  readonly product = inject(ProductConfigService);
  readonly auth = inject(AuthService);
  private readonly nav = inject(ShowcaseNavigationService);
  private readonly dockNav = inject(DockNavigationService);
  private readonly questProgress = inject(QuestsProgressService);
  private readonly shell = inject(ShellFeedbackService);
  private readonly blockchain = inject(BlockchainApiService);
  private readonly newsState = inject(ShowcaseNewsStateService);
  private readonly showcaseHubUi = inject(ShowcaseHubUiService);
  private readonly chartSummary = inject(ChartSummaryStateService);
  private readonly r4v3State = inject(ShowcaseR4v3StateService);
  private readonly chatState = inject(ShowcaseChatStateService);
  private readonly launchState = inject(ShowcaseLaunchStateService);
  private readonly daoState = inject(ShowcaseDaoStateService);
  private readonly dockWalletState = inject(DockWalletStateService);
  private readonly transactionsData = inject(TransactionsDataService);
  private readonly dockChainState = inject(DockChainStateService);
  private readonly chainData = inject(ChainDataService);
  private readonly marketData = inject(MarketDataService);
  private readonly questsData = inject(QuestsDataService);
  private readonly peersData = inject(PeersDataService);

  readonly activeShowcaseTab = signal<ShowcaseTab>('tours');
  readonly activeBottomTab = signal<BottomDockTab>('wallet');
  readonly showcaseCollapsed = signal(false);
  readonly chartCollapsed = signal(false);
  readonly exchangeCollapsed = signal(false);
  readonly dockCollapsed = signal(false);
  readonly showDrawer = signal(false);
  readonly selectedBlock = signal<Block | null>(null);
  readonly questFeedback = this.questProgress.feedback;
  readonly shellBannerError = this.shell.bannerError;
  readonly r4v3SceneVisible = this.shell.r4v3SceneVisible;

  selectedPaletteIndex: number | null = null;

  constructor() {
    const unbindViewport = bindViewportCompactClass();
    this.destroyRef.onDestroy(() => unbindViewport());

    // Faucet toujours démarré — feature vedette, tous environnements.
    this.faucetRuntime.start();

    this.questProgress.recordDailyLogin();

    void this.auth.handleOAuthCallbackOnLoad();

    this.nav.newsAction$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((action) => this.handleNewsAction(action));

    this.nav.tabRequest$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tab) => {
        const normalized = normalizeShowcaseTab(String(tab));
        this.syncShowcaseNewsCategory(normalized);
        this.activeShowcaseTab.set(normalized);
        this.showcaseCollapsed.set(false);
      });

    this.dockNav.tabRequest$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tab) => this.onBottomTabChange(tab));

    this.dockNav.questAction$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((action) => this.handleQuestAction(action));

    this.showcaseHubUi.expandRequested$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.showcaseCollapsed.set(false));

    window.addEventListener('open-block-drawer', this.handleOpenBlockDrawer);
    window.addEventListener('dock-open-panel', this.handleDockOpenPanel);

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('open-block-drawer', this.handleOpenBlockDrawer);
      window.removeEventListener('dock-open-panel', this.handleDockOpenPanel);
    });
  }

  private handleOpenBlockDrawer = (event: Event): void => {
    const block = (event as CustomEvent<{ block?: Block }>).detail?.block;
    if (block) {
      this.openBlockDrawer(block);
    }
  };

  private handleDockOpenPanel = (event: Event): void => {
    const panel = (event as CustomEvent<{ panel?: string }>).detail?.panel;
    if (!panel) {
      return;
    }

    this.dockCollapsed.set(false);

    if (
      panel === 'pending' ||
      panel === 'composer' ||
      panel === 'wallet' ||
      panel === 'chain' ||
      panel === 'peers'
    ) {
      this.openBlockchainPanel(panel as OverlayPanel);
      return;
    }

    if (panel === 'market') {
      this.showcaseCollapsed.set(false);
      this.onShowcaseTabChange('market');
      return;
    }

    if (panel === 'faucet' || panel === 'quests') {
      this.onBottomTabChange(panel);
    }
  };

  onShowcaseTabChange(tab: ShowcaseTab): void {
    this.syncShowcaseNewsCategory(tab);
    this.activeShowcaseTab.set(tab);
    this.showcaseCollapsed.set(false);
  }

  private syncShowcaseNewsCategory(tab: ShowcaseTab): void {
    if (!isNewsShowcaseTab(tab)) {
      return;
    }

    this.newsState.syncCategoryForTab(newsCategoryForTab(tab));
  }

  onBottomTabChange(tab: BottomDockTab | 'pending' | 'block'): void {
    if (tab === 'admin' && !this.auth.isAdmin()) {
      return;
    }

    if (tab === 'pending' || tab === 'block') {
      this.dockNav.requestTab(tab);
      this.activeBottomTab.set('transactions');
      this.scrollToSelector('.app-bottom-stack__content');
      return;
    }

    this.activeBottomTab.set(tab);
    this.scrollToSelector('.app-bottom-stack__content');
  }

  openBlockchainPanel(panel: OverlayPanel = 'pending'): void {
    this.onBottomTabChange(DockNavigationService.overlayToBottomTab(panel));
  }

  toggleShowcaseCollapsed(): void {
    this.showcaseCollapsed.update((collapsed) => !collapsed);
  }

  toggleChartCollapsed(): void {
    this.chartCollapsed.update((collapsed) => !collapsed);
  }

  toggleExchangeCollapsed(): void {
    this.exchangeCollapsed.update((collapsed) => !collapsed);
  }

  toggleDockCollapsed(): void {
    this.dockCollapsed.update((collapsed) => !collapsed);
  }

  /** Refresh isolé Graph — n’impacte ni showcase ni dock. */
  refreshGraphPanel(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.chartSummary.refresh();
  }

  /** Refresh isolé Showcase — onglet actif (barre repliée + panneau déplié). */
  refreshShowcasePanel(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const tab = this.activeShowcaseTab();
    this.refreshShowcaseSummaryState(tab);
    window.dispatchEvent(
      new CustomEvent(SHOWCASE_REFRESH_EVENT, { detail: { tab } })
    );
  }

  private refreshShowcaseSummaryState(tab: ShowcaseTab): void {
    switch (tab) {
      case 'tours':
        this.newsState.refreshFeed(true);
        break;
      case 'r4v3':
        this.r4v3State.refresh();
        break;
      case 'rv23':
        this.chatState.requestRefresh();
        break;
      case 'dao':
        this.launchState.requestRefresh();
        break;
      case 'daonews':
        this.daoState.refresh();
        break;
      case 'market':
        void this.marketData.refreshAll(true);
        break;
    }
  }

  /** Refresh isolé Dock — onglet actif (barre repliée + panneau déplié). */
  refreshDockPanel(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const tab = this.activeBottomTab();
    this.refreshDockSummaryState(tab);
    window.dispatchEvent(new CustomEvent(DOCK_REFRESH_EVENT, { detail: { tab } }));
  }

  private refreshDockSummaryState(tab: BottomDockTab): void {
    switch (tab) {
      case 'wallet':
        this.dockWalletState.refresh();
        break;
      case 'faucet':
        this.faucetRuntime.refreshPanel();
        break;
      case 'transactions':
        this.transactionsData.scheduleRefresh(true);
        break;
      case 'chain':
        this.dockChainState.refresh(true);
        this.chainData.scheduleRefresh(true);
        break;
      case 'quests':
        this.questsData.scheduleRefresh(true);
        break;
      case 'peers':
        this.peersData.scheduleRefresh(true);
        break;
    }
  }

  showcaseRefreshBusy(): boolean {
    switch (this.activeShowcaseTab()) {
      case 'tours':
      case 'daonews':
        return this.newsState.loading();
      case 'r4v3':
        return this.r4v3State.refreshing() || this.r4v3State.loading();
      case 'rv23':
        return this.chatState.refreshing();
      case 'dao':
        return this.launchState.loading();
      case 'market':
        return this.marketData.loadingRows() || this.marketData.loadingChart();
      default:
        return false;
    }
  }

  dockRefreshBusy(): boolean {
    switch (this.activeBottomTab()) {
      case 'wallet':
        return this.dockWalletState.loading();
      case 'faucet':
        return this.faucetRuntime.loading();
      case 'transactions':
        return this.transactionsData.pendingLoading() || this.transactionsData.tipLoading();
      case 'chain':
        return this.dockChainState.loading();
      case 'quests':
        return this.questsData.loading();
      case 'peers':
        return this.peersData.loading();
      default:
        return false;
    }
  }

  chartCollapseLabel(): string {
    return this.chartCollapsed() ? 'Déplier le graphique' : 'Replier le graphique';
  }

  exchangeCollapseLabel(): string {
    return this.exchangeCollapsed() ? 'Déplier l\'échange' : 'Replier l\'échange';
  }

  dockCollapseLabel(): string {
    return this.dockCollapsed() ? 'Déplier le dock' : 'Replier le dock';
  }

  showcaseCollapseLabel(): string {
    const labels: Record<ShowcaseTab, string> = {
      tours: 'TOUS',
      r4v3: 'R4V3',
      rv23: 'CHAT',
      dao: 'LAUNCH',
      daonews: 'D.A.O',
      market: 'MARCHÉ',
    };
    const name = labels[this.activeShowcaseTab()];
    return this.showcaseCollapsed()
      ? `Déplier le panneau ${name}`
      : `Replier le panneau ${name}`;
  }

  openBlockDrawer(block: Block): void {
    this.selectedBlock.set(block);
    this.showDrawer.set(true);
    void this.questProgress.recordBlockExplored(block.index);

    const hash = block.hash?.trim();
    if (hash) {
      this.blockchain
        .getBlockByHash(hash)
        .pipe(take(1), takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (fresh) => {
            if (fresh) {
              this.selectedBlock.set(fresh);
            }
          },
          error: () => {
            // Garder le bloc en mémoire si le fetch échoue.
          },
        });
    }
  }

  closeBlockDrawer(): void {
    this.showDrawer.set(false);
    this.selectedBlock.set(null);
  }

  openPendingPanel(): void {
    this.openBlockchainPanel('pending');
  }

  private handleNewsAction(action: ShowcaseNewsAction): void {
    switch (action.type) {
      case 'VIEW_BLOCK':
        this.openBlockFromNewsTarget(action.target);
        break;
      case 'VIEW_PENDING':
      case 'OPEN_PENDING':
        this.openPendingPanel();
        break;
      case 'OPEN_PEERS':
        this.onBottomTabChange('peers');
        break;
      case 'OPEN_WALLET':
        this.dockCollapsed.set(false);
        this.onBottomTabChange('wallet');
        break;
      case 'OPEN_FAUCET':
        if (this.product.faucetEnabled) {
          this.dockCollapsed.set(false);
          this.onBottomTabChange('faucet');
        }
        break;
      case 'OPEN_SWAP':
        this.scrollToSelector('.app-hub-swap-stack');
        break;
    }
  }

  openBlockFromShowcaseIndex(index: number): void {
    this.blockchain
      .getBlocks()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((blocks) => {
        const block = blocks.find((entry) => entry.index === index);
        if (block) {
          this.openBlockDrawer(block);
        }
      });
  }

  private openBlockFromNewsTarget(target: string | null): void {
    if (!target) {
      return;
    }

    const index = Number.parseInt(target, 10);
    if (Number.isNaN(index)) {
      return;
    }

    this.blockchain
      .getBlocks()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((blocks) => {
        const block = blocks.find((entry) => entry.index === index);
        if (block) {
          this.openBlockDrawer(block);
        }
      });
  }

  private scrollToSelector(selector: string): void {
    document.querySelector(selector)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }

  @HostListener('window:hub-rate-panel-focus')
  focusHubRatePanel(): void {
    this.chartCollapsed.set(false);
    queueMicrotask(() => {
      this.scrollToSelector('.app-market-card--rate');
    });
  }

  @HostListener('window:exchange-panel-open')
  onExchangePanelOpen(): void {
    this.exchangeCollapsed.set(false);
    queueMicrotask(() => {
      this.scrollToSelector('.app-hub-swap-stack');
    });
  }

  private handleQuestAction(action: QuestNavigateAction): void {
    switch (action) {
      case 'faucet':
        if (this.product.faucetEnabled) {
          this.onBottomTabChange('faucet');
        }
        break;
      case 'market':
        this.showcaseCollapsed.set(false);
        this.onShowcaseTabChange('market');
        break;
      case 'peers':
        this.onBottomTabChange('peers');
        break;
      case 'swap':
        this.focusSwapQuest();
        break;
      case 'explore-blocks':
        this.onBottomTabChange('chain');
        this.focusExplorerSearch();
        this.dockCollapsed.set(false);
        break;
      case 'showcase-tours':
        this.activeShowcaseTab.set('tours');
        this.showcaseCollapsed.set(false);
        break;
    }
  }

  private focusExplorerSearch(): void {
    document.querySelector('.navbar-aux__search')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    window.dispatchEvent(new CustomEvent('explorer-search-focus'));
  }

  private focusSwapQuest(): void {
    this.activeShowcaseTab.set('dao');
    this.showcaseCollapsed.set(false);
    this.exchangeCollapsed.set(false);
    this.scrollToSelector('.app-hub-swap-stack');
    window.dispatchEvent(new CustomEvent('exchange-panel-focus'));
  }
}
