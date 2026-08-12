/**
 * Budgets spatiaux MVP — viewport exclusif 250 × 550.
 * Shell scrollable si la somme des zones dépliées dépasse 550.
 * Ordre de priorité visuelle (hauteur relative, état déplié) :
 *   chart ≈ dock > activity > swap > navbar > gaps
 * Note : floor three.js hors budget (peek 0) — ne pas réduire sa scène.
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
 * Budgets dépliés @ 250 largeur (−2px / zone vs budg. d’origine, sauf floor).
 * Graph 194 · Dock ~156 · activity 126 · swap strip 16 · headers 18.
 * La somme dépliée peut dépasser 550 — le shell scrolle verticalement.
 */
export const LAYOUT_ZONE_BUDGET_PX: Record<LayoutZoneId, { min: number; target: number; max: number }> = {
  navbar: { min: 28, target: 32, max: 36 },
  exchange: { min: 14, target: 16, max: 20 },
  chart: { min: 178, target: 194, max: 210 },
  'showcase-header': { min: 16, target: 18, max: 20 },
  'showcase-panel': { min: 98, target: 126, max: 138 },
  'bottom-panel': { min: 142, target: 156, max: 171 },
  'bottom-dock': { min: 16, target: 18, max: 20 },
  'floor-peek': { min: 0, target: 0, max: 0 },
};

/** Écarts entre bandes majeures (grille 2px). */
export const LAYOUT_BAND_GAP_PX = 2;

/** Ratio largeur interne hub (si colonnes) — chart reste dominant. */
export const HUB_MARKET_COLUMNS = {
  exchange: 7,
  chart: 13,
} as const;
