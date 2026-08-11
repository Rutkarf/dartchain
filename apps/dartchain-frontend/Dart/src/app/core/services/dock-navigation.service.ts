import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { OverlayPanel } from '../../features/dock-tabs/dock-tabs';
import { TransactionSubTab, TransactionsDockService } from './transactions-dock.service';

export type BottomDockTab =
  | 'wallet'
  | 'faucet'
  | 'transactions'
  | 'chain'
  | 'quests'
  | 'peers'
  | 'admin';

/** @deprecated Utiliser BottomDockTab — alias legacy */
export type LegacyBottomDockTab = BottomDockTab | 'pending' | 'block';

export type QuestNavigateAction =
  | 'faucet'
  | 'swap'
  | 'explore-blocks'
  | 'showcase-tours'
  | 'market'
  | 'peers';

const OVERLAY_TO_BOTTOM_TAB: Record<OverlayPanel, BottomDockTab> = {
  pending: 'transactions',
  composer: 'transactions',
  chain: 'chain',
  wallet: 'wallet',
  peers: 'peers',
};

const OVERLAY_TO_SUB_TAB: Partial<Record<OverlayPanel, TransactionSubTab>> = {
  pending: 'mempool',
  composer: 'composer',
};

@Injectable({ providedIn: 'root' })
export class DockNavigationService {
  private readonly tabRequestSubject = new Subject<BottomDockTab>();
  private readonly questActionSubject = new Subject<QuestNavigateAction>();

  readonly tabRequest$ = this.tabRequestSubject.asObservable();
  readonly questAction$ = this.questActionSubject.asObservable();
  /** @deprecated Utiliser requestTab — conservé pour compatibilité des summaries / events */
  readonly blockchainPanelRequest$ = this.tabRequestSubject.asObservable();

  constructor(private readonly transactionsDock: TransactionsDockService) {}

  requestTab(tab: BottomDockTab | 'pending' | 'block'): void {
    const normalized = this.normalizeTab(tab);
    this.tabRequestSubject.next(normalized);
  }

  requestQuestAction(action: QuestNavigateAction): void {
    this.questActionSubject.next(action);
  }

  requestBlockchainPanel(panel: OverlayPanel): void {
    const subTab = OVERLAY_TO_SUB_TAB[panel];
    if (subTab === 'composer') {
      this.transactionsDock.showComposer();
    } else if (subTab === 'mempool') {
      this.transactionsDock.showMempool();
    }

    this.requestTab(OVERLAY_TO_BOTTOM_TAB[panel]);
  }

  static overlayToBottomTab(panel: OverlayPanel): BottomDockTab {
    return OVERLAY_TO_BOTTOM_TAB[panel];
  }

  private normalizeTab(tab: BottomDockTab | 'pending' | 'block'): BottomDockTab {
    if (tab === 'pending') {
      this.transactionsDock.showMempool();
      return 'transactions';
    }

    if (tab === 'block') {
      this.transactionsDock.showComposer();
      return 'transactions';
    }

    return tab;
  }
}
