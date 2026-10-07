import type { StarQuest } from './star-conquest.model';
import { starQuestClaimKind } from './star-conquest.model';

/** Snapshot DOM-accessible de la sélection — n’altère pas le graphe. */

export interface StarConquestSelectionSnapshot {
  questId: string;
  title: string;
  status: string;
  claimKind: string;
  rewardM4T3R: number;
  family: string;
  actionHint: string;
}

export function buildStarConquestSelectionSnapshot(
  quest: StarQuest
): StarConquestSelectionSnapshot {
  const kind = starQuestClaimKind(quest.status);
  return {
    questId: quest.id,
    title: quest.title,
    status: quest.status,
    claimKind: kind,
    rewardM4T3R: quest.rewardM4T3R,
    family: quest.family,
    actionHint:
      kind === 'claim'
        ? 'Conquérir'
        : kind === 'completed'
          ? 'Déjà conquise'
          : kind === 'locked'
            ? 'Verrouillée'
            : 'Pas encore ouvrable',
  };
}
