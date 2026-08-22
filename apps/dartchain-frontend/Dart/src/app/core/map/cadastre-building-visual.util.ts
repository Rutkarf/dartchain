import type { GeoBuilding } from './geo-reference.config';
import type { BuildingVisualTier } from './geo-building.util';

/** Rayon spawn — parcelles cadastre avec rendu enrichi. */
export const CADASTRAL_SPAWN_VISUAL_RADIUS_M = 98;

export function resolveCadastreVisualTier(
  centerX: number,
  centerZ: number,
  confidence: GeoBuilding['confidence'],
  isLandmark: boolean
): BuildingVisualTier {
  if (isLandmark) return 'hero';
  const dist = Math.hypot(centerX, centerZ);
  if (dist <= CADASTRAL_SPAWN_VISUAL_RADIUS_M && confidence !== 'low') {
    return 'cadastre';
  }
  return 'standard';
}

export function cadastreMaterialSeed(buildingId: string): number {
  let hash = 0;
  for (let i = 0; i < buildingId.length; i++) {
    hash = (hash * 31 + buildingId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % 997) + 3;
}
