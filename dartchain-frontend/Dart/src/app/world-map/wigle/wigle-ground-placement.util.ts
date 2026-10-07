import { isHarborWaterAt } from '../vieux-port-layout.util';
import { WIGLE_GEO_CONFIG } from './wigle-visual.config';
import type { WigleGeoPoint } from './wigle-point.types';

export type WigleGroundHeightResolver = (worldX: number, worldZ: number) => number;

/** Pose Y exacte au sol marchable ; exclut l'eau. */
export function applyWigleGroundPlacement(
  points: WigleGeoPoint[],
  resolveGroundY: WigleGroundHeightResolver | null | undefined
): WigleGeoPoint[] {
  const placed: WigleGeoPoint[] = [];
  for (const point of points) {
    if (isHarborWaterAt(point.worldX, point.worldZ)) continue;

    let groundY = WIGLE_GEO_CONFIG.groundOffsetY;
    if (resolveGroundY) {
      const surface = resolveGroundY(point.worldX, point.worldZ);
      if (Number.isFinite(surface)) {
        groundY = surface + WIGLE_GEO_CONFIG.groundOffsetY;
      }
    }

    placed.push({ ...point, worldY: groundY });
  }
  return placed;
}
