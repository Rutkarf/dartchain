/**
 * Présentation du panneau Quest — hors template.
 * Preview M4T3R ≠ crédit faucet / MTS Dock.
 */

import type { QuestTaskView } from '@quests/quests-panel/quests-panel.model';
import { STAR_QUEST_FAMILIES, type StarQuestFamily } from './star-conquest-families';
import type { StarConquestLiveLink } from './star-conquest-live';
import type { StarConquestClaimReason } from './star-conquest-progress';
import {
  STAR_QUEST_STATUS_LABEL,
  starQuestClaimKind,
  type StarQuest,
  type StarQuestClaimKind,
  type StarQuestStatus,
} from './star-conquest.model';

export function starQuestFamilyLabel(family: StarQuestFamily): string {
  return STAR_QUEST_FAMILIES[family]?.label ?? family;
}

export function starQuestFamilyHex(family: StarQuestFamily): string {
  return STAR_QUEST_FAMILIES[family]?.hex ?? '#4FE0EC';
}

export function starQuestFamilyRgb(family: StarQuestFamily): string {
  const rgb = STAR_QUEST_FAMILIES[family]?.rgb255 ?? [79, 224, 236];
  return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
}

export function starQuestStatusLabel(status: StarQuestStatus): string {
  return STAR_QUEST_STATUS_LABEL[status];
}

export function starQuestCtaLabel(
  kind: StarQuestClaimKind,
  live: StarConquestLiveLink | undefined
): string {
  if (kind === 'completed') return 'Conquise';
  if (live) return live.ctaLabel;
  if (kind === 'locked') return 'À débloquer';
  if (kind === 'future') return 'Roadmap';
  return 'Conquérir';
}

export function starQuestCtaEnabled(
  kind: StarQuestClaimKind,
  live: StarConquestLiveLink | undefined
): boolean {
  if (live) return kind !== 'completed';
  return kind === 'claim';
}

export function starQuestRewardCopy(
  live: StarConquestLiveLink | undefined,
  liveTask: QuestTaskView | undefined,
  kind: StarQuestClaimKind,
  rewardM4T3R: number
): { label: string; value: string } {
  if (liveTask) {
    return {
      label: 'Quête Dock',
      value: `${liveTask.rewardMts} MTS · ${liveTask.rewardXp} XP`,
    };
  }
  if (live?.kind === 'navigate') {
    return { label: 'Surface produit', value: 'Ouvrir dans l’app' };
  }
  if (live) {
    return { label: 'Hub live', value: '4 quêtes Dock' };
  }
  return {
    label: kind === 'completed' ? 'Preview local' : 'Gain estimé',
    value: `${rewardM4T3R} M4T3R`,
  };
}

export function starQuestHint(params: {
  live: boolean;
  kind: StarQuestClaimKind;
  playerClaimed: boolean;
  previewM4T3R: number;
}): string {
  if (params.live && params.kind === 'completed') return 'Alignée sur la quête Dock.';
  if (params.live) return 'Fais l’action dans l’app — pas de clic magique.';
  if (params.kind === 'claim') return 'Conquête locale — pas de crédit faucet.';
  if (params.kind === 'locked') return 'Conquis un voisin pour débloquer.';
  if (params.kind === 'completed' && params.playerClaimed) {
    return `Enregistrée en preview (${params.previewM4T3R} M4T3R).`;
  }
  if (params.kind === 'completed') return 'Livrée dans le catalogue produit.';
  return 'Pas encore ouvrable.';
}

export const STAR_QUEST_CLAIM_ERROR_MESSAGE: Record<StarConquestClaimReason, string> = {
  missing: 'Cette étoile n’est plus dans le catalogue.',
  locked: 'Conquis un voisin pour débloquer.',
  future: 'Pas encore ouvrable.',
  'already-claimed': 'Déjà conquise.',
  'action-required': 'Fais l’action dans l’app — pas de clic magique.',
};

export interface StarQuestPanelView {
  quest: StarQuest;
  x: number;
  y: number;
  compact: boolean;
  familyLabel: string;
  familyHex: string;
  familyRgb: string;
  statusLabel: string;
  claimKind: StarQuestClaimKind;
  live: boolean;
  ctaLabel: string;
  ctaEnabled: boolean;
  rewardLabel: string;
  rewardValue: string;
  hint: string;
}

export function buildStarQuestPanelView(params: {
  quest: StarQuest;
  x: number;
  y: number;
  compact: boolean;
  live: StarConquestLiveLink | undefined;
  liveTask: QuestTaskView | undefined;
  playerClaimed: boolean;
  previewM4T3R: number;
}): StarQuestPanelView {
  const kind = starQuestClaimKind(params.quest.status);
  const reward = starQuestRewardCopy(
    params.live,
    params.liveTask,
    kind,
    params.quest.rewardM4T3R
  );
  return {
    quest: params.quest,
    x: params.x,
    y: params.y,
    compact: params.compact,
    familyLabel: starQuestFamilyLabel(params.quest.family),
    familyHex: starQuestFamilyHex(params.quest.family),
    familyRgb: starQuestFamilyRgb(params.quest.family),
    statusLabel: starQuestStatusLabel(params.quest.status),
    claimKind: kind,
    live: Boolean(params.live),
    ctaLabel: starQuestCtaLabel(kind, params.live),
    ctaEnabled: starQuestCtaEnabled(kind, params.live),
    rewardLabel: reward.label,
    rewardValue: reward.value,
    hint: starQuestHint({
      live: Boolean(params.live),
      kind,
      playerClaimed: params.playerClaimed,
      previewM4T3R: params.previewM4T3R,
    }),
  };
}
