import type { StarQuest } from './star-conquest.model';
import { buildStarConquestSelectionSnapshot } from './star-conquest-selection';

export interface StarConquestHudChip {
  visible: boolean;
  title: string;
  meta: string;
}

export function buildStarConquestHudChip(
  quest: StarQuest | null,
  claimed: number,
  catalog: number
): StarConquestHudChip {
  if (!quest) {
    return {
      visible: true,
      title: 'Star Conquest',
      meta: `${claimed}/${catalog}`,
    };
  }
  const snap = buildStarConquestSelectionSnapshot(quest);
  return {
    visible: true,
    title: snap.title,
    meta: `${snap.actionHint} · ${claimed}/${catalog}`,
  };
}
