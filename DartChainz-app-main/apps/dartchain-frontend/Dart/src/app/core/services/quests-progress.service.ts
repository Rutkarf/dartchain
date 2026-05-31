import { Injectable, inject } from '@angular/core';

import { QuestsPanelService } from '../../features/quests-panel/quests-panel.service';

/** Pont léger vers la progression des quêtes (faucet, swap, blocks…). */
@Injectable({ providedIn: 'root' })
export class QuestsProgressService {
  private readonly quests = inject(QuestsPanelService);

  recordDailyLogin(): void {
    this.quests.recordProgress('daily-login', 1);
  }

  recordFaucetClaim(): void {
    this.quests.recordProgress('faucet-claim', 1);
  }

  recordBlockExplored(): void {
    this.quests.recordProgress('explore-blocks', 1);
  }

  recordSwap(): void {
    this.quests.recordProgress('swap-tokens', 1);
  }
}
