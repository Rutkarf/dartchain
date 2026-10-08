import type { DailyQuestDefinition } from './quests-catalog.model';

export type { DailyQuestDefinition };

export const QUESTS_STORAGE_KEY = 'dart_quests_state_v1';

/** Fallback local — préférer `GET /api/quests/catalog` (Phase Q). */

/** Quêtes dont la progression est validée côté serveur (pas de POST /progress). */
export const SERVER_HOOKED_QUEST_IDS = new Set([
  'daily-login',
  'faucet-claim',
  'explore-blocks',
  'swap-tokens',
]);

export const CURRENT_MISSION = {
  id: 'network-guardian',
  title: 'Gardien du réseau',
  description: 'Maintiens l’intégrité du réseau en terminant les tâches quotidiennes et hebdomadaires.',
  rewardMts: 1,
  rewardXp: 150,
  progressTarget: 100,
} as const;

export const WEEKLY_REWARD = {
  rewardMts: 1,
  xpBoostPercent: 20,
} as const;

/** @deprecated Fallback local — préférer QuestsPanelService.getDailyQuests(). */
export const DAILY_QUESTS: readonly DailyQuestDefinition[] = [
  {
    id: 'daily-login',
    title: 'Connexion quotidienne',
    description: 'Connecte-toi à l’application',
    target: 1,
    rewardMts: 1,
    rewardXp: 10,
    action: 'login',
  },
  {
    id: 'faucet-claim',
    title: 'Réclamation du robinet',
    description: 'Réclame depuis le robinet',
    target: 1,
    rewardMts: 1,
    rewardXp: 15,
    action: 'faucet',
  },
  {
    id: 'explore-blocks',
    title: 'Explorer les blocs',
    description: 'Ouvrir le détail d’un bloc dans l’explorateur',
    target: 5,
    rewardMts: 1,
    rewardXp: 20,
    action: 'explore-blocks',
  },
  {
    id: 'swap-tokens',
    title: 'Échanger des jetons',
    description: 'Échanger un jeton du laboratoire (hors paires BTC/ETH standard) via le panneau d’échange',
    target: 10,
    rewardMts: 1,
    rewardXp: 25,
    action: 'swap',
  },
];
