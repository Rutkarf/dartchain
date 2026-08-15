/**
 * Budgets spatiaux MVP — viewport exclusif 250 × 550, zero-scroll.
 * Ordre : navbar → swap → showcase → dock → graph → floor-peek
 * Somme dépliée (zones + 3×gap 2px + nav-gap 2px + marge graph→floor 6px) ≤ 550.
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
 * Budgets dépliés @ 250×550 (zero-scroll).
 * Chart / dock / activity compacts ; floor peek réservé sous Graph.
 */
export const LAYOUT_ZONE_BUDGET_PX: Record<LayoutZoneId, { min: number; target: number; max: number }> = {
  navbar: { min: 28, target: 32, max: 34 },
  exchange: { min: 12, target: 16, max: 18 },
  chart: { min: 112, target: 136, max: 148 },
  'showcase-header': { min: 12, target: 14, max: 16 },
  'showcase-panel': { min: 88, target: 108, max: 116 },
  'bottom-panel': { min: 96, target: 118, max: 128 },
  'bottom-dock': { min: 12, target: 14, max: 16 },
  'floor-peek': { min: 52, target: 64, max: 72 },
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
