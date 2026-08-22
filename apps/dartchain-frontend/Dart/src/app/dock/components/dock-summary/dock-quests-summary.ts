import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { COLLAPSED_SUMMARY_BAR_CLASS } from '@dock/models/collapsed-summary.model';
import { DockQuestsStateService } from '@dock/services/dock-quests-state.service';
import { QuestsPanelService } from '@quests/quests-panel/quests-panel.service';
import { WalletSessionService } from '@wallet/services/wallet-session.service';
import { CURRENT_MISSION } from '@quests/quests-panel/quests-panel.constants';

@Component({
  selector: 'app-dock-quests-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock-quests-summary.html',
  styleUrls: ['./dock-quests-summary.css', './dock-summary-shared.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockQuestsSummaryComponent implements OnInit, OnDestroy {
  private static readonly ROTATE_MS = 5_000;

  protected readonly state = inject(DockQuestsStateService);
  private readonly quests = inject(QuestsPanelService);
  private readonly walletSession = inject(WalletSessionService);

  @HostBinding('class')
  readonly hostClasses = `${COLLAPSED_SUMMARY_BAR_CLASS} dock-summary-bar__content is-quests`;

  @HostBinding('class.is-collapsed')
  readonly collapsedClass = true;

  readonly rotateIndex = signal(0);
  readonly claiming = signal(false);

  private rotateTimer: number | null = null;

  /** Quêtes pas encore réalisées (incomplètes). */
  readonly incompleteQuests = computed(() =>
    this.state.taskViews().filter((task) => !task.complete)
  );

  readonly displayedQuest = computed(() => {
    const list = this.incompleteQuests();
    if (list.length === 0) {
      return null;
    }
    return list[this.rotateIndex() % list.length] ?? null;
  });

  readonly displayedQuestTitle = computed(() => {
    if (this.state.loading() && this.state.taskViews().length === 0) {
      return 'Chargement…';
    }
    if (this.state.error() && this.state.taskViews().length === 0) {
      return 'Quêtes indisponibles';
    }
    const quest = this.displayedQuest();
    if (quest) {
      return quest.title;
    }
    return 'Toutes les quêtes réalisées';
  });

  readonly canClaim = computed(() => {
    if (this.claiming()) {
      return false;
    }
    return this.state.claimableCount() > 0;
  });

  readonly claimDisabled = computed(() => !this.canClaim());

  readonly barAriaLabel = computed(() =>
    [
      CURRENT_MISSION.title,
      this.displayedQuestTitle(),
      this.canClaim() ? 'récompense disponible' : null,
    ]
      .filter(Boolean)
      .join(' · ')
  );

  constructor() {
    effect(() => {
      const len = this.incompleteQuests().length;
      if (len === 0) {
        this.rotateIndex.set(0);
        return;
      }
      if (this.rotateIndex() >= len) {
        this.rotateIndex.set(0);
      }
    });
  }

  ngOnInit(): void {
    void this.state.load();
    window.addEventListener('dartchain-refresh-dock', this.onGlobalRefresh);
    this.rotateTimer = window.setInterval(() => {
      const len = this.incompleteQuests().length;
      if (len <= 1) {
        return;
      }
      this.rotateIndex.update((i) => (i + 1) % len);
    }, DockQuestsSummaryComponent.ROTATE_MS);
  }

  ngOnDestroy(): void {
    window.removeEventListener('dartchain-refresh-dock', this.onGlobalRefresh);
    if (this.rotateTimer !== null) {
      window.clearInterval(this.rotateTimer);
      this.rotateTimer = null;
    }
  }

  private onGlobalRefresh = (): void => {
    this.state.refresh();
  };

  async onClaimQuest(event: Event): Promise<void> {
    event.stopPropagation();
    if (!this.canClaim() || this.claiming()) {
      return;
    }

    this.claiming.set(true);
    try {
      const ok = await this.claimNextReward();
      if (ok) {
        this.walletSession.requestBalanceRefresh();
        window.dispatchEvent(new CustomEvent('dartchain-refresh-dock'));
      }
    } finally {
      this.claiming.set(false);
    }
  }

  /**
   * Réclame la quête affichée si claimable, sinon la première claimable,
   * sinon mission / weekly.
   */
  private async claimNextReward(): Promise<boolean> {
    const views = this.state.taskViews();
    const current = this.displayedQuest();
    const preferred =
      current && current.claimable
        ? current
        : views.find((task) => task.claimable) ?? null;

    if (preferred) {
      const result = await this.quests.claimTask(preferred.id);
      return result.ok;
    }

    const snapshot = this.state.state();
    if (snapshot && this.quests.missionProgress(snapshot) >= 100 && !snapshot.missionClaimed) {
      const result = await this.quests.claimMission();
      return result.ok;
    }

    if (snapshot && this.quests.allDailyClaimed(snapshot) && !snapshot.weeklyClaimed) {
      const result = await this.quests.claimWeekly();
      return result.ok;
    }

    return false;
  }
}
