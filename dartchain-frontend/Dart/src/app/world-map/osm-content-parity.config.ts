import type { MapQuality } from './map-configuration';

/**
 * Phase 23 — parité contenu : même catalogue OSM que `high` sur tous les tiers.
 * Le coût perf se scale via paquets idle / LOD / batch — pas via caps de contenu.
 */
export const OSM_CONTENT_PARITY = {
  buildingCap: 2800,
  streetCap: 600,
  /** Priorité 0 — spawn + Ombrière. */
  spawnPriorityRadiusM: 120,
  /** Priorité 1 — demi-largeur corridor Canebière (m le long de l’axe). */
  canebiereHalfWidthM: 190,
  /** Priorité 2 — cœur Vieux-Port. */
  vieuxPortCoreRadiusM: 420,
} as const;

export function osmContentBuildingCap(_quality?: MapQuality): number {
  return OSM_CONTENT_PARITY.buildingCap;
}

export function osmContentStreetCap(_quality?: MapQuality): number {
  return OSM_CONTENT_PARITY.streetCap;
}
