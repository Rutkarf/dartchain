/**
 * Pont Star Conquest → surfaces produit DartChain (Dock / Showcase).
 * Une étoile live se conquiert par une action réelle, pas un clic magique.
 * Couverture commerciale = lignes de cette table, pas un nouveau graphe.
 */

import type { QuestNavigateAction } from '../../core/services/dock-navigation.service';

export type StarConquestLiveNavigate =
  | QuestNavigateAction
  | 'login'
  | 'quests'
  | 'wallet'
  | 'transactions';

export interface StarConquestLiveTaskLink {
  kind: 'task';
  starQuestId: string;
  taskId: string;
  action: StarConquestLiveNavigate;
  ctaLabel: string;
}

export interface StarConquestLiveHubLink {
  kind: 'hub';
  starQuestId: string;
  action: 'quests';
  ctaLabel: string;
}

export interface StarConquestLiveNavigateLink {
  kind: 'navigate';
  starQuestId: string;
  action: StarConquestLiveNavigate;
  ctaLabel: string;
}

export type StarConquestLiveLink =
  | StarConquestLiveTaskLink
  | StarConquestLiveHubLink
  | StarConquestLiveNavigateLink;

/** 4 quêtes serveur + 1 hub + 3 surfaces Dock/Showcase. */
export const STAR_CONQUEST_LIVE_LINKS: readonly StarConquestLiveLink[] = [
  {
    kind: 'task',
    starQuestId: 'sc-security-auth',
    taskId: 'daily-login',
    action: 'login',
    ctaLabel: 'Se connecter',
  },
  {
    kind: 'task',
    starQuestId: 'sc-dock-faucet',
    taskId: 'faucet-claim',
    action: 'faucet',
    ctaLabel: 'Ouvrir le faucet',
  },
  {
    kind: 'task',
    starQuestId: 'sc-swap-confirm',
    taskId: 'swap-tokens',
    action: 'swap',
    ctaLabel: 'Aller au swap',
  },
  {
    kind: 'task',
    starQuestId: 'sc-dock-chain',
    taskId: 'explore-blocks',
    action: 'explore-blocks',
    ctaLabel: 'Explorer un bloc',
  },
  {
    kind: 'hub',
    starQuestId: 'sc-backend-quests',
    action: 'quests',
    ctaLabel: 'Ouvrir Quêtes',
  },
  {
    kind: 'navigate',
    starQuestId: 'sc-wallet-copy',
    action: 'wallet',
    ctaLabel: 'Ouvrir le wallet',
  },
  {
    kind: 'navigate',
    starQuestId: 'sc-dock-mempool',
    action: 'transactions',
    ctaLabel: 'Ouvrir le mempool',
  },
  {
    kind: 'navigate',
    starQuestId: 'sc-showcase-chat',
    action: 'showcase-tours',
    ctaLabel: 'Ouvrir Showcase',
  },
] as const;

export const STAR_CONQUEST_LIVE_HUB_ID = 'sc-backend-quests';

const LIVE_BY_STAR = new Map(STAR_CONQUEST_LIVE_LINKS.map((link) => [link.starQuestId, link]));

export function starConquestLiveLink(starQuestId: string): StarConquestLiveLink | undefined {
  return LIVE_BY_STAR.get(starQuestId);
}

export function isStarConquestLiveQuest(starQuestId: string): boolean {
  return LIVE_BY_STAR.has(starQuestId);
}

export function starConquestLiveTaskLinks(): readonly StarConquestLiveTaskLink[] {
  return STAR_CONQUEST_LIVE_LINKS.filter(
    (link): link is StarConquestLiveTaskLink => link.kind === 'task'
  );
}

export function starConquestLiveNavigateLinks(): readonly StarConquestLiveNavigateLink[] {
  return STAR_CONQUEST_LIVE_LINKS.filter(
    (link): link is StarConquestLiveNavigateLink => link.kind === 'navigate'
  );
}

/**
 * Étoiles à marquer conquises quand des tâches Dock sont terminées.
 * Le hub se complète seulement si les 4 tâches live le sont.
 * Les surfaces `navigate` se complètent au CTA produit, pas ici.
 */
export function starQuestIdsCompletedByLiveTasks(
  doneTaskIds: ReadonlySet<string>
): readonly string[] {
  const ids: string[] = [];
  const tasks = starConquestLiveTaskLinks();
  for (const link of tasks) {
    if (doneTaskIds.has(link.taskId)) ids.push(link.starQuestId);
  }
  if (tasks.length > 0 && tasks.every((link) => doneTaskIds.has(link.taskId))) {
    ids.push(STAR_CONQUEST_LIVE_HUB_ID);
  }
  return ids;
}
