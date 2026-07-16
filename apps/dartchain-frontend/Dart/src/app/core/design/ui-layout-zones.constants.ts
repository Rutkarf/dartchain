/**
 * Phase 1 — Zones de layout et ordre de lecture (refonte visuelle).
 * Viewport cible : 300 × 500 px (mobile compact).
 * Aucune zone fonctionnelle supprimée — hiérarchie visuelle uniquement.
 */

export const TARGET_VIEWPORT = {
  width: 300,
  height: 500,
  minWidth: 251,
  maxWidth: 349,
  maxHeight: 520,
} as const;

/** Ordre de lecture imposé (Z-index visuel, haut → bas). */
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

/** Budget vertical indicatif @ 300×500 (px) — guide Phase 17+, non bloquant. */
export const LAYOUT_ZONE_BUDGET_PX: Record<LayoutZoneId, { min: number; target: number; max: number }> = {
  navbar: { min: 48, target: 56, max: 64 },
  exchange: { min: 100, target: 118, max: 130 },
  chart: { min: 100, target: 118, max: 130 },
  'showcase-header': { min: 24, target: 28, max: 32 },
  'showcase-panel': { min: 72, target: 90, max: 110 },
  'bottom-panel': { min: 110, target: 130, max: 160 },
  'bottom-dock': { min: 44, target: 48, max: 52 },
  'floor-peek': { min: 8, target: 12, max: 16 },
};

/** Ratio hub marché : exchange | graphique (conservé depuis app.css). */
export const HUB_MARKET_COLUMNS = {
  exchange: 7,
  chart: 13,
} as const;
