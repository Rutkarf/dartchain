/**
 * Star Conquest ↔ GitHub Project (colonnes produit).
 *
 * Audit : 2026-08-21 — codebase `improveDynamiqueBar@3d441c9` + rendu
 * https://dartchain.pages.dev (bundle main, catalogue sc-*).
 *
 * Colonnes :
 *   Done      → status `completed`  (shippé live / non reclaimable)
 *   In Progress → status `active`   (chantier ouvert)
 *   Ready     → status `available`  (Todo claimable ou live CTA)
 *   Blocked   → status `locked`     (dépendances)
 *   Icebox    → status `future`     (pas encore branché)
 */

import type { StarQuestStatus } from './star-conquest.model';

export type StarConquestGithubColumn =
  | 'Done'
  | 'In Progress'
  | 'Ready'
  | 'Blocked'
  | 'Icebox';

export const STAR_CONQUEST_GITHUB_COLUMN: Record<StarQuestStatus, StarConquestGithubColumn> =
  {
    completed: 'Done',
    active: 'In Progress',
    available: 'Ready',
    locked: 'Blocked',
    future: 'Icebox',
  };

export function starConquestGithubColumn(status: StarQuestStatus): StarConquestGithubColumn {
  return STAR_CONQUEST_GITHUB_COLUMN[status];
}

/** Snapshot board — recalculé depuis le catalogue mock (pas de sync API GitHub). */
export interface StarConquestGithubBoardCard {
  id: string;
  title: string;
  column: StarConquestGithubColumn;
  family: string;
  live: boolean;
}
