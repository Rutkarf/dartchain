import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { QuestsPanelService } from '@quests/quests-panel/quests-panel.service';
import { QuestPersistedState } from '@quests/quests-panel/quests-panel.model';
import { formatDockRelativeTime } from '../utils/dock-time.util';

export type DockQuestsPhase = 'error' | 'loading' | 'ready' | 'urgent';

@Injectable({ providedIn: 'root' })
export class DockQuestsStateService {
  private readonly quests = inject(QuestsPanelService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly state = signal<QuestPersistedState | null>(null);
  readonly lastUpdatedAt = signal<number | null>(null);

  readonly taskViews = computed(() => {
    const snapshot = this.state();
    if (!snapshot) {
      return [];
    }
    return this.quests.buildTaskViews(snapshot);
  });

  readonly activeCount = computed(
    () => this.taskViews().filter((task) => !task.complete).length
  );

  readonly claimableCount = computed(() => {
    const snapshot = this.state();
    if (!snapshot) {
      return 0;
    }

    let count = this.taskViews().filter((task) => task.claimable || task.pendingWallet).length;

    if (this.quests.missionProgress(snapshot) >= 100 && !snapshot.missionClaimed) {
      count += 1;
    }

    if (this.quests.allDailyClaimed(snapshot) && !snapshot.weeklyClaimed) {
      count += 1;
    }

    return count;
  });

  readonly missionProgress = computed(() => {
    const snapshot = this.state();
    if (!snapshot) {
      return 0;
    }
    return this.quests.missionProgress(snapshot);
  });

  readonly phase = computed((): DockQuestsPhase => {
    if (this.error()) {
      return 'error';
    }
    if (this.loading()) {
      return 'loading';
    }
    if (this.claimableCount() > 0) {
      return 'urgent';
    }
    return 'ready';
  });

  readonly statusLabel = computed(() => {
    switch (this.phase()) {
      case 'error':
        return 'Erreur';
      case 'loading':
        return 'Sync…';
      case 'urgent':
        return 'À réclamer';
      default:
        return 'En cours';
    }
  });

  readonly headline = computed(() => {
    const views = this.taskViews();
    if (views.length === 0) {
      return this.error() ? 'Quêtes indisponibles' : 'Chargement des quêtes…';
    }

    const claimable = this.claimableCount();
    if (claimable > 0) {
      return `${claimable} récompense${claimable > 1 ? 's' : ''} prête${claimable > 1 ? 's' : ''}`;
    }

    const next = views.find((task) => !task.complete);
    if (next) {
      return `${next.title} · ${next.progressLabel}`;
    }

    return 'Toutes les quêtes du jour terminées';
  });

  readonly progressLabel = computed(() => {
    const progress = this.missionProgress();
    if (progress <= 0) {
      return '';
    }
    return `Mission ${progress}% · ${this.activeCount()} actives`;
  });

  readonly updatedAgeLabel = computed(() =>
    formatDockRelativeTime(this.lastUpdatedAt())
  );

  constructor() {
    this.quests.state$.pipe(takeUntilDestroyed()).subscribe((state) => {
      this.state.set(state);
      this.lastUpdatedAt.set(Date.now());
    });
  }

  async load(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    try {
      await this.quests.refreshAll();
      this.lastUpdatedAt.set(Date.now());
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  refresh(): void {
    void this.load();
  }
}
