import { R4V3_GROUND_FIELD } from './map-configuration';

/** Quadrillage diagonal : 1 jeton visible sur 2 (damier). */
export function isOnDiagonalCheckerboard(gx: number, gz: number): boolean {
  return ((gx + gz) & 1) === 0;
}

/** Vérifie le damier sur la grille de rendu 1,25 m à partir d'une position monde. */
export function isWorldPositionOnCheckerboard(x: number, z: number): boolean {
  const size = R4V3_GROUND_FIELD.cellSize;
  const gx = Math.floor(x / size);
  const gz = Math.floor(z / size);
  return isOnDiagonalCheckerboard(gx, gz);
}

export function parseClusterGrid(clusterId: string): { gx: number; gz: number } | null {
  const parts = clusterId.split(':');
  if (parts.length < 3 || parts[0] !== 'm4t3r-cluster') return null;
  const gx = Number(parts[1]);
  const gz = Number(parts[2]);
  if (!Number.isFinite(gx) || !Number.isFinite(gz)) return null;
  return { gx, gz };
}
