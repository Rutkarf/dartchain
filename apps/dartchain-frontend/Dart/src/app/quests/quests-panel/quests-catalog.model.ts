import { QuestNavigateAction } from '@dock/services/dock-navigation.service';

export interface DailyQuestDefinition {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardMts: number;
  rewardXp: number;
  action: QuestNavigateAction | 'login';
}

export interface QuestMissionDefinition {
  id: string;
  title: string;
  description: string;
  rewardMts: number;
  rewardXp: number;
  progressTarget: number;
}

export interface QuestWeeklyDefinition {
  rewardMts: number;
  xpBoostPercent: number;
}

export interface QuestCatalogResponse {
  dailyTasks: Array<
    DailyQuestDefinition & {
      serverHooked: boolean;
    }
  >;
  mission: QuestMissionDefinition;
  weekly: QuestWeeklyDefinition;
  serverHookedTaskIds: string[];
}
