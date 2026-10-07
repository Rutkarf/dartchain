import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';

import { Block } from '@blockchain/models/block.model';
import {
  ShowcaseNavigationService,
  ShowcaseNewsAction,
} from '@showcase/services/showcase-navigation.service';
import { BlockchainApiService } from '@blockchain/services/blockchain-api.service';

import { ParticleBackgroundComponent } from '@star-conquest/components/particle-background/particle-background';
import { StarQuestPanelComponent } from '@star-conquest/star-quest-panel';
import { StarQuestScannerComponent } from '@star-conquest/star-quest-scanner';
import { BandeauAccueilComponent } from './navbar/bandeau-accueil/bandeau-accueil';
import { NavbarComponent } from '@navbar/components/navbar-host/navbar.component';
import { SwapComponent } from '@exchange/components/swap/swap.component';
import { ShowcaseTabShowcaseComponent } from '@showcase/components/showcase-tab-showcase/showcase-tab-showcase.component';
import { DockTabsDockTabsComponent } from '@dock/components/dock-tabs-shell/dock-tabs-shell.component';
import { GraphComponent } from '@exchange/components/graph/graph.component';

import { ShowcaseTab,
  isNewsShowcaseTab,
  newsCategoryForTab,
  normalizeShowcaseTab,
} from '@showcase/models/showcase-tab.model';
import {
  BottomDockTab,
  DockNavigationService,
  QuestNavigateAction,
} from '@dock/services/dock-navigation.service';
import { QuestsProgressService } from '@quests/services/quests-progress.service';
import { ShellFeedbackService } from '@core/services/shell-feedback.service';
import { LocaleService } from './core/i18n/locale.service';
import { OverlayPanel } from '@dock/components/dock-tabs/dock-tabs';
import { ErrorBannerComponent } from './components/error-banner/error-banner';
import { R4v3SceneComponent } from './r4v3-scene/r4v3-scene';
import { BlockDetailDrawerComponent } from '@blockchain/block-detail-drawer/block-detail-drawer';
import { LaunchFormDrawerComponent } from './showcase/components/launch-form-drawer/launch-form-drawer';
import { LaunchDrawerService } from '@showcase/services/launch-drawer.service';
import { ThreeFloor } from '@metaverse/three-floor';
import { CombinedPerfHudComponent } from './core/utils/combined-perf-hud.component';
import { bindViewportCompactClass } from './core/viewport-compact';
import { ProductConfigService } from './core/config/product-config.service';
import { AuthService } from '@auth/services/auth.service';
import { ShowcaseNewsStateService } from '@showcase/services/showcase-news-state.service';
import { ShowcaseHubUiService } from '@showcase/services/showcase-hub-ui.service';
import { AuthDrawerComponent } from '@auth/auth-drawer/auth-drawer';
import { IntroOverlay } from './shared/intro-overlay/intro-overlay';
import { IntroService } from './shared/intro-overlay/intro.service';
import { AgeCallGate } from './shared/age-call-gate/age-call-gate';
import { AgeGateService } from './shared/age-call-gate/age-gate.service';
import { AgeIntroHandoffService } from './shared/age-call-gate/age-intro-handoff.service';
import { OnboardingTourOverlay } from './shared/onboarding-tour/onboarding-tour-overlay';
import { OnboardingTourService } from './shared/onboarding-tour/onboarding-tour.service';
import { LogoRelayService } from './shared/logo-relay/logo-relay.service';
import { FaucetRuntimeService } from '@faucet/services/faucet-runtime.service';
import { ChartSummaryStateService } from '@showcase/services/chart-summary-state.service';
import { ShowcaseR4v3StateService } from '@showcase/services/showcase-r4v3-state.service';
import { ShowcaseChatStateService } from '@showcase/services/showcase-chat-state.service';
import { ShowcaseLaunchStateService } from '@showcase/services/showcase-launch-state.service';
import { ShowcaseDaoStateService } from '@showcase/services/showcase-dao-state.service';
import {
  DOCK_REFRESH_EVENT,
  SHOWCASE_REFRESH_EVENT,
} from './core/constants/panel-refresh.constants';
import { DockWalletStateService } from '@dock/services/dock-wallet-state.service';
import { DockQuestsStateService } from '@dock/services/dock-quests-state.service';
import { DockPeersStateService } from '@dock/services/dock-peers-state.service';
import { DockPendingStateService } from '@dock/services/dock-pending-state.service';
import { DockBlockStateService } from '@dock/services/dock-block-state.service';
import { TransactionsDataService } from '@dock/services/transactions-data.service';
import { DockChainStateService } from '@dock/services/dock-chain-state.service';
import { ChainDataService } from '@blockchain/services/chain-data.service';
import { MarketDataService } from '@showcase/services/market-data.service';
import { QuestsDataService } from '@quests/services/quests-data.service';
import { PeersDataService } from '@peers/services/peers-data.service';
import { ShowcaseChatService } from '@showcase/services/showcase-chat.service';
import { MarketCartDrawerComponent } from '@showcase/components/market-panel/market-cart-drawer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    ParticleBackgroundComponent,
    StarQuestPanelComponent,
    StarQuestScannerComponent,
    NavbarComponent,
    BandeauAccueilComponent,
    SwapComponent,
    ShowcaseTabShowcaseComponent,
    DockTabsDockTabsComponent,
    GraphComponent,
    ErrorBannerComponent,
    R4v3SceneComponent,
    BlockDetailDrawerComponent,
    LaunchFormDrawerComponent,
    MarketCartDrawerComponent,
    ThreeFloor,
    CombinedPerfHudComponent,
    AuthDrawerComponent,
    AgeCallGate,
    IntroOverlay,
    OnboardingTourOverlay,
    RouterOutlet,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  private readonly faucetRuntime = inject(FaucetRuntimeService);
  private readonly destroyRef = inject(DestroyRef);
  private hubBooted = false;
  private hubBootQueued = false;

  readonly launchDrawer = inject(LaunchDrawerService);
  readonly locale = inject(LocaleService);
  readonly product = inject(ProductConfigService);
  readonly auth = inject(AuthService);
  readonly ageGate = inject(AgeGateService);
  /** Exposé au template : le floor 3D attend la fin de l’intro. */
  protected readonly introSvc = inject(IntroService);
  private readonly handoff = inject(AgeIntroHandoffService);
  private readonly onboardingTour = inject(OnboardingTourService);
  private readonly logoRelay = inject(LogoRelayService);
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
  private readonly dockQuestsState = inject(DockQuestsStateService);
  private readonly dockPeersState = inject(DockPeersStateService);
  private readonly dockPendingState = inject(DockPendingStateService);
  private readonly dockBlockState = inject(DockBlockStateService);
  private readonly transactionsData = inject(TransactionsDataService);
  private readonly dockChainState = inject(DockChainStateService);
  private readonly chainData = inject(ChainDataService);
  private readonly marketData = inject(MarketDataService);
  private readonly questsData = inject(QuestsDataService);
  private readonly peersData = inject(PeersDataService);
  private readonly showcaseChat = inject(ShowcaseChatService);
  private readonly router = inject(Router);
  private routeSync = false;

  readonly activeShowcaseTab = signal<ShowcaseTab>('tours');
  readonly activeBottomTab = signal<BottomDockTab>('wallet');
  /** Smart-bars repliées au premier paint (dartchain.pages.dev). */
  readonly showcaseCollapsed = signal(true);
  readonly chartCollapsed = signal(true);
  readonly exchangeCollapsed = signal(false);
  readonly dockCollapsed = signal(true);
  readonly showDrawer = signal(false);
  readonly selectedBlock = signal<Block | null>(null);
  readonly questFeedback = this.questProgress.feedback;
  readonly shellBannerError = this.shell.bannerError;
  readonly r4v3SceneVisible = this.shell.r4v3SceneVisible;

  selectedPaletteIndex: number | null = null;

  constructor() {
    const unbindViewport = bindViewportCompactClass();
    this.destroyRef.onDestroy(() => unbindViewport());

    void this.auth.handleOAuthCallbackOnLoad();

    // Fetches du hub : après l’intro, pas pendant le vol ni l’attente Insert Coin.
    effect(() => {
      const ageDone = this.ageGate.passed() || !this.ageGate.shouldAsk();
      const flying = this.handoff.flying();
      const playing = this.introSvc.playing();
      const finished = this.introSvc.finished();
      if (!ageDone || this.hubBooted || this.hubBootQueued) return;
      if (flying || (playing && !finished)) return;
      this.hubBootQueued = true;
      untracked(() => this.queueHubBoot());
    });

    // Tutoriel hub auto : après âge + intro (finish ou skipMark reduced-motion).
    effect(() => {
      const ageDone = this.ageGate.passed() || !this.ageGate.shouldAsk();
      const finished = this.introSvc.finished();
      if (!ageDone || !finished) return;
      if (!this.onboardingTour.shouldStart()) return;
      untracked(() => this.scheduleHubTourStart());
    });

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
        this.rememberShellPath(normalized);
      });

    this.dockNav.tabRequest$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tab) => this.onBottomTabChange(tab));

    this.dockNav.questAction$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((action) => this.handleQuestAction(action));

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => this.applyShellPath(event.urlAfterRedirects));

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
    this.rememberShellPath(tab);
  }

  private syncShowcaseNewsCategory(tab: ShowcaseTab): void {
    if (!isNewsShowcaseTab(tab)) {
      return;
    }

    this.newsState.syncCategoryForTab(newsCategoryForTab(tab));
  }

  onBottomTabChange(tab: BottomDockTab | 'pending' | 'block'): void {
    if (tab === 'pending' || tab === 'block') {
      this.dockNav.requestTab(tab);
      this.activeBottomTab.set('transactions');
      this.dockCollapsed.set(false);
      this.rememberShellPath('transactions');
      this.scrollToSelector('.app-bottom-stack__content');
      return;
    }

    const alreadyOpen = this.activeBottomTab() === tab && !this.dockCollapsed();
    this.activeBottomTab.set(tab);
    this.dockCollapsed.set(false);
    this.rememberShellPath(tab);
    // Évite le scroll au re-clic (casse le dblclick repli/dépli sur l'onglet actif).
    if (!alreadyOpen) {
      this.scrollToSelector('.app-bottom-stack__content');
    }
  }

  private applyShellPath(url: string): void {
    const segment = url.split('?')[0].split('#')[0].replace(/^\//, '').split('/')[0];
    const dockTabs: BottomDockTab[] = [
      'wallet',
      'faucet',
      'transactions',
      'chain',
      'quests',
      'peers',
      'admin',
    ];
    const showcaseTabs: ShowcaseTab[] = ['rv23', 'daonews', 'dao', 'market', 'r4v3', 'tours'];
    this.routeSync = true;
    if (dockTabs.includes(segment as BottomDockTab)) {
      this.onBottomTabChange(segment as BottomDockTab);
    } else if (showcaseTabs.includes(segment as ShowcaseTab)) {
      this.onShowcaseTabChange(segment as ShowcaseTab);
    }
    this.routeSync = false;
  }

  private rememberShellPath(segment: string): void {
    if (this.routeSync) {
      return;
    }
    const current = this.router.url.split('?')[0].replace(/^\//, '').split('/')[0];
    if (current === segment) {
      return;
    }
    void this.router.navigate(['/' + segment]);
  }

  openBlockchainPanel(panel: OverlayPanel = 'pending'): void {
    this.onBottomTabChange(DockNavigationService.overlayToBottomTab(panel));
  }

  toggleShowcaseCollapsed(): void {
    this.showcaseCollapsed.update((collapsed) => !collapsed);
  }

  /** Double-clic sur un onglet showcase : même repli / dépli que le chevron. */
  onShowcaseTabDoubleClick(collapsed: boolean): void {
    this.showcaseCollapsed.set(collapsed);
  }

  /** Clic smart-bar / bande : ouvrir uniquement (pas de toggle — évite expand+repli). */
  expandShowcaseFromSummary(): void {
    this.showcaseCollapsed.set(false);
  }

  toggleChartCollapsed(): void {
    this.chartCollapsed.update((collapsed) => !collapsed);
  }

  expandChartFromSummary(): void {
    this.chartCollapsed.set(false);
  }

  toggleExchangeCollapsed(): void {
    this.exchangeCollapsed.update((collapsed) => !collapsed);
  }

  toggleDockCollapsed(): void {
    this.dockCollapsed.update((collapsed) => !collapsed);
  }

  /** Double-clic sur un onglet dock : même repli / dépli que le chevron. */
  onDockTabDoubleClick(collapsed: boolean): void {
    this.dockCollapsed.set(collapsed);
  }

  expandDockFromSummary(): void {
    this.dockCollapsed.set(false);
  }

  /** Après l’âge : faucet, login quest, précharge panels. */
  /** Démarre les fetches quand le thread n’est plus dans le traveling. */
  private queueHubBoot(): void {
    window.setTimeout(() => {
      const start = () => {
        if (this.hubBooted || this.handoff.flying()) return;
        this.startPostAgeBoot();
      };
      const ric = window.requestIdleCallback;
      if (typeof ric === 'function') ric(() => start(), { timeout: 1500 });
      else start();
    }, 720);
  }

  /**
   * Lance le tutoriel dès que le shell hub est peint (filet skipMark + finish).
   * Ne démarre jamais pendant l’appel d’âge.
   */
  private scheduleHubTourStart(): void {
    const tryStart = (attempt: number): void => {
      if (!this.onboardingTour.shouldStart()) return;
      const hubReady =
        typeof document !== 'undefined' &&
        Boolean(
          document.querySelector(
            '.logo-shell, app-navbar, .app-hub-swap-stack, [data-tour="welcome"]',
          ),
        );
      if (!hubReady && attempt < 24) {
        window.setTimeout(() => tryStart(attempt + 1), 120);
        return;
      }
      if (!this.onboardingTour.start()) {
        this.logoRelay.releaseAfterIntro();
      }
    };
    window.setTimeout(() => tryStart(0), 280);
  }

  private startPostAgeBoot(): void {
    if (this.hubBooted) return;
    this.hubBooted = true;
    this.faucetRuntime.start();
    this.questProgress.recordDailyLogin();
    this.bootstrapPanelData();
  }

  /** Initialise les stores showcase/dock au lancement (tous les onglets). */
  private bootstrapPanelData(): void {
    this.newsState.refreshFeed(true);
    this.r4v3State.load(false);
    this.daoState.load(false);
    this.launchState.loadProjects();
    this.showcaseChat.connect();
    this.marketData.init();
    this.chartSummary.refresh();

    this.chainData.init();
    this.transactionsData.init();
    this.questsData.init();
    this.peersData.init();

    this.dockWalletState.refresh();
    this.dockChainState.refresh(true);
    void this.dockQuestsState.load();
    void this.dockPeersState.load();
    void this.dockPendingState.load();
    void this.dockBlockState.load();
    this.faucetRuntime.refreshPanel();
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
      dao: 'LABZ',
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
