/**
 * Budgets spatiaux MVP — viewport exclusif 250 × 500.
 * Shell scrollable si la somme des zones dépliées dépasse 500.
 * Ordre de priorité visuelle (hauteur relative, état déplié) :
 *   chart ≈ dock > activity > swap > navbar > gaps
 */

export const TARGET_VIEWPORT = {
  width: 250,
  height: 500,
  minWidth: 250,
  maxWidth: 250,
  minHeight: 500,
  maxHeight: 500,
} as const;

export const READING_ORDER = [
  'navbar',
  'exchange',
  'chart',
  'showcase-header',
  'showcase-panel',
  'bottom-panel',
  'bottom-dock',
  'floor-peek',
] as const;

export type LayoutZoneId = (typeof READING_ORDER)[number];

/**
 * Budgets dépliés @ 250 largeur.
 * Graph 196 (+espace axes heures) · Dock 176 · activity 128 · swap strip 28.
 * La somme dépliée peut dépasser 500 — le shell scrolle verticalement.
 */
export const LAYOUT_ZONE_BUDGET_PX: Record<LayoutZoneId, { min: number; target: number; max: number }> = {
  navbar: { min: 32, target: 36, max: 40 },
  exchange: { min: 26, target: 28, max: 34 },
  chart: { min: 180, target: 196, max: 212 },
  'showcase-header': { min: 18, target: 20, max: 22 },
  'showcase-panel': { min: 100, target: 128, max: 140 },
  'bottom-panel': { min: 160, target: 176, max: 192 },
  'bottom-dock': { min: 18, target: 20, max: 22 },
  'floor-peek': { min: 0, target: 0, max: 0 },
};

/** Écarts entre bandes majeures (grille 4px). */
export const LAYOUT_BAND_GAP_PX = 4;

/** Ratio largeur interne hub (si colonnes) — chart reste dominant. */
export const HUB_MARKET_COLUMNS = {
  exchange: 7,
  chart: 13,
} as const;
