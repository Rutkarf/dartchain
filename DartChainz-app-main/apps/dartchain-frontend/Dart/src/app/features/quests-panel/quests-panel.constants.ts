import { QuestNavigateAction } from '../../core/services/dock-navigation.service';

export const QUESTS_STORAGE_KEY = 'dart_quests_state_v1';

export interface DailyQuestDefinition {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardMts: number;
  rewardXp: number;
  action: QuestNavigateAction | 'login';
}

export const CURRENT_MISSION = {
  id: 'network-guardian',
  title: 'Network Guardian',
  description: 'Maintain network integrity by completing daily and weekly tasks.',
  rewardMts: 25,
  rewardXp: 150,
  progressTarget: 100,
} as const;

export const WEEKLY_REWARD = {
  rewardMts: 100,
  xpBoostPercent: 20,
} as const;

export const DAILY_QUESTS: readonly DailyQuestDefinition[] = [
  {
    id: 'daily-login',
    title: 'Daily Login',
    description: 'Log in to the app',
    target: 1,
    rewardMts: 2,
    rewardXp: 10,
    action: 'login',
  },
  {
    id: 'faucet-claim',
    title: 'Faucet Claim',
    description: 'Claim from the faucet',
    target: 3,
    rewardMts: 2,
    rewardXp: 15,
    action: 'faucet',
  },
  {
    id: 'explore-blocks',
    title: 'Explore Blocks',
    description: 'Open block details',
    target: 5,
    rewardMts: 2,
    rewardXp: 20,
    action: 'showcase-tours',
  },
  {
    id: 'swap-tokens',
    title: 'Swap Tokens',
    description: 'Complete token swaps',
    target: 10,
    rewardMts: 2,
    rewardXp: 25,
    action: 'swap',
  },
];
