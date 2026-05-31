import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import {
  CURRENT_MISSION,
  DAILY_QUESTS,
  QUESTS_STORAGE_KEY,
  WEEKLY_REWARD,
} from './quests-panel.constants';
import { QuestPersistedState, QuestTaskView } from './quests-panel.model';

@Injectable({ providedIn: 'root' })
export class QuestsPanelService {
  private readonly stateSubject = new BehaviorSubject<QuestPersistedState>(this.loadState());

  readonly state$ = this.stateSubject.asObservable();

  snapshot(): QuestPersistedState {
    return this.stateSubject.value;
  }

  refresh(): void {
    this.stateSubject.next(this.normalizeForToday(this.loadState()));
  }

  recordProgress(taskId: string, increment = 1): void {
    const state = this.normalizeForToday(this.snapshot());
    const definition = DAILY_QUESTS.find((quest) => quest.id === taskId);
    if (!definition) {
      return;
    }

    const current = state.tasks[taskId] ?? { progress: 0, claimed: false };
    if (current.claimed) {
      return;
    }

    current.progress = Math.min(definition.target, current.progress + increment);
    state.tasks[taskId] = current;
    this.persist(state);
  }

  claimTask(taskId: string): boolean {
    const state = this.normalizeForToday(this.snapshot());
    const view = this.buildTaskViews(state).find((task) => task.id === taskId);
    if (!view?.claimable) {
      return false;
    }

    const entry = state.tasks[taskId];
    entry.claimed = true;
    state.pendingMts += view.rewardMts;
    state.totalXp += view.rewardXp;
    this.persist(state);
    return true;
  }

  claimMission(): boolean {
    const state = this.normalizeForToday(this.snapshot());
    if (state.missionClaimed || this.missionProgress(state) < 100) {
      return false;
    }

    state.missionClaimed = true;
    state.pendingMts += CURRENT_MISSION.rewardMts;
    state.totalXp += CURRENT_MISSION.rewardXp;
    this.persist(state);
    return true;
  }

  claimWeekly(): boolean {
    const state = this.normalizeForToday(this.snapshot());
    if (state.weeklyClaimed || !this.allDailyClaimed(state)) {
      return false;
    }

    state.weeklyClaimed = true;
    state.pendingMts += WEEKLY_REWARD.rewardMts;
    this.persist(state);
    return true;
  }

  missionProgress(state = this.snapshot()): number {
    if (!DAILY_QUESTS.length) {
      return 0;
    }

    const ratio =
      DAILY_QUESTS.reduce((sum, quest) => {
        const task = state.tasks[quest.id] ?? { progress: 0, claimed: false };
        return sum + Math.min(task.progress / quest.target, 1);
      }, 0) / DAILY_QUESTS.length;

    return Math.round(ratio * 100);
  }

  buildTaskViews(state = this.snapshot()): QuestTaskView[] {
    return DAILY_QUESTS.map((quest) => {
      const task = state.tasks[quest.id] ?? { progress: 0, claimed: false };
      const complete = task.progress >= quest.target;
      return {
        ...quest,
        progress: task.progress,
        complete,
        claimable: complete && !task.claimed,
        progressLabel: `${Math.min(task.progress, quest.target)}/${quest.target}`,
      };
    });
  }

  allDailyClaimed(state = this.snapshot()): boolean {
    return DAILY_QUESTS.every((quest) => state.tasks[quest.id]?.claimed === true);
  }

  msUntilDailyReset(): number {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    return Math.max(0, next.getTime() - now.getTime());
  }

  formatResetCountdown(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  private normalizeForToday(state: QuestPersistedState): QuestPersistedState {
    const dayKey = this.todayKey();
    if (state.dayKey === dayKey) {
      return state;
    }

    const fresh = this.createDefaultState(dayKey);
    fresh.totalXp = state.totalXp;
    fresh.pendingMts = state.pendingMts;
    this.persist(fresh);
    return fresh;
  }

  private loadState(): QuestPersistedState {
    if (typeof localStorage === 'undefined') {
      return this.createDefaultState(this.todayKey());
    }

    try {
      const raw = localStorage.getItem(QUESTS_STORAGE_KEY);
      if (!raw) {
        return this.createDefaultState(this.todayKey());
      }

      const parsed = JSON.parse(raw) as QuestPersistedState;
      return this.normalizeForToday(parsed);
    } catch {
      return this.createDefaultState(this.todayKey());
    }
  }

  private createDefaultState(dayKey: string): QuestPersistedState {
    const tasks: QuestPersistedState['tasks'] = {};
    for (const quest of DAILY_QUESTS) {
      tasks[quest.id] = { progress: 0, claimed: false };
    }

    return {
      dayKey,
      tasks,
      missionClaimed: false,
      weeklyClaimed: false,
      totalXp: 0,
      pendingMts: 0,
    };
  }

  private persist(state: QuestPersistedState): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(state));
    }
    this.stateSubject.next(state);
  }

  private todayKey(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }
}
