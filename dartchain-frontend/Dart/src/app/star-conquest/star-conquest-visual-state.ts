import type { StarQuestStatus } from './star-conquest.model';

export type StarQuestVisualState =
  | 'idle'
  | 'hover'
  | 'selected'
  | 'linked'
  | 'locked'
  | 'completed'
  | 'future'
  | 'active';

export interface StarQuestVisualTone {
  vertex: number;
  halo: number;
}

/** Hiérarchie visuelle 250×550 — repos calme, focus lisible. */
export const STAR_QUEST_VISUAL_TONE: Record<StarQuestVisualState, StarQuestVisualTone> = {
  idle: { vertex: 0.58, halo: 0.42 },
  hover: { vertex: 1.05, halo: 0.92 },
  selected: { vertex: 1.18, halo: 1.2 },
  linked: { vertex: 0.92, halo: 0.78 },
  locked: { vertex: 0.32, halo: 0.22 },
  completed: { vertex: 0.48, halo: 0.36 },
  future: { vertex: 0.3, halo: 0.2 },
  active: { vertex: 0.82, halo: 0.7 },
};

export function starQuestVisualState(params: {
  status: StarQuestStatus;
  focused: boolean;
  hovered: boolean;
  linked: boolean;
}): StarQuestVisualState {
  if (params.focused) return 'selected';
  if (params.hovered) return 'hover';
  if (params.linked) return 'linked';
  if (params.status === 'locked') return 'locked';
  if (params.status === 'future') return 'future';
  if (params.status === 'completed') return 'completed';
  if (params.status === 'active') return 'active';
  return 'idle';
}

export function starQuestVisualTone(state: StarQuestVisualState): StarQuestVisualTone {
  return STAR_QUEST_VISUAL_TONE[state];
}
