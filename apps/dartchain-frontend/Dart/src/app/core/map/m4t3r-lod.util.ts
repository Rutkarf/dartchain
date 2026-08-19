import { M4T3R_LOD_CONFIG, M4T3R_RENDER_CONFIG } from './map-configuration';

export type M4T3RLodBand = 'near' | 'mid' | 'far';

/** Distance monde joueur → cellule (plan XZ, mètres). */
export function lodDistanceFromPlayer(
  playerX: number,
  playerZ: number,
  cellX: number,
  cellZ: number
): number {
  return Math.hypot(cellX - playerX, cellZ - playerZ);
}

export function getLodBand(distanceMeters: number): M4T3RLodBand {
  if (distanceMeters <= M4T3R_LOD_CONFIG.nearMaxDistance) return 'near';
  if (distanceMeters <= M4T3R_LOD_CONFIG.midMaxDistance) return 'mid';
  return 'far';
}

/**
 * Sous-échantillonnage ancré grille monde (gx/gz = indices cellSize 1.25 m).
 * Plus loin → stride plus grand → densité visuelle réduite.
 */
export function shouldRenderCellAtLod(gx: number, gz: number, band: M4T3RLodBand): boolean {
  if (band === 'near') return true;
  const stride = band === 'mid' ? M4T3R_LOD_CONFIG.midGridStride : M4T3R_LOD_CONFIG.farGridStride;
  return gx % stride === 0 && gz % stride === 0;
}

export function shouldAnimateLodBand(band: M4T3RLodBand): boolean {
  return band !== 'far';
}

export function lodBobAmplitude(band: M4T3RLodBand): number {
  if (band === 'near') return M4T3R_RENDER_CONFIG.bobAmplitude;
  if (band === 'mid') return M4T3R_RENDER_CONFIG.bobAmplitude * M4T3R_LOD_CONFIG.midBobScale;
  return 0;
}

export function lodRotationSpeed(baseSpeed: number, band: M4T3RLodBand): number {
  if (band === 'far') return 0;
  if (band === 'mid') return baseSpeed * M4T3R_LOD_CONFIG.midRotationScale;
  return baseSpeed;
}
