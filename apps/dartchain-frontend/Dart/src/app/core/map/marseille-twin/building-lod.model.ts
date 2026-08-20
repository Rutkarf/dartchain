/**
 * LOD bâtiments (massing) — distinct du LOD M4T3R existant.
 * Distances en mètres monde (1 unit = 1 m).
 */
export type BuildingLodLevel = 'full' | 'massing' | 'impostor' | 'culled';

export const BUILDING_LOD_POLICY = {
  fullMaxMeters: 64,
  massingMaxMeters: 180,
  impostorMaxMeters: 420,
} as const;

export function buildingLodAtDistance(distanceMeters: number): BuildingLodLevel {
  if (distanceMeters <= BUILDING_LOD_POLICY.fullMaxMeters) return 'full';
  if (distanceMeters <= BUILDING_LOD_POLICY.massingMaxMeters) return 'massing';
  if (distanceMeters <= BUILDING_LOD_POLICY.impostorMaxMeters) return 'impostor';
  return 'culled';
}
