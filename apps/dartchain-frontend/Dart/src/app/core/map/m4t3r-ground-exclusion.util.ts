import { isHarborWaterAt, distanceToHarborWaterEdge } from './vieux-port-layout.util';
import { MARSEILLE_GROUND_EXCLUSION_ZONES, MARSEILLE_HARBOR_WATER, type GroundExclusionZone } from './map-configuration';
import type { M4T3RLodBand } from './m4t3r-lod.util';
import { shouldRenderCellAtLod } from './m4t3r-lod.util';
import { isOnDiagonalCheckerboard } from './m4t3r-grid.util';

/** Facteur 0 = exclusion totale, 1 = pleine densité, ]0,1[ = transition douce. */
export function groundExclusionFactorAt(
  x: number,
  z: number,
  zones: readonly GroundExclusionZone[] = MARSEILLE_GROUND_EXCLUSION_ZONES
): number {
  if (isHarborWaterAt(x, z)) return 0;

  const harborEdge = distanceToHarborWaterEdge(x, z);
  const soft = MARSEILLE_HARBOR_WATER.softEdgeMeters;
  let factor = 1;
  if (harborEdge < soft) {
    factor = Math.min(factor, harborEdge / soft);
  }

  for (const zone of zones) {
    if (isPointInPolygon(x, z, zone.polygon)) return 0;
    const edgeDist = distanceToPolygonEdge(x, z, zone.polygon);
    if (edgeDist < zone.softEdgeMeters) {
      factor = Math.min(factor, edgeDist / zone.softEdgeMeters);
    }
  }
  return factor;
}

export function isGroundCellExcluded(
  x: number,
  z: number,
  zones: readonly GroundExclusionZone[] = MARSEILLE_GROUND_EXCLUSION_ZONES
): boolean {
  return groundExclusionFactorAt(x, z, zones) <= 0;
}

/**
 * Densité LOD + exclusion sol : sous-échantillonnage déterministe dans la bande soft.
 */
export function shouldRenderGroundCell(
  gx: number,
  gz: number,
  x: number,
  z: number,
  band: M4T3RLodBand,
  zones: readonly GroundExclusionZone[] = MARSEILLE_GROUND_EXCLUSION_ZONES
): boolean {
  const exclusionFactor = groundExclusionFactorAt(x, z, zones);
  if (exclusionFactor <= 0) return false;
  if (!isOnDiagonalCheckerboard(gx, gz)) return false;
  if (!shouldRenderCellAtLod(gx, gz, band)) return false;
  if (exclusionFactor >= 0.999) return true;
  const hash = ((gx * 73856093) ^ (gz * 19349663)) >>> 0;
  return (hash % 1000) / 1000 < exclusionFactor;
}

function isPointInPolygon(
  x: number,
  z: number,
  polygon: ReadonlyArray<{ x: number; z: number }>
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const zi = polygon[i].z;
    const xj = polygon[j].x;
    const zj = polygon[j].z;
    const intersect =
      zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distanceToPolygonEdge(
  x: number,
  z: number,
  polygon: ReadonlyArray<{ x: number; z: number }>
): number {
  let minDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    minDist = Math.min(minDist, distancePointToSegment(x, z, a.x, a.z, b.x, b.z));
  }
  return minDist;
}

function distancePointToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-12) return Math.hypot(px - ax, pz - az);
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
