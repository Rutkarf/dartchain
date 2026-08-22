import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { QuestsPanelService } from '@quests/quests-panel/quests-panel.service';
import { StarConquestFacade } from './star-conquest.facade';
import type { QuestTaskView } from '@quests/quests-panel/quests-panel.model';
import { STAR_CONQUEST_MOCK_QUESTS } from '../../particle-background/star-conquest/star-conquest.mock';
import type { StarQuest } from '../../particle-background/star-conquest/star-conquest.model';
import {
  claimedQuestCount,
  claimStarQuest,
  emptyStarConquestProgress,
  hydrateStarQuestCatalog,
  incrementStarConquestFunnel,
  loadStarConquestProgress,
  markStarQuestsClaimed,
  previewM4T3RTotal,
  saveStarConquestProgress,
  type StarConquestClaimResult,
  type StarConquestFunnelStep,
  type StarConquestProgressSnapshot,
} from '../../particle-background/star-conquest/star-conquest-progress';
import {
  evaluateStarConquestCommercial,
  formatStarConquestKpiLine,
} from '../../particle-background/star-conquest/star-conquest-commercial';
import {
  STAR_CONQUEST_LIVE_LINKS,
  isStarConquestLiveQuest,
  starConquestLiveLink,
  starQuestIdsCompletedByLiveTasks,
  type StarConquestLiveLink,
} from '../../particle-background/star-conquest/star-conquest-live';

/**
 * Progression Star Conquest : preview local + sync des quêtes Dock live.
 */
@Injectable({ providedIn: 'root' })
export class StarConquestProgressService {
  private readonly questsPanel = inject(QuestsPanelService);
  private readonly facade = inject(StarConquestFacade);
  private readonly destroyRef = inject(DestroyRef);

  readonly catalog = STAR_CONQUEST_MOCK_QUESTS;
  readonly catalogCount = STAR_CONQUEST_MOCK_QUESTS.length;
  readonly liveLinkCount = STAR_CONQUEST_LIVE_LINKS.length;

  private readonly store = signal<StarConquestProgressSnapshot>(loadStarConquestProgress());

  readonly snapshot = this.store.asReadonly();
  readonly claimedCount = computed(() => claimedQuestCount(this.store()));
  readonly previewM4T3R = computed(() => previewM4T3RTotal(this.store()));
  readonly funnel = computed(() => this.store().funnel);
  readonly liveCompletedCount = computed(() => {
    const claimed = this.store().claimed;
    return STAR_CONQUEST_MOCK_QUESTS.filter(
      (quest) => isStarConquestLiveQuest(quest.id) && claimed[quest.id]
    ).length;
  });
  readonly commercial = computed(() =>
    evaluateStarConquestCommercial(this.store(), this.catalogCount, this.liveLinkCount)
  );
  readonly kpiLine = computed(() => formatStarConquestKpiLine(this.commercial()));

  constructor() {
    this.questsPanel.state$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.syncFromLiveQuests(this.questsPanel.buildTaskViews(state));
      });
  }

  hydrateCatalog(
    catalog: readonly StarQuest[] = this.catalog
  ): StarQuest[] {
    return hydrateStarQuestCatalog(catalog, this.store());
  }

  liveLink(starQuestId: string): StarConquestLiveLink | undefined {
    return starConquestLiveLink(starQuestId);
  }

  liveTask(starQuestId: string): QuestTaskView | undefined {
    const link = starConquestLiveLink(starQuestId);
    if (!link || link.kind !== 'task') return undefined;
    return this.questsPanel.buildTaskViews().find((task) => task.id === link.taskId);
  }

  isLiveComplete(starQuestId: string): boolean {
    return Boolean(this.store().claimed[starQuestId]);
  }

  recordFunnel(step: StarConquestFunnelStep): void {
    this.persist(incrementStarConquestFunnel(this.store(), step));
  }

  claim(questId: string): StarConquestClaimResult {
    const quest = this.hydrateCatalog().find((item) => item.id === questId);
    if (isStarConquestLiveQuest(questId) && !this.store().claimed[questId]) {
      return {
        ok: false,
        reason: 'action-required',
        snapshot: this.store(),
        quest,
      };
    }
    const result = claimStarQuest(this.catalog, this.store(), questId);
    if (result.ok) {
      this.persist(result.snapshot);
    }
    return result;
  }

  /** Surface Dock/Showcase : conquête = l’utilisateur a ouvert le produit. */
  completeNavigate(questId: string): StarConquestClaimResult {
    const link = starConquestLiveLink(questId);
    const quest = this.hydrateCatalog().find((item) => item.id === questId);
    if (!link || link.kind !== 'navigate') {
      return { ok: false, reason: 'action-required', snapshot: this.store(), quest };
    }
    if (this.store().claimed[questId]) {
      return { ok: false, reason: 'already-claimed', snapshot: this.store(), quest };
    }
    const next = markStarQuestsClaimed(this.catalog, this.store(), [questId]);
    this.persist(next);
    this.facade.notifyProgress(questId);
    const claimed = this.hydrateCatalog().find((item) => item.id === questId);
    if (!claimed) {
      return { ok: false, reason: 'missing', snapshot: this.store() };
    }
    return { ok: true, snapshot: next, quest: claimed };
  }

  resetForTests(): void {
    this.persist(emptyStarConquestProgress());
  }

  private syncFromLiveQuests(views: readonly QuestTaskView[]): void {
    const done = new Set(
      views.filter((task) => task.complete || task.autoClaimed).map((task) => task.id)
    );
    const next = markStarQuestsClaimed(
      this.catalog,
      this.store(),
      starQuestIdsCompletedByLiveTasks(done)
    );
    if (next === this.store()) return;
    this.persist(next);
    this.facade.notifyProgress();
  }

  private persist(snapshot: StarConquestProgressSnapshot): void {
    this.store.set(snapshot);
    saveStarConquestProgress(snapshot);
  }
}
