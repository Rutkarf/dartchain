import { isInsideMirrorSpawnSafeZone, R4V3_GROUND_FIELD } from './map-configuration';

/**
 * Période du damier diagonal (puissance de 2).
 * 2 = 1 jeton visible sur 2 (diagonales existantes + diagonales intercalées).
 */
export const M4T3R_CHECKERBOARD_PERIOD = 2;

/**
 * Densité spawn SAFE = 10× l’extérieur.
 * Extérieur : ½ cellule / (1.25²) → spawn plein sur cellule 1.25/√5.
 */
export const M4T3R_SPAWN_DENSE_CELL_SIZE =
  R4V3_GROUND_FIELD.cellSize / Math.sqrt(5);

/** Quadrillage diagonal : 1 jeton visible sur 2. */
export function isOnDiagonalCheckerboard(gx: number, gz: number): boolean {
  return ((gx + gz) & (M4T3R_CHECKERBOARD_PERIOD - 1)) === 0;
}

/** Vérifie le damier sur la grille de rendu 1,25 m à partir d'une position monde. */
export function isWorldPositionOnCheckerboard(x: number, z: number): boolean {
  const size = R4V3_GROUND_FIELD.cellSize;
  const gx = Math.floor(x / size);
  const gz = Math.floor(z / size);
  return isOnDiagonalCheckerboard(gx, gz);
}

/**
 * Collecte / présence M4T3R : damier dehors, plein densifié dans le cercle SPAWN.
 */
export function isM4t3rGroundPositionActive(x: number, z: number): boolean {
  if (isInsideMirrorSpawnSafeZone(x, z)) return true;
  return isWorldPositionOnCheckerboard(x, z);
}

export function parseClusterGrid(clusterId: string): { gx: number; gz: number } | null {
  const parts = clusterId.split(':');
  if (parts.length < 3 || parts[0] !== 'm4t3r-cluster') return null;
  const gx = Number(parts[1]);
  const gz = Number(parts[2]);
  if (!Number.isFinite(gx) || !Number.isFinite(gz)) return null;
  return { gx, gz };
}
