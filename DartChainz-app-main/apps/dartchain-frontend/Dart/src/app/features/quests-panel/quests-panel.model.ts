import { DailyQuestDefinition } from './quests-panel.constants';

export interface QuestTaskState {
  progress: number;
  claimed: boolean;
}

export interface QuestPersistedState {
  dayKey: string;
  tasks: Record<string, QuestTaskState>;
  missionClaimed: boolean;
  weeklyClaimed: boolean;
  totalXp: number;
  pendingMts: number;
}

export interface QuestTaskView extends DailyQuestDefinition {
  progress: number;
  complete: boolean;
  claimable: boolean;
  progressLabel: string;
}
