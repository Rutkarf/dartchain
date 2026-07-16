import { DailyQuestDefinition } from './quests-catalog.model';

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
  exploredBlockIndices?: number[];
}

export interface QuestTaskView extends DailyQuestDefinition {
  progress: number;
  complete: boolean;
  claimable: boolean;
  progressLabel: string;
  autoHooked: boolean;
  autoClaimed: boolean;
  pendingWallet: boolean;
}

export interface QuestClaimResult {
  ok: boolean;
  error?: string;
}

export interface ExploreBlockResult {
  progressed: boolean;
  duplicate: boolean;
  progress: number;
  target: number;
}
