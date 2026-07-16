import { Injectable, inject, signal } from '@angular/core';

import { QuestsPanelService } from '../../features/quests-panel/quests-panel.service';
import { ShowcaseLaunchStateService } from './showcase-launch-state.service';
import { WalletSessionService } from './wallet-session.service';

export type QuestFeedbackKind = 'success' | 'info' | 'error';

export interface QuestFeedback {
  message: string;
  kind: QuestFeedbackKind;
}

/** Pont léger vers la progression des quêtes (faucet, swap, blocks…). */
@Injectable({ providedIn: 'root' })
export class QuestsProgressService {
  private readonly quests = inject(QuestsPanelService);
  private readonly walletSession = inject(WalletSessionService);
  private readonly launchState = inject(ShowcaseLaunchStateService);

  private feedbackTimer: number | null = null;

  readonly feedback = signal<QuestFeedback | null>(null);

  constructor() {
    this.launchState.loadProjects();
  }

  recordDailyLogin(): void {
    if (this.quests.isAuthenticated()) {
      this.quests.syncFromServer();
      return;
    }

    void this.quests.recordProgress('daily-login', 1);
  }

  recordFaucetClaim(): Promise<void> {
    if (this.quests.isAuthenticated()) {
      this.quests.syncFromServer();
      this.walletSession.requestBalanceRefresh();
      return Promise.resolve();
    }

    return this.quests.recordProgress('faucet-claim', 1).then(() => {
      this.walletSession.requestBalanceRefresh();
    });
  }

  recordBlockExplored(blockIndex: number): Promise<void> {
    return this.quests.exploreBlock(blockIndex).then((result) => {
      if (result.progressed) {
        this.notify(
          `Explore Blocks : ${result.progress}/${result.target}`,
          'info'
        );
      } else if (result.duplicate) {
        this.notify(`Bloc #${blockIndex} déjà exploré aujourd’hui`, 'info');
      }

      this.walletSession.requestBalanceRefresh();
    });
  }

  recordSwap(fromToken: string, toToken: string): Promise<void> {
    if (!this.involvesLaunchLabToken(fromToken, toToken)) {
      return Promise.resolve();
    }

    if (this.quests.isAuthenticated()) {
      this.quests.syncFromServer();
      this.walletSession.requestBalanceRefresh();
      return Promise.resolve();
    }

    return this.quests.recordProgress('swap-tokens', 1).then(() => {
      this.walletSession.requestBalanceRefresh();
    });
  }

  syncFromServer(): void {
    this.quests.syncFromServer();
  }

  mergeGuestProgressOnLogin(): Promise<void> {
    return this.quests.mergeGuestProgressOnLogin();
  }

  notify(message: string, kind: QuestFeedbackKind): void {
    this.feedback.set({ message, kind });
    if (this.feedbackTimer !== null) {
      window.clearTimeout(this.feedbackTimer);
    }
    this.feedbackTimer = window.setTimeout(() => {
      this.feedback.set(null);
      this.feedbackTimer = null;
    }, 2800);
  }

  private involvesLaunchLabToken(fromToken: string, toToken: string): boolean {
    const launchSymbols = new Set(
      this.launchState.projects().map((project) => project.symbol.trim().toUpperCase())
    );

    const isLaunchLabOnlyToken = (token: string): boolean => {
      const normalized = token.trim().toUpperCase();
      return launchSymbols.has(normalized) && normalized !== 'R4V3';
    };

    return isLaunchLabOnlyToken(fromToken) || isLaunchLabOnlyToken(toToken);
  }
}
