/**
 * LOD bâtiments (massing) — distinct du LOD M4T3R existant.
 * Distances en mètres monde (1 unit = 1 m).
 */
export type BuildingLodLevel = 'full' | 'massing' | 'impostor' | 'culled';

export interface BuildingLodPolicy {
  fullMaxMeters: number;
  massingMaxMeters: number;
  impostorMaxMeters: number;
}

export const BUILDING_LOD_POLICY = {
  fullMaxMeters: 64,
  massingMaxMeters: 180,
  impostorMaxMeters: 420,
} as const;

/** Phase 10 — héros OSM : détail complet jusqu'à 80 m. */
export const HERO_BUILDING_LOD_POLICY = {
  fullMaxMeters: 80,
  massingMaxMeters: 220,
  impostorMaxMeters: 480,
} as const;

/** Silhouettes skyline — visibles depuis tout le Vieux-Port. */
export const SKYLINE_LANDMARK_LOD_POLICY = {
  fullMaxMeters: 520,
  massingMaxMeters: 1400,
  impostorMaxMeters: 2800,
} as const;

function lodFromPolicy(distanceMeters: number, policy: BuildingLodPolicy): BuildingLodLevel {
  if (distanceMeters <= policy.fullMaxMeters) return 'full';
  if (distanceMeters <= policy.massingMaxMeters) return 'massing';
  if (distanceMeters <= policy.impostorMaxMeters) return 'impostor';
  return 'culled';
}

export function buildingLodAtDistance(
  distanceMeters: number,
  options?: { hero?: boolean; policy?: BuildingLodPolicy }
): BuildingLodLevel {
  const policy = options?.policy
    ?? (options?.hero ? HERO_BUILDING_LOD_POLICY : BUILDING_LOD_POLICY);
  return lodFromPolicy(distanceMeters, policy);
}

export function buildingLodAtDistanceForSkyline(distanceMeters: number): BuildingLodLevel {
  return lodFromPolicy(distanceMeters, SKYLINE_LANDMARK_LOD_POLICY);
}
