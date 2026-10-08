/**
 * Budgets spatiaux MVP — viewport canonique 250 × 550, zero-scroll.
 * Tout déplié : navbar 32 + exchange 32 + showcase 96 + dock 96 + chart 80
 * + 4 coutures 2 + marge floor 6 + floor 200 = 550.
 * Le floor rendu (≤349) prend le reste du viewport ; 200 est le résultat à 550 tout ouvert.
 */

export const TARGET_VIEWPORT = {
  width: 250,
  height: 550,
  minWidth: 250,
  maxWidth: 250,
  minHeight: 550,
  maxHeight: 550,
} as const;

export const READING_ORDER = [
  'navbar',
  'chart',
  'exchange',
  'showcase-header',
  'showcase-panel',
  'bottom-panel',
  'bottom-dock',
  'floor-peek',
] as const;

export type LayoutZoneId = (typeof READING_ORDER)[number];

/**
 * Budgets dépliés @ 250×550.
 * min = replié, target = déplié. Floor target = résultat tout ouvert à 550 px.
 */
export const LAYOUT_ZONE_BUDGET_PX: Record<LayoutZoneId, { min: number; target: number; max: number }> = {
  navbar: { min: 32, target: 32, max: 32 },
  exchange: { min: 32, target: 32, max: 32 },
  chart: { min: 16, target: 80, max: 80 },
  'showcase-header': { min: 16, target: 16, max: 16 },
  'showcase-panel': { min: 16, target: 80, max: 80 },
  'bottom-panel': { min: 16, target: 80, max: 80 },
  'bottom-dock': { min: 16, target: 16, max: 16 },
  'floor-peek': { min: 0, target: 200, max: 200 },
};

/** Écarts entre bandes majeures (grille 2px). */
export const LAYOUT_BAND_GAP_PX = 2;

/** Marge visuelle Graph → floor (hors hauteur canvas). */
export const GRAPH_FLOOR_GAP_PX = 6;

/** Ratio largeur interne hub (si colonnes) — chart reste dominant. */
export const HUB_MARKET_COLUMNS = {
  exchange: 7,
  chart: 13,
} as const;
