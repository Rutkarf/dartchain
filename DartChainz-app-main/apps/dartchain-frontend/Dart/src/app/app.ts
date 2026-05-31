import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
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
  normalizeShowcaseTab,
} from './core/models/showcase-tab.model';
import { ShowcaseTabsComponent } from './features/showcase-tabs/showcase-tabs';
import { ShowcasePanelComponent } from './features/showcase-panel/showcase-panel';
import { WalletPanelComponent } from './features/wallet-panel/wallet-panel';
import { FaucetComponent } from './features/faucet/faucet';
import { PeerPanelComponent } from './features/peer-panel/peer-panel';
import { MarketPanelComponent } from './features/market-panel/market-panel';
import { QuestsPanelComponent } from './features/quests-panel/quests-panel';
import {
  DockNavigationService,
  QuestNavigateAction,
} from './core/services/dock-navigation.service';
import { QuestsProgressService } from './core/services/quests-progress.service';
import { OverlayPanel } from './features/dock-tabs/dock-tabs';
import { BlockDetailDrawerComponent } from './features/block-detail-drawer/block-detail-drawer';
import { LaunchFormDrawerComponent } from './features/launch-form-drawer/launch-form-drawer';
import { LaunchDrawerService } from './core/services/launch-drawer.service';
import { ThreeFloor } from './three-floor/three-floor';
import { bindViewportCompactClass } from './core/viewport-compact';

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
    MarketPanelComponent,
    QuestsPanelComponent,
    BlockDetailDrawerComponent,
    LaunchFormDrawerComponent,
    ThreeFloor,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  readonly launchDrawer = inject(LaunchDrawerService);
  private readonly nav = inject(ShowcaseNavigationService);
  private readonly dockNav = inject(DockNavigationService);
  private readonly questProgress = inject(QuestsProgressService);
  private readonly blockchain = inject(BlockchainApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeShowcaseTab = signal<ShowcaseTab>('tours');
  readonly activeBottomTab = signal<
    'wallet' | 'faucet' | 'market' | 'quests' | 'peers'
  >('wallet');
  readonly showcaseCollapsed = signal(false);
  readonly dockActivePanel = signal<OverlayPanel>('wallet');
  readonly dockCollapsed = signal(false);
  readonly showDrawer = signal(false);
  readonly selectedBlock = signal<Block | null>(null);

  selectedPaletteIndex: any;

  constructor() {
    const unbindViewport = bindViewportCompactClass();
    this.destroyRef.onDestroy(() => unbindViewport());

    this.questProgress.recordDailyLogin();

    this.nav.newsAction$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((action) => this.handleNewsAction(action));

    this.nav.tabRequest$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tab) => {
        this.activeShowcaseTab.set(normalizeShowcaseTab(String(tab)));
        this.showcaseCollapsed.set(false);
      });

    this.dockNav.tabRequest$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tab) => this.onBottomTabChange(tab));

    this.dockNav.questAction$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((action) => this.handleQuestAction(action));

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
    if (
      panel === 'pending' ||
      panel === 'composer' ||
      panel === 'wallet' ||
      panel === 'chain' ||
      panel === 'peers'
    ) {
      this.dockActivePanel.set(panel);
      this.dockCollapsed.set(false);
    }
  };

  onShowcaseTabChange(tab: ShowcaseTab): void {
    this.activeShowcaseTab.set(tab);
    this.showcaseCollapsed.set(false);
  }

  onBottomTabChange(tab: 'wallet' | 'faucet' | 'market' | 'quests' | 'peers'): void {
    this.activeBottomTab.set(tab);
  }

  toggleShowcaseCollapsed(): void {
    this.showcaseCollapsed.update((collapsed) => !collapsed);
  }

  showcaseCollapseLabel(): string {
    const labels: Record<ShowcaseTab, string> = {
      tours: 'TOUS',
      reseau: 'RÉSEAU',
      rv23: 'RV23',
      peers: 'PEERS',
      dao: 'D.A.O',
    };
    const name = labels[this.activeShowcaseTab()];
    return this.showcaseCollapsed()
      ? `Déplier le panneau ${name}`
      : `Replier le panneau ${name}`;
  }

  onDockPanelChange(panel: OverlayPanel): void {
    this.dockActivePanel.set(panel);
  }

  toggleDockCollapsed(): void {
    this.dockCollapsed.update((collapsed) => !collapsed);
  }

  dockCollapseLabel(): string {
    const labels: Record<OverlayPanel, string> = {
      pending: 'Pending',
      composer: 'Block',
      wallet: 'Wallet',
      chain: 'Chain',
      peers: 'Peers',
    };
    const name = labels[this.dockActivePanel()];
    return this.dockCollapsed()
      ? `Déplier le panneau ${name}`
      : `Replier le panneau ${name}`;
  }

  openBlockDrawer(block: Block): void {
    this.selectedBlock.set(block);
    this.showDrawer.set(true);
    this.questProgress.recordBlockExplored();
  }

  closeBlockDrawer(): void {
    this.showDrawer.set(false);
    this.selectedBlock.set(null);
  }

  openPendingPanel(): void {
    this.dockActivePanel.set('pending');
    this.dockCollapsed.set(false);
  }

  private handleNewsAction(action: ShowcaseNewsAction): void {
    switch (action.type) {
      case 'VIEW_BLOCK':
        this.openBlockFromNewsTarget(action.target);
        break;
      case 'VIEW_PENDING':
        this.openPendingPanel();
        break;
      case 'OPEN_PEERS':
        this.activeShowcaseTab.set('peers');
        this.showcaseCollapsed.set(false);
        break;
      case 'OPEN_WALLET':
        this.dockActivePanel.set('wallet');
        this.dockCollapsed.set(false);
        break;
      case 'OPEN_FAUCET':
        break;
      case 'OPEN_SWAP':
        this.scrollToSelector('.app-market-card--swap');
        break;
    }
  }

  openBlockFromShowcaseIndex(index: number): void {
    this.blockchain
      .getModernBlocks()
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
      .getModernBlocks()
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

  private handleQuestAction(action: QuestNavigateAction): void {
    switch (action) {
      case 'faucet':
        this.onBottomTabChange('faucet');
        break;
      case 'market':
        this.onBottomTabChange('market');
        break;
      case 'peers':
        this.onBottomTabChange('peers');
        break;
      case 'swap':
        this.scrollToSelector('.app-market-card--swap');
        break;
      case 'showcase-tours':
        this.activeShowcaseTab.set('tours');
        this.showcaseCollapsed.set(false);
        break;
    }
  }
}